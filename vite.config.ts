import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  esbuild: {
    drop: mode === "production" ? ["console", "debugger"] : [],
  },
  build: {
    rollupOptions: {
      output: {
        // Peel large vendors out of the main bundle for faster first paint.
        // Order matters: match specific packages before the generic react catch.
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return;
          if (id.includes("/jspdf")) return "vendor-pdf";
          if (id.includes("/html2canvas")) return "vendor-canvas";
          if (id.includes("/recharts") || id.includes("/d3-") || id.includes("/victory")) return "vendor-recharts";
          if (id.includes("/lucide-react")) return "vendor-icons";
          if (id.includes("/date-fns")) return "vendor-dates";
          if (id.includes("/@radix-ui/")) return "vendor-ui";
          if (id.includes("/@tanstack/")) return "vendor-query";
          if (id.includes("/@supabase/")) return "vendor-supabase";
          if (
            id.includes("/react/") || id.includes("/react-dom/") ||
            id.includes("/react-router") || id.includes("/scheduler/")
          ) return "vendor-react";
          return "vendor";
        },
      },
    },
  },
}));
