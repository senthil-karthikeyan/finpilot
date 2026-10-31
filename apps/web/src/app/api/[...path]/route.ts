import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@finpilot/shared';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

// Hop-by-hop headers that apply to a single transport connection
// and must NOT be forwarded between client <-> proxy or proxy <-> upstream.
const HOP_BY_HOP_REQUEST_HEADERS = new Set([
  'host',
  'cookie',
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  // Do not forward browser's Accept-Encoding to upstream fetch.
  // Server-side Node fetch() manages its own supported encodings (gzip, deflate)
  // and transparently decompresses upstream responses. Forwarding browser encodings
  // like zstd can cause compression mismatches if upstream uses an encoding Node cannot decompress.
  'accept-encoding',
]);

const HOP_BY_HOP_RESPONSE_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'set-cookie',
]);

/**
 * Clean and forward upstream headers safely to the downstream client.
 *
 * In Node.js / undici fetch(), when the upstream response is compressed (e.g. gzip, deflate, br),
 * fetch() transparently decompresses the payload stream (backendRes.body).
 * However, backendRes.headers retains the raw upstream 'content-encoding' and 'content-length'.
 *
 * If the proxy forwards 'content-encoding: br' or 'content-encoding: gzip' when the forwarded body
 * is ALREADY uncompressed, the browser attempts to decompress plaintext bytes, triggering:
 *   net::ERR_CONTENT_DECODING_FAILED
 *
 * Similarly, the upstream 'content-length' reflects the compressed byte size rather than the
 * decompressed body size. Forwarding a stale content-length results in truncation or decoding mismatch.
 */
export function buildForwardResponseHeaders(backendHeaders: Headers): Headers {
  const responseHeaders = new Headers();
  const wasCompressed = backendHeaders.has('content-encoding');

  backendHeaders.forEach((val, key) => {
    const lowerKey = key.toLowerCase();

    // 1. Skip hop-by-hop headers and internal set-cookie
    if (HOP_BY_HOP_RESPONSE_HEADERS.has(lowerKey)) {
      return;
    }

    // 2. Never forward content-encoding: fetch() transparently decodes the response body.
    // The downstream server (Netlify/Next.js) will apply its own transport compression if negotiated with the client.
    if (lowerKey === 'content-encoding') {
      return;
    }

    // 3. If upstream was compressed, discard stale content-length (which reflected compressed size).
    // Also, when streaming response bodies in Next.js, downstream will frame using chunked transfer.
    if (lowerKey === 'content-length' && wasCompressed) {
      return;
    }

    // 4. Handle ETag (RFC 7232 Section 2.3):
    // If upstream was compressed and decompressed by fetch(), a strong ETag applies only to the exact
    // compressed byte sequence. Convert strong ETags to weak ETags (W/...) to represent semantic equivalence.
    if (lowerKey === 'etag') {
      if (wasCompressed && !val.startsWith('W/')) {
        responseHeaders.set('etag', `W/${val}`);
      } else {
        responseHeaders.set('etag', val);
      }
      return;
    }

    // 5. Preserve content-type, content-disposition, cache-control, correlation IDs, etc.
    responseHeaders.set(key, val);
  });

  return responseHeaders;
}

async function handleProxy(request: NextRequest, pathSegments: string[]): Promise<NextResponse> {
  const path = pathSegments.join('/');

  // ── 1. Intercept Login: Next.js owns the session ───────────────────────────
  if (request.method === 'POST' && (path === 'v1/auth/login' || path === 'auth/login')) {
    try {
      const body = await request.json();
      const backendRes = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const resData = await backendRes.json();

      if (!backendRes.ok) {
        return NextResponse.json(resData, { status: backendRes.status });
      }

      // Store JWT token in secure httpOnly cookie on frontend origin
      // Return accessToken, token, and user for API contract compatibility
      const response = NextResponse.json(
        {
          accessToken: resData.accessToken || resData.token,
          token: resData.token || resData.accessToken,
          user: resData.user,
        },
        { status: backendRes.status },
      );

      const maxAgeSeconds = parseInt(process.env.JWT_COOKIE_MAX_AGE_SECONDS || '28800', 10);

      response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: resData.accessToken || resData.token,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: maxAgeSeconds,
      });

      return response;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login proxy error';
      console.log(err);
      return NextResponse.json({ message: msg }, { status: 500 });
    }
  }

  // ── 2. Intercept Logout: Clear session cookie ──────────────────────────────
  if (
    request.method === 'POST' &&
    (path === 'v1/auth/logout' || path === 'auth/logout' || path === 'logout')
  ) {
    const response = NextResponse.json({ message: 'Logged out successfully.' }, { status: 200 });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: '',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  }

  // ── 3. Proxy all other API requests: Add Bearer header from cookie ─────────
  const targetUrl = `${API_URL}/api/${path}${request.nextUrl.search}`;

  const forwardHeaders = new Headers();
  request.headers.forEach((val, key) => {
    if (!HOP_BY_HOP_REQUEST_HEADERS.has(key.toLowerCase())) {
      forwardHeaders.set(key, val);
    }
  });

  // Extract session token from httpOnly cookie and inject Bearer header
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (token) {
    forwardHeaders.set('Authorization', `Bearer ${token}`);
  }

  let requestBody: ArrayBuffer | undefined = undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    requestBody = await request.arrayBuffer();
  }

  try {
    const backendRes = await fetch(targetUrl, {
      method: request.method,
      headers: forwardHeaders,
      body: requestBody && requestBody.byteLength > 0 ? requestBody : undefined,
    });

    const responseHeaders = buildForwardResponseHeaders(backendRes.headers);

    // Pass backend status (e.g. 401, 403, 404, 500) through unchanged.
    // RFC 9110: Null-body status codes (101, 204, 205, 304) must not carry a body.
    const isNullBodyStatus = [101, 204, 205, 304].includes(backendRes.status);
    return new NextResponse(isNullBodyStatus ? null : backendRes.body, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'API Gateway error';
    console.log(err);
    return NextResponse.json({ message: 'test' }, { status: 502 });
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return handleProxy(request, path);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return handleProxy(request, path);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return handleProxy(request, path);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return handleProxy(request, path);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return handleProxy(request, path);
}

export async function HEAD(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return handleProxy(request, path);
}
