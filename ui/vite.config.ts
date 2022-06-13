import path, { resolve } from "path";
import { defineConfig } from "vite";
import glslify from "./plugins/vite-plugin-glsl";
import runCFWorker from "./plugins/vite-plugin-runCFWorker";
import serveStaticDir from "./plugins/vite-plugin-serveStaticDir";

export default defineConfig(({}) => ({
  root: 'src',
  plugins: [
    // allows importing shaders
    glslify(),

    // runs the CF Worker in numberformatter
    runCFWorker({
      worker_dir: path.join(__dirname, "workers/numberformatter"),
      proxy_config: (mode) => ({
        "^/data/.*": {
          target:
            mode === "development"
              ? "http://localhost:8787"
              : "https://data.cincoptimo.com",
          rewrite: (path) => path.replace(/^\/data/, ''),
          changeOrigin: true,
        }
      }),
    }),

    // only applies to dev not preview. preview uses prod origin
    serveStaticDir('/file/raster/', resolve('../data/webroot/'))
  ],
  clearScreen: false,
}));
