import { createServer } from "node:http";
import { readFile, realpath } from "node:fs/promises";
import { resolve, sep, extname } from "node:path";
import { pagesBase } from "./release";

const mime: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
};
export function createDistServer(directory: string) {
  const canonicalRoot = realpath(resolve(directory));
  return createServer(async (req, res) => {
    try {
      const root = await canonicalRoot;
      const path = decodeURIComponent(
        new URL(req.url ?? "/", "http://localhost").pathname,
      );
      if (
        !["GET", "HEAD"].includes(req.method ?? "") ||
        !path.startsWith(pagesBase)
      ) {
        res.writeHead(404).end();
        return;
      }
      const relative = path.slice(pagesBase.length) || "index.html";
      const file = await realpath(resolve(root, relative));
      if (!file.startsWith(root + sep)) {
        res.writeHead(404).end();
        return;
      }
      const body = await readFile(file);
      res.writeHead(200, {
        "Content-Type": mime[extname(file)] ?? "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(req.method === "HEAD" ? undefined : body);
    } catch {
      res.writeHead(404).end();
    }
  });
}
