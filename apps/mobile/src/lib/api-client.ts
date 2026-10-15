import { env } from "@/config/env";

const DEFAULT_TIMEOUT_MS = 60_000;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number
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
        ...init.headers
      },
      signal: init.signal ?? controller.signal
    });

    if (!response.ok) {
      throw new ApiError(`API request failed with status ${response.status}`, response.status);
    }

    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

export type ApiReadiness = { status: "ready" | "not_ready" };

export function getApiReadiness(): Promise<ApiReadiness> {
  return apiRequest<ApiReadiness>("/health/ready");
}
