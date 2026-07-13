# Blog Knowledge Canvas

WordPressブログの記事を **サイトマップ/REST API から取得 → 無LLM・フロント完結で相関解析 → 無限キャンバスに可視化** し、新記事アイデアを発散・収束させるナレッジベース。

## 特徴（設計判断の根拠）
- **バックエンド無し / LLM API無し**。ブラウザだけで完結。ホスティングは静的でよい。
- WP REST API は **CORS標準対応**（実サイトで実測済み）＝プロキシ不要。
- タグ0・カテゴリ僅少のブログでも、**TF-IDFキーワード相関**が主情報源として機能。
- **CTA定型文除去**と**アイデアはTF-IDF特徴語基準**（実データ検証で判明した2点を反映）。
- **データ層(graphology)と描画層(Cytoscape)を分離** ＝ 規模拡大時に片方だけ差し替え可能。

## 技術スタック
Vite + React + TypeScript / kuromoji.js（IPADIC・CDN辞書）/ graphology + Louvain + 中心性 /
Cytoscape.js + fcose / IndexedDB(idb)

## 起動
```bash
npm install
npm run dev      # http://localhost:5173
```
初回は kuromoji 辞書（数MB）をCDNから取得します。以降はブラウザキャッシュ。

## 使い方
1. 上部にブログURL（例: `https://haitou-choco-nikki.com/`）を入れて「解析」。
2. 相関グラフが描画され、クラスタごとに色分けされる。
3. ノードをクリック → 右に記事のキーワードと関連記事。
4. **関連度θ**スライダーでエッジ密度を調整（発散↔収束）。
5. 右下に**新記事アイデア**（未結合キーワード対 / 手薄クラスタ）。
6. JSON書出/取込で解析結果を保存・移送（IndexedDBにも自動キャッシュ＝差分更新）。

## 主要パラメータ
`src/config.ts` … θ初期値・kNN上限・キーワード数・CTA除去マーカー・辞書パス。

## ディレクトリ
```
src/
  ingest/  WP REST 取得
  nlp/     clean(HTML/CTA除去) · tokenize(kuromoji) · tfidf
  graph/   build(θ/kNN→graphology) · analyze(Louvain/中心性)
  ideas/   engine(発散/収束提案)
  store/   IndexedDBキャッシュ + JSON入出力
  components/  Toolbar · CanvasGraph · SidePanel · IdeaPanel
  pipeline.ts  取得→解析→グラフ→アイデアの束ね
```

## ユーザー辞書（固有名詞の分割対策）
kuromoji.js(CDN版)は実行時のユーザー辞書ロードに未対応のため、**トークン列の最長一致マージ**で
同等の効果を出している（`src/nlp/userdict.ts` の複合語を1トークンに再結合）。
例: `銘柄`+`スカウター`→`銘柄スカウター`、`Bean to Bar`→`BeantoBar`、`マネックス`+`証券`→`マネックス証券`。

**辞書の増やし方**
1. `src/nlp/userdict.ts` の `USER_DICTIONARY` に語を追加（表記どおりでよい。スペースは自動除去）。
2. `src/nlp/tokenize.ts` の `TOKENIZER_VERSION` をインクリメント。
   → これによりIndexedDBキャッシュが**自動的に無効化**され、次回「解析」で全記事が再トークン化される
   （＝辞書変更が確実に反映される。手動キャッシュ削除は不要）。

## アイデアの重複対策（多様性キャップ）
連想ギャップ(G3)で `〔A〕×〔指数〕〔A〕×〔連動〕〔A〕×〔分配〕` のような重複が出るのを防ぐ。
当初は「記事集合のJaccardで同義語を畳む」案を試したが、31記事規模では1記事に多テーマが同居するため
**別物（株価とマネックス証券など）まで過剰マージ**した。co-occurrence では真の同義語を判定できない。
そこで安全側に倒し、`src/ideas/engine.ts` で **各テーマ語の登場回数を上限(`CONFIG.ideaTermUseCap`)に制限**する
多様性キャップ方式を採用。誤判定ゼロで重複だけを排除する。

## 将来の拡張
- 5,000本超で全ペアO(n²)が重くなったら **近似最近傍(ANN)** に差し替え（データ層のみ）。
- 1,000ノード超で描画が重くなったら **Sigma.js(WebGL)** に差し替え（描画層のみ）。
- 真の同義語統合が必要なら、curatedな同義語リスト（userdict同様の手動辞書）を追加。
- 記事にタグを付ける運用が始まればタグ共起シグナルを合成し精度をさらに強化。
