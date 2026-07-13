import { useRef } from "react";

interface Props {
  url: string;
  onUrl: (v: string) => void;
  busy: boolean;
  status: string;
  theta: number;
  onTheta: (v: number) => void;
  onAnalyze: () => void;
  onExport: () => void;
  onImport: (text: string) => void;
  hasData: boolean;
  communityCount: number;
}

export default function Toolbar(p: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <header className="toolbar">
      <div className="row">
        <strong className="brand">🍫 Blog Knowledge Canvas</strong>
        <input
          className="url"
          value={p.url}
          onChange={(e) => p.onUrl(e.target.value)}
          placeholder="サイトマップURL / ブログURL"
          disabled={p.busy}
        />
        <button onClick={p.onAnalyze} disabled={p.busy}>
          {p.busy ? "処理中…" : "解析"}
        </button>

        <label className="theta">
          関連度θ {p.theta.toFixed(2)}
          <input
            type="range"
            min={0.02}
            max={0.6}
            step={0.01}
            value={p.theta}
            onChange={(e) => p.onTheta(Number(e.target.value))}
            disabled={!p.hasData}
          />
        </label>

        <button onClick={p.onExport} disabled={!p.hasData}>
          JSON書出
        </button>
        <button onClick={() => fileRef.current?.click()} disabled={p.busy}>
          JSON取込
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) p.onImport(await f.text());
            e.target.value = "";
          }}
        />
      </div>
      <div className="status">
        {p.status}
        {p.communityCount > 0 && <span className="badge">クラスタ {p.communityCount}</span>}
      </div>
    </header>
  );
}
