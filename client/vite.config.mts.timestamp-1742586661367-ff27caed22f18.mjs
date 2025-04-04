// client/vite.config.mts
import { defineConfig } from "file:///home/dfoddav/projects/Sagittarius/src/web_server_client/node_modules/vite/dist/node/index.js";
import solidPlugin from "file:///home/dfoddav/projects/Sagittarius/src/web_server_client/node_modules/vite-plugin-solid/dist/esm/index.mjs";
import tsconfigPaths from "file:///home/dfoddav/projects/Sagittarius/src/web_server_client/node_modules/vite-tsconfig-paths/dist/index.mjs";
import tailwindcss from "file:///home/dfoddav/projects/Sagittarius/src/web_server_client/node_modules/@tailwindcss/vite/dist/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "/home/dfoddav/projects/Sagittarius/src/web_server_client/client";
var vite_config_default = defineConfig({
  plugins: [
    /* 
    Uncomment the following line to enable solid-devtools.
    For more info see https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#readme
    */
    // devtools(),
    // tailwindcss({ config: "./tailwind.config.js" }),
    tailwindcss(),
    solidPlugin(),
    tsconfigPaths()
  ],
  server: {
    port: 3e3,
    // WARNING: This option is insecure, use it in development mode only.
    cors: true
  },
  envDir: "..",
  build: {
    target: "esnext"
  },
  optimizeDeps: {
    include: ["@codemirror/view"],
    exclude: ["@codemirror/state"]
  },
  resolve: {
    alias: {
      "~": path.resolve(__vite_injected_original_dirname, "./src")
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiY2xpZW50L3ZpdGUuY29uZmlnLm10cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9ob21lL2Rmb2RkYXYvcHJvamVjdHMvU2FnaXR0YXJpdXMvc3JjL3dlYl9zZXJ2ZXJfY2xpZW50L2NsaWVudFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2hvbWUvZGZvZGRhdi9wcm9qZWN0cy9TYWdpdHRhcml1cy9zcmMvd2ViX3NlcnZlcl9jbGllbnQvY2xpZW50L3ZpdGUuY29uZmlnLm10c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vaG9tZS9kZm9kZGF2L3Byb2plY3RzL1NhZ2l0dGFyaXVzL3NyYy93ZWJfc2VydmVyX2NsaWVudC9jbGllbnQvdml0ZS5jb25maWcubXRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCBzb2xpZFBsdWdpbiBmcm9tIFwidml0ZS1wbHVnaW4tc29saWRcIjtcbmltcG9ydCB0c2NvbmZpZ1BhdGhzIGZyb20gXCJ2aXRlLXRzY29uZmlnLXBhdGhzXCI7XG5pbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSBcIkB0YWlsd2luZGNzcy92aXRlXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuXG4vLyBpbXBvcnQgZGV2dG9vbHMgZnJvbSAnc29saWQtZGV2dG9vbHMvdml0ZSc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICAvKiBcbiAgICBVbmNvbW1lbnQgdGhlIGZvbGxvd2luZyBsaW5lIHRvIGVuYWJsZSBzb2xpZC1kZXZ0b29scy5cbiAgICBGb3IgbW9yZSBpbmZvIHNlZSBodHRwczovL2dpdGh1Yi5jb20vdGhldGFybmF2L3NvbGlkLWRldnRvb2xzL3RyZWUvbWFpbi9wYWNrYWdlcy9leHRlbnNpb24jcmVhZG1lXG4gICAgKi9cbiAgICAvLyBkZXZ0b29scygpLFxuICAgIC8vIHRhaWx3aW5kY3NzKHsgY29uZmlnOiBcIi4vdGFpbHdpbmQuY29uZmlnLmpzXCIgfSksXG4gICAgdGFpbHdpbmRjc3MoKSxcbiAgICBzb2xpZFBsdWdpbigpLFxuICAgIHRzY29uZmlnUGF0aHMoKSxcbiAgXSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogMzAwMCxcbiAgICAvLyBXQVJOSU5HOiBUaGlzIG9wdGlvbiBpcyBpbnNlY3VyZSwgdXNlIGl0IGluIGRldmVsb3BtZW50IG1vZGUgb25seS5cbiAgICBjb3JzOiB0cnVlLFxuICB9LFxuICBlbnZEaXI6IFwiLi5cIixcbiAgYnVpbGQ6IHtcbiAgICB0YXJnZXQ6IFwiZXNuZXh0XCIsXG4gIH0sXG4gIG9wdGltaXplRGVwczoge1xuICAgIGluY2x1ZGU6IFtcIkBjb2RlbWlycm9yL3ZpZXdcIl0sXG4gICAgZXhjbHVkZTogW1wiQGNvZGVtaXJyb3Ivc3RhdGVcIl0sXG4gIH0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJ+XCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgfSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFpWCxTQUFTLG9CQUFvQjtBQUM5WSxPQUFPLGlCQUFpQjtBQUN4QixPQUFPLG1CQUFtQjtBQUMxQixPQUFPLGlCQUFpQjtBQUN4QixPQUFPLFVBQVU7QUFKakIsSUFBTSxtQ0FBbUM7QUFRekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBT1AsWUFBWTtBQUFBLElBQ1osWUFBWTtBQUFBLElBQ1osY0FBYztBQUFBLEVBQ2hCO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUE7QUFBQSxJQUVOLE1BQU07QUFBQSxFQUNSO0FBQUEsRUFDQSxRQUFRO0FBQUEsRUFDUixPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsRUFDVjtBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ1osU0FBUyxDQUFDLGtCQUFrQjtBQUFBLElBQzVCLFNBQVMsQ0FBQyxtQkFBbUI7QUFBQSxFQUMvQjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
