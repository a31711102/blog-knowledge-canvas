import { CONFIG } from "../config";
import { STOPWORDS } from "./stopwords";
import { USERDICT, USERDICT_MAX_TOKENS } from "./userdict";

// トークナイザ版数。抽出ロジックや辞書を変えたら必ずインクリメントする。
// これが変わるとキャッシュ(IndexedDB)が自動的に無効化され、再トークン化される。
export const TOKENIZER_VERSION = "2026-07-userdict-1";

// kuromoji はグローバル（index.html の script で読込）
declare global {
  interface Window {
    kuromoji?: {
      builder: (opt: { dicPath: string }) => {
        build: (cb: (err: unknown, tokenizer: KuromojiTokenizer) => void) => void;
      };
    };
  }
}
export interface KuromojiToken {
  surface_form: string;
  pos: string; // 名詞/動詞/...
  pos_detail_1: string; // 一般/固有名詞/非自立/...
}
export interface KuromojiTokenizer {
  tokenize: (text: string) => KuromojiToken[];
}

let tokenizerPromise: Promise<KuromojiTokenizer> | null = null;

// 辞書ロード（初回のみ・数MB）。以降は同一インスタンスを再利用。
export function initTokenizer(): Promise<KuromojiTokenizer> {
  if (tokenizerPromise) return tokenizerPromise;
  tokenizerPromise = new Promise((resolve, reject) => {
    if (!window.kuromoji) {
      reject(new Error("kuromoji が読み込まれていません（index.html の CDN script を確認）"));
      return;
    }
    window.kuromoji
      .builder({ dicPath: CONFIG.kuromojiDicPath })
      .build((err, tokenizer) => (err ? reject(err) : resolve(tokenizer)));
  });
  return tokenizerPromise;
}

interface MergedToken {
  surface: string;
  pos: string;
  detail: string;
  user: boolean; // ユーザー辞書で結合した複合語か
}

// ユーザー辞書の複合語を最長一致で1トークンに再結合する。
// 例: [銘柄][スカウター] → [銘柄スカウター] / [Bean][ ][to][ ][Bar] → [BeantoBar]
function mergeUserDict(raw: KuromojiToken[]): MergedToken[] {
  const out: MergedToken[] = [];
  let i = 0;
  while (i < raw.length) {
    let matched = false;
    const maxW = Math.min(USERDICT_MAX_TOKENS, raw.length - i);
    for (let w = maxW; w >= 2; w--) {
      let concat = "";
      for (let k = 0; k < w; k++) concat += raw[i + k].surface_form;
      const key = concat.replace(/\s+/g, "");
      if (USERDICT.has(key)) {
        out.push({ surface: key, pos: "名詞", detail: "固有名詞", user: true });
        i += w;
        matched = true;
        break;
      }
    }
    if (!matched) {
      const t = raw[i];
      out.push({ surface: t.surface_form, pos: t.pos, detail: t.pos_detail_1, user: false });
      i++;
    }
  }
  return out;
}

// 除外する名詞細分類（数・非自立・代名詞・接尾など、内容語でないもの）
const EXCLUDE_NOUN_DETAIL = new Set(["非自立", "代名詞", "数", "接尾", "副詞可能", "特殊"]);

// 内容語となる名詞のみ抽出（ユーザー辞書の複合語は無条件に採用）
export function extractNouns(tokenizer: KuromojiTokenizer, text: string): string[] {
  const merged = mergeUserDict(tokenizer.tokenize(text));
  const out: string[] = [];
  for (const t of merged) {
    if (t.user) {
      out.push(t.surface); // ユーザー辞書の固有名詞はフィルタを通さず採用
      continue;
    }
    if (t.pos !== "名詞") continue;
    if (EXCLUDE_NOUN_DETAIL.has(t.detail)) continue;
    const s = t.surface;
    if (!s || STOPWORDS.has(s)) continue;
    if (/^[0-9０-９]+$/.test(s)) continue; // 数字のみ
    if (/^[ぁ-んァ-ヶー]$/.test(s)) continue; // 1文字かな
    // 小文字のみの短い英単語（to/in/of や "Bean to Bar" 断片）を除去。
    // 大文字ティッカー（JT/NTT/SBI/JEPQ 等）は内容語として残す。
    if (/^[a-z]+$/.test(s) && s.length <= 3) continue;
    if (/^[a-zA-Z]$/.test(s)) continue; // 1文字英字
    if (s.length < 2 && !/^[一-龥]$/.test(s)) continue; // 短すぎ（漢字1文字は許容）
    out.push(s);
  }
  return out;
}
