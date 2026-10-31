export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: { field: string; message: string }[],
    public readonly correlationId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  // Ensure leading slash
  const url = endpoint.startsWith('http')
    ? endpoint
    : endpoint.startsWith('/')
      ? endpoint
      : `/${endpoint}`;

  const headers = new Headers(options.headers);

  // If body is not FormData, default to application/json
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Send and receive httpOnly cookie sessions
  });

  if (!response.ok) {
    let errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
    let details: { field: string; message: string }[] | undefined;
    let correlationId: string | undefined = response.headers.get('x-correlation-id') ?? undefined;

    try {
      const errorData = await response.json();
      if (errorData.message) {
        if (Array.isArray(errorData.message)) {
          errorMessage = errorData.message.join(', ');
          details = errorData.message.map((msg: string) => ({
            field: msg.split(' ')[0] || 'general',
            message: msg,
          }));
        } else {
          errorMessage = errorData.message;
        }
      }
      if (errorData.correlationId) {
        correlationId = errorData.correlationId;
      }
    } catch {
      // response wasn't JSON
    }

    throw new ApiError(response.status, errorMessage, details, correlationId);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  get: <T>(url: string, options?: RequestInit) =>
    request<T>(url, { ...options, method: 'GET' }),

  post: <T>(url: string, body?: any, options?: RequestInit) =>
    request<T>(url, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(url: string, body?: any, options?: RequestInit) =>
    request<T>(url, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(url: string, options?: RequestInit) =>
    request<T>(url, { ...options, method: 'DELETE' }),
};

