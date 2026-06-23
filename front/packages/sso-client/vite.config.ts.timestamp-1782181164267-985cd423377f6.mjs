// vite.config.ts
import { defineConfig } from "file:///home/dowardev/Documentos/programacion/oneSpend/front/node_modules/.pnpm/vite@5.2.14/node_modules/vite/dist/node/index.js";
import { resolve } from "path";
import dts from "file:///home/dowardev/Documentos/programacion/oneSpend/front/node_modules/.pnpm/vite-plugin-dts@5.0.2_esbuild@0.20.2_rollup@4.60.3_typescript@5.6.3_vite@5.2.14/node_modules/vite-plugin-dts/dist/index.mjs";
var __vite_injected_original_dirname = "/home/dowardev/Documentos/programacion/oneSpend/front/packages/sso-client";
var vite_config_default = defineConfig({
  plugins: [dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: resolve(__vite_injected_original_dirname, "src/index.ts"),
      name: "SSOClient",
      fileName: "index",
      formats: ["es", "umd"]
    },
    rollupOptions: {
      external: ["axios"],
      output: {
        globals: {
          axios: "axios"
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9kb3dhcmRldi9Eb2N1bWVudG9zL3Byb2dyYW1hY2lvbi9vbmVTcGVuZC9mcm9udC9wYWNrYWdlcy9zc28tY2xpZW50XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9kb3dhcmRldi9Eb2N1bWVudG9zL3Byb2dyYW1hY2lvbi9vbmVTcGVuZC9mcm9udC9wYWNrYWdlcy9zc28tY2xpZW50L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL2Rvd2FyZGV2L0RvY3VtZW50b3MvcHJvZ3JhbWFjaW9uL29uZVNwZW5kL2Zyb250L3BhY2thZ2VzL3Nzby1jbGllbnQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgZHRzIGZyb20gXCJ2aXRlLXBsdWdpbi1kdHNcIjtcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW2R0cyh7IHJvbGx1cFR5cGVzOiB0cnVlIH0pXSxcbiAgYnVpbGQ6IHtcbiAgICBsaWI6IHtcbiAgICAgIGVudHJ5OiByZXNvbHZlKF9fZGlybmFtZSwgXCJzcmMvaW5kZXgudHNcIiksXG4gICAgICBuYW1lOiBcIlNTT0NsaWVudFwiLFxuICAgICAgZmlsZU5hbWU6IFwiaW5kZXhcIixcbiAgICAgIGZvcm1hdHM6IFtcImVzXCIsIFwidW1kXCJdLFxuICAgIH0sXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgZXh0ZXJuYWw6IFtcImF4aW9zXCJdLFxuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIGdsb2JhbHM6IHtcbiAgICAgICAgICBheGlvczogXCJheGlvc1wiLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxufSk7Il0sCiAgIm1hcHBpbmdzIjogIjtBQUE2WSxTQUFTLG9CQUFvQjtBQUMxYSxTQUFTLGVBQWU7QUFDeEIsT0FBTyxTQUFTO0FBRmhCLElBQU0sbUNBQW1DO0FBSXpDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxJQUFJLEVBQUUsYUFBYSxLQUFLLENBQUMsQ0FBQztBQUFBLEVBQ3BDLE9BQU87QUFBQSxJQUNMLEtBQUs7QUFBQSxNQUNILE9BQU8sUUFBUSxrQ0FBVyxjQUFjO0FBQUEsTUFDeEMsTUFBTTtBQUFBLE1BQ04sVUFBVTtBQUFBLE1BQ1YsU0FBUyxDQUFDLE1BQU0sS0FBSztBQUFBLElBQ3ZCO0FBQUEsSUFDQSxlQUFlO0FBQUEsTUFDYixVQUFVLENBQUMsT0FBTztBQUFBLE1BQ2xCLFFBQVE7QUFBQSxRQUNOLFNBQVM7QUFBQSxVQUNQLE9BQU87QUFBQSxRQUNUO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
