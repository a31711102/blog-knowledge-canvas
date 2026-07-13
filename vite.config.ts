import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// フロント完結・静的ホスティング前提。base はデプロイ先に合わせて調整。
export default defineConfig({
  plugins: [react()],
  base: "./",
  server: { port: 5173, open: true },
});
