// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import fs from "node:fs";
import path from "node:path";

function spaFallback404() {
  return {
    name: "spa-fallback-404",
    apply: "build",
    closeBundle() {
      const distDir = path.resolve(process.cwd(), "dist");
      const indexPath = path.join(distDir, "index.html");
      const notFoundPath = path.join(distDir, "404.html");

      if (!fs.existsSync(indexPath)) {
        throw new Error("spa-fallback-404: dist/index.html not found. Build output is missing.");
      }

      fs.copyFileSync(indexPath, notFoundPath);
    }
  };
}

export default defineConfig({
  plugins: [react(), spaFallback404()],
  build: {
    target: "es2020"
  }
});
