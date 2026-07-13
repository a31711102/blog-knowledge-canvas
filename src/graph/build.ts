import Graph from "graphology";
import { CONFIG } from "../config";
import { cosine } from "../nlp/tfidf";
import type { Corpus } from "../types";

export interface RawEdge {
  a: number;
  b: number;
  w: number;
}

// 全ペアのコサイン類似度を計算（O(n^2)。数千本まで実用的）。
export function computeSimilarities(corpus: Corpus): RawEdge[] {
  const v = corpus.vectors;
  const edges: RawEdge[] = [];
  for (let i = 0; i < v.length; i++) {
    for (let j = i + 1; j < v.length; j++) {
      const w = cosine(v[i].vector, v[i].norm, v[j].vector, v[j].norm);
      if (w > 0) edges.push({ a: i, b: j, w });
    }
  }
  return edges;
}

// θ（閾値）と kNN（1ノードあたり上限本数）でエッジを間引き、graphology グラフを構築。
// 描画層に依存しない中立なグラフを返す（データ層）。
export function buildGraph(
  corpus: Corpus,
  sims: RawEdge[],
  theta: number,
  maxEdgesPerNode = CONFIG.maxEdgesPerNode
): Graph {
  const g = new Graph({ type: "undirected" });
  corpus.vectors.forEach((pv, idx) => {
    g.addNode(String(idx), {
      postId: pv.post.id,
      label: pv.post.title,
      link: pv.post.link,
      category: pv.post.categories[0] ?? "未分類",
      keywords: pv.topKeywords,
    });
  });

  // θ以上のみ残し、各ノードの上位 maxEdgesPerNode 本に制限（ハリボテ化防止）
  const kept = sims.filter((e) => e.w >= theta).sort((x, y) => y.w - x.w);
  const perNode = new Map<number, number>();
  for (const e of kept) {
    const ca = perNode.get(e.a) ?? 0;
    const cb = perNode.get(e.b) ?? 0;
    if (ca >= maxEdgesPerNode || cb >= maxEdgesPerNode) continue;
    const s = String(e.a);
    const t = String(e.b);
    if (g.hasEdge(s, t)) continue;
    g.addUndirectedEdge(s, t, { weight: e.w });
    perNode.set(e.a, ca + 1);
    perNode.set(e.b, cb + 1);
  }
  return g;
}
