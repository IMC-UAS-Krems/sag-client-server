import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import tsconfigPaths from "vite-tsconfig-paths";

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
  },
  envDir: "..",
  build: {
    target: "esnext",
  },
  optimizeDeps: {
    include: ["@codemirror/view"],
    exclude: ["@codemirror/state"],
  },
});
