import type { Connect, Plugin, ViteDevServer } from "vite";
import type { ServerResponse } from "http";

import { resolve } from "path";
import { pipeline } from "stream/promises";

import { streamStatic, compression, byterange } from "stream-static";

function static_compression(root: string) {
  return async (
    req: Connect.IncomingMessage,
    res: ServerResponse,
    _next: Connect.NextFunction
  ) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.statusCode = 405;
      res.setHeader("Allow", "GET, HEAD");
      res.setHeader("Content-Length", 0);
      res.end();
      return;
    }
    let stream;
    try {
      stream = await streamStatic(resolve(root), req, res);
      if (req.method === "HEAD") {
        stream.destroy();
        return;
      }
      res.setHeader("Cache-control", "no-cache");
      await pipeline(stream, byterange(req, res), compression(req, res), res);
      res.end();
    } catch (err: any) {
      res.statusCode = err.status ?? 500;
      if (!res.headersSent) {
        res.setHeader("Content-Length", 0);
      }
      res.end();
      stream?.destroy();
    }
  };
}

export default function serveStaticDir(
  uri_path: string,
  local_path: string,
): Plugin {
  return {
    name: "vite-plugin-serveStaticDir",
    configureServer(server: ViteDevServer) {
      return () => {
        server.middlewares.use("/", (req, _res, next) => {
          console.log(req.method, req.url);
          next();
        });
        server.middlewares.use(uri_path, static_compression(resolve(local_path)));
      };
    },
  };
}
