// TF-IDF とコサイン類似度。31本〜数千本まで素朴実装で十分高速。
// （5,000本超で O(n^2) が問題化したら近似最近傍へ差し替え＝データ層のみ変更）

export function termFrequency(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const w of tokens) m.set(w, (m.get(w) ?? 0) + 1);
  return m;
}

export function buildDfIdf(tokenSets: string[][]): {
  df: Map<string, number>;
  idf: Map<string, number>;
  N: number;
} {
  const N = tokenSets.length;
  const df = new Map<string, number>();
  for (const toks of tokenSets) {
    for (const w of new Set(toks)) df.set(w, (df.get(w) ?? 0) + 1);
  }
  const idf = new Map<string, number>();
  for (const [w, c] of df) idf.set(w, Math.log(N / c));
  return { df, idf, N };
}

export function tfidfVector(
  tf: Map<string, number>,
  length: number,
  idf: Map<string, number>
): Map<string, number> {
  const v = new Map<string, number>();
  const len = Math.max(1, length);
  for (const [w, c] of tf) v.set(w, (c / len) * (idf.get(w) ?? 0));
  return v;
}

export function vectorNorm(v: Map<string, number>): number {
  let s = 0;
  for (const x of v.values()) s += x * x;
  return Math.sqrt(s) || 1e-9;
}

export function cosine(
  a: Map<string, number>,
  na: number,
  b: Map<string, number>,
  nb: number
): number {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [k, val] of small) {
    const o = large.get(k);
    if (o) dot += val * o;
  }
  return dot / (na * nb);
}

export function topKeywords(v: Map<string, number>, k: number): string[] {
  return [...v.entries()]
    .sort((x, y) => y[1] - x[1])
    .slice(0, k)
    .map((e) => e[0]);
}
