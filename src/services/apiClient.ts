import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient";

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");

  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabaseClient().auth.getSession();
    if (error) throw new Error(error.message);
    const token = data.session?.access_token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`/api/${path.replace(/^\/+/, "")}`, {
    ...options,
    headers,
  });
  const result = (await response.json().catch(() => null)) as
    | { error?: string }
    | T
    | null;
  if (!response.ok) {
    const message =
      result && typeof result === "object" && "error" in result
        ? result.error
        : undefined;
    throw new Error(message || `Request failed (${response.status}).`);
  }
  return result as T;
}