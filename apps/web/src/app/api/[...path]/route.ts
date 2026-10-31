import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@finpilot/shared';

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

async function handleProxy(
  request: NextRequest,
  pathSegments: string[],
): Promise<NextResponse> {
  const path = pathSegments.join('/');

  // ── 1. Intercept Login: Next.js owns the session ───────────────────────────
  if (
    request.method === 'POST' &&
    (path === 'v1/auth/login' || path === 'auth/login')
  ) {
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
      const response = NextResponse.json(
        { user: resData.user },
        { status: backendRes.status },
      );

      const maxAgeSeconds = parseInt(
        process.env.JWT_COOKIE_MAX_AGE_SECONDS || '28800',
        10,
      );

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
      return NextResponse.json({ message: msg }, { status: 500 });
    }
  }

  // ── 2. Intercept Logout: Clear session cookie ──────────────────────────────
  if (
    request.method === 'POST' &&
    (path === 'v1/auth/logout' || path === 'auth/logout' || path === 'logout')
  ) {
    const response = NextResponse.json(
      { message: 'Logged out successfully.' },
      { status: 200 },
    );

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
    // Avoid forwarding host or cookie headers directly to backend
    if (key !== 'host' && key !== 'cookie') {
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
      body: requestBody,
    });

    const responseHeaders = new Headers();
    backendRes.headers.forEach((val, key) => {
      // Pass correlation ID, content-type, content-disposition, etc.
      if (key !== 'set-cookie') {
        responseHeaders.set(key, val);
      }
    });

    // Pass backend status (e.g. 401, 403, 404, 500) through unchanged
    return new NextResponse(backendRes.body, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'API Gateway error';
    return NextResponse.json({ message: msg }, { status: 502 });
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return handleProxy(request, path);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
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

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
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

