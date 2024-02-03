import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import tsconfigPaths from "vite-tsconfig-paths";
import dotenv from "dotenv";

dotenv.config();

// import devtools from 'solid-devtools/vite';

export default defineConfig({
  plugins: [
    /* 
Uncomment the following line to enable solid-devtools.
For more info see https://github.com/thetarnav/solid-devtools/tree/main/packages/extension#readme
*/
    // devtools(),
    solidPlugin(),
    tsconfigPaths(),
  ],
  server: {
    port: 3000,
    // WARNING: This option is insecure, use it in development mode only.
    cors: true,
    proxy: {
      '/auth': {
        target: process.env.VITE_CONFIG_PROXY_AUTH_AND_API_TARGET_URL,
        changeOrigin: true,
      },
      '/api': {
        target: process.env.VITE_CONFIG_PROXY_AUTH_AND_API_TARGET_URL,
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "esnext",
  },
  optimizeDeps: {
    // Add both @codemirror/state and @codemirror/view to included deps to optimize
    include: ["@codemirror/state", "@codemirror/view"],
  },
});
