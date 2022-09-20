import { fileURLToPath, URL } from "url";

import { defineConfig, transformWithEsbuild, normalizePath, type Plugin } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsx from "@vitejs/plugin-vue-jsx";

function iifeWorker(): Plugin {
  return {
    name: 'iife-worker',
    apply: 'serve',
    enforce: 'post',
    transform(src, id) {
      const f = normalizePath(id);
      if (f.endsWith("/serviceworker.ts") ||
          (f.includes("/src/worker/") && f.endsWith(".ts?type=classic&worker_file"))) {
        return transformWithEsbuild(src, id, {
          format: "iife",
        })
      }
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), vueJsx(), iifeWorker()],
  build: {
    sourcemap: true,
    rollupOptions: {
      input: {
        "index": fileURLToPath(new URL("index.html", import.meta.url)),
        "serviceworker": fileURLToPath(new URL("./serviceworker.ts", import.meta.url))
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === "serviceworker") {
            return "[name].js"
          }
          return "assets/[name].[hash].js"
        }
      }
    }
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    },
  },
  test: {
    coverage: {
      reporter: ["cobertura", "html", "text", "text-summary"],
    },
  },
  server: {
    port: 3000,
    //please don't remove again, its good for mobile testing
    host: true
  },
  worker: {
    format: "iife",
  },
  esbuild: {
    // format: "iife",
  }
});
