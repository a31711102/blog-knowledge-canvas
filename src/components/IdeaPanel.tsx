import type { IdeaSuggestion } from "../types";

const LABEL: Record<IdeaSuggestion["kind"], string> = {
  underserved: "深掘り不足",
  "assoc-gap": "連想ギャップ",
};

export default function IdeaPanel({ ideas }: { ideas: IdeaSuggestion[] }) {
  return (
    <section className="panel">
      <h3>💡 新記事アイデア</h3>
      {ideas.length === 0 && <p className="muted">解析後にアイデアが提案されます。</p>}
      <ul className="ideas">
        {ideas.map((s, i) => (
          <li key={i} className={`idea ${s.kind}`}>
            <div className="idea-head">
              <span className="idea-tag">{LABEL[s.kind]}</span>
              <span className="idea-title">{s.title}</span>
            </div>
            <div className="idea-detail">{s.detail}</div>
            {s.evidence && s.evidence.length > 0 && (
              <div className="idea-evidence">
                {s.kind === "underserved" ? "登場記事: " : "共通文脈: "}
                {s.evidence.map((e, k) => (
                  <span key={k} className="ev-chip">
                    {e.length > 20 ? e.slice(0, 20) + "…" : e}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
