const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const projectRoot = path.resolve(root, "..", "..");
const sharedDataRoot = path.join(projectRoot, "_data", "current");
const port = Number(process.env.PORT || 43131);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function isInside(childPath, parentPath) {
  const relative = path.relative(parentPath, childPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const allowedSharedFiles = new Set([
    "/_data/current/data-core.js",
    "/_data/current/data-views.js",
    "/_data/current/data-dictionary.js",
    "/_data/current/data-audit.js",
    "/_data/current/data-nc-workflow.js",
  ]);
  let filePath;

  if (requested.startsWith("/_data/current/")) {
    if (!allowedSharedFiles.has(requested)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    const sharedRelative = requested.replace("/_data/current/", "");
    filePath = path.resolve(sharedDataRoot, sharedRelative);
    if (!isInside(filePath, sharedDataRoot)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
  } else {
    filePath = path.resolve(root, requested.replace(/^\/+/, ""));
    if (!isInside(filePath, root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`运营成本管理看板已启动：http://127.0.0.1:${port}/`);
});
