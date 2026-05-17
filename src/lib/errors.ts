export interface StandardResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export function apiSuccess<T = any>(data: T, status = 200, headers = {}): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    },
  );
}

export function apiError(message: string, status = 400, headers = {}): Response {
  return new Response(
    JSON.stringify({
      success: false,
      message,
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    },
  );
}
