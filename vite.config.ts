import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  esbuild: {
    // Eliminar console.log/debug/info en build de produccion (mantener error/warn).
    drop: mode === "production" ? ["console", "debugger"] : [],
    pure:
      mode === "production"
        ? ["console.log", "console.info", "console.debug", "console.trace"]
        : [],
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
          stripe: ["@stripe/stripe-js", "@stripe/react-stripe-js"],
        },
      },
    },
  },
  server: {
    port: 3000,
  },
}));
