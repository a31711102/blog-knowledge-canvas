import { BOILERPLATE, CTA_CUT_MARKERS } from "../config";

// HTML → プレーンテキスト（ブラウザの DOMParser を利用）
export function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body?.textContent ?? "";
}

// 本文クリーニング: HTML除去 → 末尾CTA切り落とし → 定型文/URL除去
export function cleanContent(html: string): string {
  let t = stripHtml(html);

  // 末尾CTAブロックを切り落とす（最も早く現れるマーカー位置以降を除去）
  let cut = t.length;
  for (const m of CTA_CUT_MARKERS) {
    const i = t.indexOf(m);
    if (i >= 0 && i < cut) cut = i;
  }
  t = t.slice(0, cut);

  for (const re of BOILERPLATE) t = t.replace(re, " ");
  t = t.replace(/https?:\/\/\S+/g, " ");
  t = t.replace(/[ \t\r\n　]+/g, " ").trim();
  return t;
}

export function stripTitle(html: string): string {
  return stripHtml(html).trim();
}
