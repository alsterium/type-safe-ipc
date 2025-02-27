import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Viteの設定を定義
export default defineConfig({
  plugins: [react()], // Reactプラグインを有効化
  server: {
    port: 3000, // 開発サーバーのポートを指定（デフォルト: 5173）
    open: false, // ブラウザを自動で開く
  },
  build: {
    outDir: "dist", // ビルド出力先を指定
    sourcemap: true, // デバッグ用にソースマップを生成
  },
});
