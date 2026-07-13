// ---- WP REST 生データ ----
export interface RawPost {
  id: number;
  link: string;
  title: { rendered: string };
  content: { rendered: string };
  categories: number[];
  modified?: string;
}
export interface Category {
  id: number;
  name: string;
}

// ---- 解析済み（キャッシュ/エクスポートの単位） ----
export interface AnalyzedPost {
  id: number;
  title: string;
  link: string;
  categories: string[];
  modified: string;
  tokens: string[]; // 名詞トークン列（これがあれば idf/vector は再計算できる）
}

// ---- コーパス（idf/ベクトルまで計算した派生状態）----
export interface PostVector {
  post: AnalyzedPost;
  tf: Map<string, number>;
  vector: Map<string, number>; // TF-IDF
  norm: number;
  topKeywords: string[];
}
export interface Corpus {
  host: string;
  fetchedAt: number;
  df: Map<string, number>;
  idf: Map<string, number>;
  vectors: PostVector[];
}

// ---- グラフ（描画層に渡す中立フォーマット）----
export interface GraphNode {
  id: string;
  label: string;
  category: string;
  community: number;
  degree: number;
  betweenness: number;
  keywords: string[];
}
export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  communityCount: number;
}

// ---- アイデア提案 ----
export interface IdeaSuggestion {
  kind: "underserved" | "assoc-gap";
  title: string;
  detail: string;
  evidence?: string[]; // 根拠（記事タイトル / 共通文脈語）
  score: number;
}
