/// <reference types="vite/client" />

// cytoscape-fcose は型定義を同梱していないためアンビエント宣言を用意する
declare module "cytoscape-fcose" {
  import type { Ext } from "cytoscape";
  const ext: Ext;
  export default ext;
}
