import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useAuth } from "@/auth/auth-context";
import { ApiError } from "@/lib/api-client";

export function useApiResource<T>(path: `/${string}` | null) {
  const { request } = useAuth();
  const [data, setData] = useState<T | null>(null); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { if (!path) { setLoading(false); return; } setLoading(true); setError(null); try { setData(await request<T>(path)); } catch (reason) { setError(reason instanceof ApiError ? reason.message : "Could not load live data."); } finally { setLoading(false); } }, [path, request]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  return { data, error, loading, reload: load };
}
