// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    build: {
      // The initial app shell is ~556 kB before compression (~158 kB gzip).
      // Route-specific product surfaces remain split into independent chunks.
      chunkSizeWarningLimit: 560,
      rolldownOptions: {
        output: {
          codeSplitting: {
            minSize: 20_000,
            groups: [
              {
                name: "react-vendor",
                test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
                priority: 30,
              },
              {
                name: "tanstack-vendor",
                test: /node_modules[\\/]@tanstack[\\/]/,
                priority: 25,
              },
              {
                name: "supabase-vendor",
                test: /(@supabase|supabase-js|auth-js|postgrest-js|realtime-js|storage-js|functions-js)/,
                priority: 20,
              },
              {
                name: "stripe-vendor",
                test: /node_modules[\\/](@stripe|stripe)[\\/]/,
                priority: 20,
              },
              {
                name: "ui-vendor",
                test: /node_modules[\\/](@radix-ui|recharts|lucide-react)[\\/]/,
                priority: 15,
              },
              {
                name: "vendor",
                test: /node_modules/,
                minSize: 20_000,
                maxSize: 250_000,
                priority: 5,
              },
            ],
          },
        },
      },
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
