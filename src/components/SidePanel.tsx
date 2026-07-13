import { useMemo } from "react";
import type { Corpus, GraphData, PostVector } from "../types";

interface Props {
  corpus: Corpus | null;
  graph: GraphData | null;
  selected: PostVector | null;
  onSelect: (id: string | null) => void;
}

export default function SidePanel({ corpus, graph, selected, onSelect }: Props) {
  // 選択記事の関連記事（エッジ重み順）
  const related = useMemo(() => {
    if (!corpus || !graph || !selected) return [];
    const selfIdx = corpus.vectors.indexOf(selected);
    const id = String(selfIdx);
    const labelOf = new Map(graph.nodes.map((n) => [n.id, n.label]));
    return graph.edges
      .filter((e) => e.source === id || e.target === id)
      .map((e) => {
        const other = e.source === id ? e.target : e.source;
        return { id: other, label: labelOf.get(other) ?? other, w: e.weight };
      })
      .sort((a, b) => b.w - a.w);
  }, [corpus, graph, selected]);

  if (!selected) {
    return (
      <section className="panel">
        <h3>記事の詳細</h3>
        <p className="muted">ノードをクリックすると、キーワードと関連記事が表示されます。</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <h3>記事の詳細</h3>
      <a href={selected.post.link} target="_blank" rel="noreferrer" className="title-link">
        {selected.post.title}
      </a>
      <div className="cats">{selected.post.categories.join(" / ")}</div>

      <h4>キーワード（TF-IDF）</h4>
      <div className="chips">
        {selected.topKeywords.map((k) => (
          <span key={k} className="chip">
            {k}
          </span>
        ))}
      </div>

      <h4>関連記事（{related.length}）</h4>
      <ul className="related">
        {related.map((r) => (
          <li key={r.id}>
            <button className="link" onClick={() => onSelect(r.id)}>
              {r.label}
            </button>
            <span className="score">{r.w.toFixed(2)}</span>
          </li>
        ))}
        {related.length === 0 && <li className="muted">θを下げると関連が現れます</li>}
      </ul>
    </section>
  );
}
