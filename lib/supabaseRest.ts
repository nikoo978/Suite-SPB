export type SupabaseConfig = {
  url: string;
  serviceRoleKey: string;
};

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) return null;
  return { url, serviceRoleKey };
}

type SupabaseFetchOptions = RequestInit & {
  prefer?: string;
};

export async function supabaseRest<T>(path: string, options: SupabaseFetchOptions = {}): Promise<T> {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase no está configurado. Faltan variables de entorno.");

  const headers = new Headers(options.headers);
  headers.set("apikey", config.serviceRoleKey);
  headers.set("Authorization", `Bearer ${config.serviceRoleKey}`);
  headers.set("Content-Type", "application/json");
  if (options.prefer) headers.set("Prefer", options.prefer);

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Error Supabase ${response.status}: ${detail || response.statusText}`);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}
