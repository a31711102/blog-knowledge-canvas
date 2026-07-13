import { CONFIG } from "../config";
import type { Category, RawPost } from "../types";

// 入力（サイトマップURL / ブログURL / 任意ページURL）から wp-json のオリジンを抽出
export function toHost(input: string): string {
  const url = new URL(input.trim().startsWith("http") ? input.trim() : `https://${input.trim()}`);
  return url.origin;
}

async function fetchJson<T>(url: string): Promise<{ data: T; headers: Headers }> {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`取得失敗 ${res.status}: ${url}`);
  return { data: (await res.json()) as T, headers: res.headers };
}

// 全記事取得（X-WP-TotalPages を見てページング）。CORSは実測OK（プロキシ不要）。
export async function fetchAllPosts(
  host: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<RawPost[]> {
  const base = `${host}/wp-json/wp/v2/posts?per_page=${CONFIG.restPerPage}&_fields=${encodeURIComponent(
    CONFIG.fields
  )}`;
  const first = await fetchJson<RawPost[]>(`${base}&page=1`);
  const totalPages = Number(first.headers.get("X-WP-TotalPages") ?? "1");
  const all: RawPost[] = [...first.data];
  onProgress?.(all.length, Number(first.headers.get("X-WP-Total") ?? all.length));

  for (let page = 2; page <= totalPages; page++) {
    const { data } = await fetchJson<RawPost[]>(`${base}&page=${page}`);
    all.push(...data);
    onProgress?.(all.length, all.length);
  }
  return all;
}

export async function fetchCategories(host: string): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  try {
    const { data } = await fetchJson<Category[]>(
      `${host}/wp-json/wp/v2/categories?per_page=100&_fields=id,name`
    );
    for (const c of data) map.set(c.id, c.name);
  } catch {
    /* カテゴリ取得失敗は致命的でない（色分けが未分類になるだけ） */
  }
  return map;
}
