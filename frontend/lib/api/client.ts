// Typed client for the MindBridge API. Every request goes to the same origin (/api/v1/...), and Next.js
// forwards it to the backend (see next.config.ts). The session lives in an HTTP-only cookie that JavaScript
// cannot read. The CSRF token is kept in memory only, never in localStorage.

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let csrfToken: string | null = null;

export function setCsrfToken(token: string | null): void {
  csrfToken = token;
}

const GENERIC_ERROR = "Something went wrong. Please try again.";

// FastAPI reports validation failures as { detail: [{ msg, ... }] }. Show the first message in plain words.
function messageFrom(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const error = (data as { error?: { message?: unknown } }).error;
    if (error && typeof error.message === "string") return error.message;
    const detail = (data as { detail?: unknown }).detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0] as { msg?: unknown };
      if (typeof first.msg === "string")
        return first.msg.replace(/^Value error, /, "");
    }
  }
  return status === 429
    ? "Too many attempts. Please wait a minute and try again."
    : GENERIC_ERROR;
}

export async function api<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET" && csrfToken) headers["X-CSRF-Token"] = csrfToken;

  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      0,
      "network",
      "The server could not be reached. Check that the backend is running.",
    );
  }

  if (response.status === 204) return undefined as T;
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const code =
      (data as { error?: { code?: string } } | null)?.error?.code ?? "error";
    throw new ApiError(
      response.status,
      code,
      messageFrom(data, response.status),
    );
  }
  return data as T;
}
