import { env } from "@/config/env";

const DEFAULT_TIMEOUT_MS = 60_000;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(path: `/${string}`, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${env.apiUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers
      },
      signal: init.signal ?? controller.signal
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null) as { error?: { code?: string; message?: string }; message?: string } | null;
      throw new ApiError(
        errorBody?.error?.message ?? errorBody?.message ?? `API request failed with status ${response.status}`,
        response.status,
        errorBody?.error?.code
      );
    }

    return response.status === 204 ? undefined as T : await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

export type ApiReadiness = { status: "ready" | "not_ready" };

export function getApiReadiness(): Promise<ApiReadiness> {
  return apiRequest<ApiReadiness>("/health/ready");
}
