import { useCallback, useMemo, useState } from "react";
import Toolbar from "./components/Toolbar";
import CanvasGraph from "./components/CanvasGraph";
import SidePanel from "./components/SidePanel";
import IdeaPanel from "./components/IdeaPanel";
import { fetchAllPosts, fetchCategories, toHost } from "./ingest/wpClient";
import { initTokenizer, TOKENIZER_VERSION } from "./nlp/tokenize";
import { analyzePosts, buildCorpus } from "./pipeline";
import { buildGraph, computeSimilarities, type RawEdge } from "./graph/build";
import { analyzeGraph } from "./graph/analyze";
import { generateIdeas } from "./ideas/engine";
import { exportJson, importJson, loadCached, saveCached } from "./store/cache";
import { CONFIG } from "./config";
import type { Corpus, GraphData, IdeaSuggestion } from "./types";

const DEFAULT_URL = "https://haitou-choco-nikki.com/";

export default function App() {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("URLを入力して「解析」を押してください");
  const [corpus, setCorpus] = useState<Corpus | null>(null);
  const [sims, setSims] = useState<RawEdge[]>([]);
  const [theta, setTheta] = useState(CONFIG.simThreshold);
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [ideas, setIdeas] = useState<IdeaSuggestion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // グラフ＆アイデアを（コーパス確定後に）θで再構築
  const rebuild = useCallback((c: Corpus, s: RawEdge[], th: number) => {
    const g = buildGraph(c, s, th);
    const data = analyzeGraph(g);
    setGraph(data);
    setIdeas(generateIdeas(c, data));
  }, []);

  const runAnalyze = useCallback(async () => {
    try {
      setBusy(true);
      setSelectedId(null);
      setStatus("辞書ロード中（初回のみ数MB）…");
      const tokenizer = await initTokenizer();

      const host = toHost(url);
      setStatus("記事を取得中…");
      const raw = await fetchAllPosts(host, (loaded, total) =>
        setStatus(`記事取得中… ${loaded}/${total}`)
      );
      const cats = await fetchCategories(host);

      setStatus("形態素解析＋TF-IDF計算中…");
      const cached = await loadCached(host, TOKENIZER_VERSION);
      const { posts, reused } = analyzePosts(raw, cats, tokenizer, cached);
      await saveCached(host, posts, TOKENIZER_VERSION);

      const c = buildCorpus(host, posts);
      const s = computeSimilarities(c);
      setCorpus(c);
      setSims(s);
      rebuild(c, s, theta);
      setStatus(`完了: ${posts.length}本（再利用 ${reused}本） / 語彙 ${c.df.size}`);
    } catch (e) {
      setStatus(`エラー: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }, [url, theta, rebuild]);

  const onTheta = useCallback(
    (v: number) => {
      setTheta(v);
      if (corpus) rebuild(corpus, sims, v);
    },
    [corpus, sims, rebuild]
  );

  const onExport = useCallback(() => {
    if (!corpus) return;
    const blob = new Blob([exportJson(corpus.host, corpus.vectors.map((v) => v.post))], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "knowledge-canvas.json";
    a.click();
  }, [corpus]);

  const onImport = useCallback(
    async (text: string) => {
      try {
        setBusy(true);
        const { host, posts } = importJson(text);
        const c = buildCorpus(host || "imported", posts);
        const s = computeSimilarities(c);
        setCorpus(c);
        setSims(s);
        rebuild(c, s, theta);
        setStatus(`インポート完了: ${posts.length}本`);
      } catch (e) {
        setStatus(`インポート失敗: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setBusy(false);
      }
    },
    [theta, rebuild]
  );

  const selected = useMemo(() => {
    if (!corpus || selectedId == null) return null;
    return corpus.vectors[Number(selectedId)] ?? null;
  }, [corpus, selectedId]);

  return (
    <div className="app">
      <Toolbar
        url={url}
        onUrl={setUrl}
        busy={busy}
        status={status}
        theta={theta}
        onTheta={onTheta}
        onAnalyze={runAnalyze}
        onExport={onExport}
        onImport={onImport}
        hasData={!!corpus}
        communityCount={graph?.communityCount ?? 0}
      />
      <div className="main">
        <CanvasGraph data={graph} selectedId={selectedId} onSelect={setSelectedId} />
        <aside className="right">
          <SidePanel corpus={corpus} graph={graph} selected={selected} onSelect={setSelectedId} />
          <IdeaPanel ideas={ideas} />
        </aside>
      </div>
    </div>
  );
}
