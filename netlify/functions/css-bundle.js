import fs from "node:fs";
import path from "node:path";

function minifyCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")     // strip comments
    .replace(/\s+/g, " ")                  // collapse whitespace
    .replace(/\s*([{};:,>~+])\s*/g, "$1") // remove spaces around special chars
    .replace(/;}/g, "}")                   // drop trailing semicolons
    .trim();
}

const CSS_FILES = [
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

export default async function handler() {
  const cssDir = path.join(process.cwd(), "css");
  const bundle = minifyCSS(
    CSS_FILES.map((file) =>
      fs.readFileSync(path.join(cssDir, file), "utf8")
    ).join("\n")
  );

  return new Response(bundle, {
    status: 200,
    headers: {
      "Content-Type": "text/css; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
