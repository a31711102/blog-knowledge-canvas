// アプリ全体の可変パラメータ。規模が変わってもここだけで密度・品質を調整できる。
export const CONFIG = {
  // --- 取得 ---
  restPerPage: 100, // 1リクエストで最大100件（31本なら1回で完了）
  fields: "id,link,title,content,categories,modified",

  // --- 類似度エッジ生成 ---
  simThreshold: 0.12, // θ 初期値（Toolbarのスライダーで可変）
  maxEdgesPerNode: 6, // kNN上限。増えてもハリボテ化を防ぐ（規模対策）
  topKeywordsPerPost: 8,

  // --- アイデアエンジン（発見B: TF-IDF特徴語基準）---
  ideaTermsPerPost: 6, // 各記事から拾う特徴語数
  ideaMinDf: 2, // 2記事以上に出る語のみ候補
  ideaMaxDfRatio: 0.6, // 全体の60%超に出る汎用語は除外
  ideaMaxSuggestions: 20,
  ideaTermUseCap: 1, // 各テーマ語がアイデア一覧に登場できる最大回数（重複排除・多様性確保）

  // --- kuromoji 辞書（CDN）---
  kuromojiDicPath: "https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/",
};

// CTA/定型文の「切り落とし」マーカー。記事末尾の共通CTA以降を除去する（発見A）。
// ※先頭のアフィリエイト開示文は BOILERPLATE 側で置換除去する（切り落とすと本文が消えるため）。
export const CTA_CUT_MARKERS = [
  "まずは証券口座を開いて",
  "口座選びに迷ったら",
  "【証券口座比較記事】",
  "証券口座比較記事",
];

// どこに出ても除去する定型文（開示文・ナビ等）。
export const BOILERPLATE: RegExp[] = [
  /※?この記事には(アフィリエイト)?広告が含まれています。?/g,
  /アフィリエイト広告を利用しています。?/g,
  /スポンサーリンク/g,
];

// コミュニティ配色（Louvainクラスタ用）
export const PALETTE = [
  "#4f83cc", "#e8833a", "#5aa469", "#c0504d", "#8064a2",
  "#4bacc6", "#d99694", "#9bbb59", "#c9a227", "#7f8c8d",
];
