// vite.config.js
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig(({ mode }) => {
  // Load .env, .env.production, etc
  const env = loadEnv(mode, process.cwd(), "");

  // Your desired default if the hosting platform does not inject env files
  const fallbackApiBase = "https://api.tabbytech.co.za";

  const apiBase =
    (env.VITE_API_BASE_URL || "").trim() || fallbackApiBase;

  const crmApiBase =
    (env.VITE_CRM_API_BASE || "").trim() || fallbackApiBase;

  return {
    plugins: [react()],

    // Force these values into the bundle at build time, even if the host ignores .env files
    define: {
      "import.meta.env.VITE_API_BASE_URL": JSON.stringify(apiBase),
      "import.meta.env.VITE_CRM_API_BASE": JSON.stringify(crmApiBase),
    },
  };
});
