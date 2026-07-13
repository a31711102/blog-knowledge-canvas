import { CONFIG } from "../config";
import type { Corpus, GraphData, IdeaSuggestion } from "../types";

// 主題になりにくい「手続き・UI・汎用」名詞。テーマ候補から除外する（アイデア汚染の主因）。
const PROCESS_DENY = new Set<string>(
  `口座 開設 確認 設定 条件 手続き 項目 受取 グラフ ツール 機能 取引 取扱 申込 書類
   完了 通算 特定 徴収 申告 受入 記録 方法 結論 一覧 画面 見方 使い方 場所 内容 状態
   結果 意味 理由 目的 対象 基準 種類 詳細 情報 データ 数値 金額 合計 前回 最終 最高
   ステップ 候補 重視 成果 到達 増加 継続 有名 業務 太郎 土台 抽選 隠し 彩り 開拓
   成長 個別 権利 企業 理論 業種 価格 下落 値上がり 解像度 到着 種別
   Bean Bar PART HC to Haruka Murooka`
    .split(/\s+/)
    .filter(Boolean)
);

// 近似重複（例: チョコ / チョコレート、三菱 / 三菱商事）を排除
function nearDup(a: string, b: string): boolean {
  return a === b || a.includes(b) || b.includes(a);
}

// 新記事アイデアを共起構造から生成（無LLM）。
// G1: 深掘り不足テーマ / G3: 連想ギャップ（link prediction）。
// 重複対策は「同義語の推定」ではなく「各テーマ語の登場回数を上限で抑える多様性制御」で行う
// （co-occurrence では真の同義語を判定できず過剰マージするため、安全側に倒した設計）。
export function generateIdeas(corpus: Corpus, _graph: GraphData): IdeaSuggestion[] {
  const N = corpus.vectors.length;
  if (N === 0) return [];
  const maxDf = Math.max(2, Math.floor(N * 0.4));
  const cap = CONFIG.ideaTermUseCap;

  // どこかの記事で TF-IDF 上位=主題になった語 = 専用記事が既にあるとみなす
  const leadTerms = new Set<string>();
  for (const pv of corpus.vectors) pv.topKeywords.slice(0, 3).forEach((w) => leadTerms.add(w));

  // 候補テーマ語: いずれかの記事で上位語 かつ 手続き語でなく かつ df帯 [2, 0.4N]
  const candidate = new Set<string>();
  for (const pv of corpus.vectors) {
    for (const w of pv.topKeywords) {
      if (PROCESS_DENY.has(w)) continue;
      const df = corpus.df.get(w) ?? 0;
      if (df >= 2 && df <= maxDf) candidate.add(w);
    }
  }
  const terms = [...candidate];

  // 各テーマ語が出る記事集合
  const docSet = new Map<string, Set<number>>();
  for (const t of terms) {
    const s = new Set<number>();
    corpus.vectors.forEach((pv, i) => {
      if (pv.tf.has(t)) s.add(i);
    });
    docSet.set(t, s);
  }
  const co = (a: string, b: string) => {
    let n = 0;
    const A = docSet.get(a)!;
    const B = docSet.get(b)!;
    for (const x of A) if (B.has(x)) n++;
    return n;
  };

  const ideas: IdeaSuggestion[] = [];

  // --- G1: 深掘り不足テーマ ---
  // 複数記事で触れているが主題(上位3語)になった記事が無い語（互いに異なる語なので上位6件）。
  const underserved = terms
    .filter((t) => docSet.get(t)!.size >= 3 && !leadTerms.has(t))
    .map((t) => ({ t, breadth: docSet.get(t)!.size }))
    .sort((a, b) => b.breadth - a.breadth);
  for (const u of underserved) {
    const titles = [...docSet.get(u.t)!].slice(0, 3).map((i) => corpus.vectors[i].post.title);
    ideas.push({
      kind: "underserved",
      title: `「${u.t}」の専用解説記事`,
      detail: `${u.breadth}本の記事で触れているが、${u.t}を主題にした記事がまだ無い。まとめ/解説記事の有力候補。`,
      evidence: titles,
      score: u.breadth,
    });
    if (ideas.length >= 6) break;
  }

  // --- G3: 連想ギャップ（link prediction / Adamic-Adar）---
  // 直接共起しないが、特定性の高い共通文脈を持つテーマ対。多様性キャップで
  // 〔A〕×〔B1〕〔A〕×〔B2〕… の重複を排除する。
  const hubCap = Math.max(2, Math.floor(N * 0.22)); // これ超のdfはハブ語として共通文脈から除外
  const neighborsOf = new Map<string, Set<string>>();
  for (const t of terms) {
    const s = new Set<string>();
    for (const o of terms) if (o !== t && !nearDup(t, o) && co(t, o) > 0) s.add(o);
    neighborsOf.set(t, s);
  }
  const pairs: { a: string; b: string; aa: number; common: string[] }[] = [];
  for (let i = 0; i < terms.length; i++) {
    for (let j = i + 1; j < terms.length; j++) {
      const a = terms[i];
      const b = terms[j];
      if (nearDup(a, b) || co(a, b) > 0) continue;
      const common: string[] = [];
      let aa = 0;
      for (const c of neighborsOf.get(a)!) {
        if (!neighborsOf.get(b)!.has(c)) continue;
        if (docSet.get(c)!.size > hubCap) continue;
        common.push(c);
        aa += 1 / Math.log(docSet.get(c)!.size + 1.5);
      }
      if (common.length >= 2) pairs.push({ a, b, aa, common });
    }
  }
  pairs.sort((x, y) => y.aa - x.aa);

  // G3内の多様性キャップ: 各テーマ語の登場を cap 回までに制限し、
  // 〔A〕×〔B1〕〔A〕×〔B2〕… の重複（指数/連動/分配 など）を排除する。
  const usedG3 = new Map<string, number>();
  const canUse = (t: string) => (usedG3.get(t) ?? 0) < cap;
  const mark = (t: string) => usedG3.set(t, (usedG3.get(t) ?? 0) + 1);
  const g3Start = ideas.length;
  for (const p of pairs) {
    if (!canUse(p.a) || !canUse(p.b)) continue; // 既出テーマ語を含む対はスキップ＝多様性確保
    mark(p.a);
    mark(p.b);
    ideas.push({
      kind: "assoc-gap",
      title: `〔${p.a}〕×〔${p.b}〕`,
      detail: `未だ1本で扱っていないが、「${p.common.slice(0, 3).join("・")}」という共通文脈で橋渡しできる組み合わせ。`,
      evidence: p.common.slice(0, 4),
      score: p.aa,
    });
    if (ideas.length - g3Start >= 6) break;
  }

  return ideas;
}
