import { storage } from "@/src/utils/storage";

const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;
export const TOKEN_KEY = "bsi_token";

export function fileUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http")) return path;
  return `${process.env.EXPO_PUBLIC_BACKEND_URL}${path}`;
}

async function authHeader() {
  const token = await storage.secureGet(TOKEN_KEY, "");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet(path: string) {
  const r = await fetch(`${BASE}${path}`, { headers: { ...(await authHeader()) } });
  return handle(r);
}

export async function apiPost(path: string, body?: any) {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handle(r);
}

export async function apiPut(path: string, body?: any) {
  const r = await fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handle(r);
}

export async function apiForm(path: string, form: FormData) {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { ...(await authHeader()) },
    body: form,
  });
  return handle(r);
}

export async function apiDelete(path: string, body?: any) {
  const r = await fetch(`${BASE}${path}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handle(r);
}

/** Public web link to an asset detail page (used for sharing). */
export function publicAssetLink(id: string): string {
  return `${process.env.EXPO_PUBLIC_BACKEND_URL}/asset/${id}`;
}

async function handle(r: Response) {
  let data: any = null;
  const text = await r.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!r.ok) {
    const msg = (data && (data.detail || data.message)) || "Terjadi kesalahan. Coba lagi.";
    throw new Error(typeof msg === "string" ? msg : "Terjadi kesalahan.");
  }
  return data;
}
