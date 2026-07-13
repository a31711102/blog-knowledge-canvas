import Graph from "graphology";
import louvain from "graphology-communities-louvain";
import betweenness from "graphology-metrics/centrality/betweenness";
import type { GraphData, GraphEdge, GraphNode } from "../types";

// Louvainクラスタリング + 媒介中心性を付与し、描画層向けの中立データに変換。
export function analyzeGraph(g: Graph): GraphData {
  // クラスタ検出（収束: トピックの塊）
  if (g.size > 0) {
    louvain.assign(g, { nodeCommunityAttribute: "community" });
  } else {
    g.forEachNode((n) => g.setNodeAttribute(n, "community", 0));
  }

  // 媒介中心性（発散: 橋渡し記事の発見に利用）
  const bc = g.order > 2 ? betweenness(g, { normalized: true }) : {};

  const communities = new Set<number>();
  const nodes: GraphNode[] = g.mapNodes((id, attr) => {
    const community = (attr.community as number) ?? 0;
    communities.add(community);
    return {
      id,
      label: attr.label as string,
      category: attr.category as string,
      community,
      degree: g.degree(id),
      betweenness: bc[id] ?? 0,
      keywords: (attr.keywords as string[]) ?? [],
    };
  });

  const edges: GraphEdge[] = g.mapEdges((_e, attr, s, t) => ({
    source: s,
    target: t,
    weight: attr.weight as number,
  }));

  return { nodes, edges, communityCount: communities.size };
}
