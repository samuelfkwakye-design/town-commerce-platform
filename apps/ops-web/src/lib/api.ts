type ApiFetchInit = Omit<RequestInit, "body" | "headers"> & {
  body?: unknown;
  headers?: HeadersInit;
};

export async function apiFetch<T>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE ||
    "http://localhost:3000/api/v1";

  const adminKey =
    typeof window !== "undefined"
      ? localStorage.getItem("ops_admin_key") || process.env.NEXT_PUBLIC_ADMIN_KEY
      : process.env.NEXT_PUBLIC_ADMIN_KEY;

  const headers = new Headers(init.headers);

  if (adminKey) headers.set("x-admin-key", adminKey);

  // Body handling: object => JSON, string => pass, FormData => pass
  let body: BodyInit | null | undefined = init.body as any;

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const isBodyObject =
    body !== null &&
    body !== undefined &&
    typeof body === "object" &&
    !isFormData &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer);

  if (isBodyObject) {
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    body = JSON.stringify(body);
  } else if (typeof body === "string") {
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${base}${path}`, {
    ...init,
    body,
    cache: typeof window === "undefined" ? "no-store" : init.cache,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed (${res.status})`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return (await res.text()) as unknown as T;
  }

  return (await res.json()) as T;
}