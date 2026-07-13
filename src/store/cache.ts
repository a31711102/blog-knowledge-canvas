import { openDB, type DBSchema } from "idb";
import type { AnalyzedPost } from "../types";

interface BKCSchema extends DBSchema {
  corpora: {
    key: string; // host
    value: { host: string; fetchedAt: number; tv: string; posts: AnalyzedPost[] };
  };
}

const dbPromise = openDB<BKCSchema>("blog-knowledge-canvas", 1, {
  upgrade(db) {
    db.createObjectStore("corpora", { keyPath: "host" });
  },
});

// 差分更新の土台: ホスト単位で解析済み記事（tokens込み）を保存/復元。
// tv(トークナイザ版数)が変わっているキャッシュは無効化する（辞書変更を確実に反映）。
export async function loadCached(host: string, tv: string): Promise<AnalyzedPost[] | null> {
  const rec = await (await dbPromise).get("corpora", host);
  if (!rec || rec.tv !== tv) return null;
  return rec.posts;
}

export async function saveCached(host: string, posts: AnalyzedPost[], tv: string): Promise<void> {
  await (await dbPromise).put("corpora", { host, fetchedAt: Date.now(), tv, posts });
}

// JSON入出力（端末間の手動移送用）
export function exportJson(host: string, posts: AnalyzedPost[]): string {
  return JSON.stringify({ host, fetchedAt: Date.now(), posts }, null, 2);
}
export function importJson(text: string): { host: string; posts: AnalyzedPost[] } {
  const o = JSON.parse(text);
  if (!Array.isArray(o.posts)) throw new Error("不正なJSON: posts 配列がありません");
  return { host: o.host ?? "", posts: o.posts };
}
