import { useEffect, useRef } from "react";
import cytoscape, { type Core } from "cytoscape";
import fcose from "cytoscape-fcose";
import { PALETTE } from "../config";
import type { GraphData } from "../types";

cytoscape.use(fcose);

interface Props {
  data: GraphData | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

// 描画層（Cytoscape無限キャンバス）。データ層(graphology)とは疎結合。
export default function CanvasGraph({ data, selectedId, onSelect }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);

  useEffect(() => {
    if (!ref.current || !data) return;
    cyRef.current?.destroy();

    const cy = cytoscape({
      container: ref.current,
      elements: [
        ...data.nodes.map((n) => ({
          data: {
            id: n.id,
            label: n.label.length > 22 ? n.label.slice(0, 22) + "…" : n.label,
            community: n.community,
            size: 20 + n.degree * 6,
            color: PALETTE[n.community % PALETTE.length],
          },
        })),
        ...data.edges.map((e, i) => ({
          data: { id: `e${i}`, source: e.source, target: e.target, w: 1 + e.weight * 6 },
        })),
      ],
      style: [
        {
          selector: "node",
          style: {
            "background-color": "data(color)",
            width: "data(size)",
            height: "data(size)",
            label: "data(label)",
            "font-size": "9px",
            color: "#222",
            "text-wrap": "wrap",
            "text-max-width": "120px",
            "text-valign": "bottom",
            "text-margin-y": 3,
            "border-width": 0,
          },
        },
        {
          selector: "edge",
          style: {
            width: "data(w)",
            "line-color": "#c8ccd4",
            "curve-style": "haystack",
            opacity: 0.6,
          },
        },
        {
          selector: "node:selected",
          style: { "border-width": 4, "border-color": "#1a1a1a" },
        },
      ],
      layout: {
        name: "fcose",
        quality: "default",
        animate: true,
        randomize: true,
        nodeSeparation: 90,
      } as any,
      wheelSensitivity: 0.2,
    });

    cy.on("tap", "node", (e) => onSelect(e.target.id()));
    cy.on("tap", (e) => {
      if (e.target === cy) onSelect(null);
    });
    cyRef.current = cy;
    return () => cy.destroy();
  }, [data, onSelect]);

  // 外部選択との同期
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.$(":selected").unselect();
    if (selectedId) {
      const n = cy.$id(selectedId);
      n.select();
      cy.animate({ center: { eles: n }, duration: 300 });
    }
  }, [selectedId]);

  return (
    <div className="canvas-wrap">
      {!data && <div className="placeholder">解析するとここに相関グラフが表示されます</div>}
      <div ref={ref} className="canvas" />
    </div>
  );
}
