import { cleanContent, stripTitle } from "./nlp/clean";
import { extractNouns, type KuromojiTokenizer } from "./nlp/tokenize";
import { buildDfIdf, termFrequency, tfidfVector, topKeywords, vectorNorm } from "./nlp/tfidf";
import { CONFIG } from "./config";
import type { AnalyzedPost, Corpus, PostVector, RawPost } from "./types";

// 生記事 → 解析済み記事。キャッシュがあれば modified が同じ記事のトークンを再利用（差分更新）。
export function analyzePosts(
  raw: RawPost[],
  catMap: Map<number, string>,
  tokenizer: KuromojiTokenizer,
  cached?: AnalyzedPost[] | null
): { posts: AnalyzedPost[]; reused: number } {
  const cache = new Map<number, AnalyzedPost>();
  for (const p of cached ?? []) cache.set(p.id, p);

  let reused = 0;
  const posts = raw.map((p) => {
    const title = stripTitle(p.title.rendered);
    const prev = cache.get(p.id);
    if (prev && prev.modified === (p.modified ?? "")) {
      reused++;
      return prev; // 変更なし → 再トークン化しない
    }
    const text = `${title} ${cleanContent(p.content.rendered)}`;
    return {
      id: p.id,
      title,
      link: p.link,
      categories: p.categories.map((c) => catMap.get(c) ?? "未分類"),
      modified: p.modified ?? "",
      tokens: extractNouns(tokenizer, text),
    };
  });
  return { posts, reused };
}

// 解析済み記事 → コーパス（df/idf/TF-IDFベクトルまで確定）
export function buildCorpus(host: string, posts: AnalyzedPost[]): Corpus {
  const { df, idf } = buildDfIdf(posts.map((p) => p.tokens));
  const vectors: PostVector[] = posts.map((post) => {
    const tf = termFrequency(post.tokens);
    const vector = tfidfVector(tf, post.tokens.length, idf);
    return {
      post,
      tf,
      vector,
      norm: vectorNorm(vector),
      topKeywords: topKeywords(vector, CONFIG.topKeywordsPerPost),
    };
  });
  return { host, fetchedAt: Date.now(), df, idf, vectors };
}
