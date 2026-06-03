import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname);

function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = loadEnv();
const PORT = Number(process.env.PORT) || 3333;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".webm": "video/webm",
  ".mp4": "video/mp4",
};

function safeFilePath(pathname) {
  let rel = pathname.replace(/^\/+/, "");
  if (!rel || rel.endsWith("/")) rel = path.join(rel, "index.html");
  const resolvedRoot = path.resolve(ROOT);
  const full = path.resolve(resolvedRoot, rel);
  if (full !== resolvedRoot && !full.startsWith(resolvedRoot + path.sep)) {
    return null;
  }
  return full;
}

function minifyCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")     // strip comments
    .replace(/\s+/g, " ")                  // collapse whitespace
    .replace(/\s*([{};:,>~])\s*/g, "$1")  // remove spaces around special chars (not + to preserve calc() operators)
    .replace(/;}/g, "}")                   // drop trailing semicolons
    .trim();
}

const CSS_BUNDLE_FILES = [
  "reset.css",
  "css-utils.css",
  "fonts.css",
  "index.css",
  "panel-list.css",
  "panel-scroll.css",
  "skeleton.css",
  "article.css",
  "blog.css",
  "code.css",
  "music-panel.css",
  "moodboard-panel.css",
];

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url ?? "/", "http://localhost").pathname;

  if (pathname === "/css/bundle.css") {
    const cssDir = path.join(ROOT, "css");
    const bundle = minifyCSS(
      CSS_BUNDLE_FILES.map((file) =>
        fs.readFileSync(path.join(cssDir, file), "utf8")
      ).join("\n")
    );
    res.writeHead(200, { "Content-Type": "text/css; charset=utf-8" });
    res.end(bundle);
    return;
  }

  if (pathname === "/contentful-env.js") {
    const spaceId = env.CONTENTFUL_SPACE_ID ?? "";
    const accessToken = env.CONTENTFUL_ACCESS_TOKEN ?? "";
    const body = `window.CONTENTFUL_CONFIG=${JSON.stringify({
      spaceId,
      accessToken,
    })};`;
    res.writeHead(200, {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(body);
    return;
  }

  const filePath = safeFilePath(pathname === "/" ? "/index.html" : pathname);
  if (!filePath) {
    res.writeHead(403).end();
    return;
  }

  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      if (!path.extname(filePath)) {
        const isKnownRoute =
          pathname === "/" || /^\/notes\/[^/]+\/?$/.test(pathname);
        if (isKnownRoute) {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          fs.createReadStream(path.join(ROOT, "index.html")).pipe(res);
        } else {
          res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
          fs.createReadStream(path.join(ROOT, "404.html")).pipe(res);
        }
        return;
      }
      res.writeHead(404).end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Serving ${ROOT}`);
  console.log(`Open http://localhost:${PORT}`);
});
