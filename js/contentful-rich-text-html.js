import {
  BLOCKS,
  INLINES,
} from "https://esm.sh/@contentful/rich-text-types@16.0.0";

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildAssetEntryMaps(links) {
  const assets = new Map();
  for (const a of links?.assets?.block ?? []) {
    if (a?.sys?.id) assets.set(a.sys.id, a);
  }
  const entries = new Map();
  for (const e of links?.entries?.block ?? []) {
    if (e?.sys?.id) entries.set(e.sys.id, e);
  }
  return { assets, entries };
}

export function richTextOptions(links) {
  const { assets: assetMap, entries: entryMap } = buildAssetEntryMaps(links);

  return {
    renderNode: {
      [BLOCKS.EMBEDDED_ASSET]: (node) => {
        const id = node?.data?.target?.sys?.id;
        if (!id) return "";
        const asset = assetMap.get(id);
        if (!asset?.url) return "";
        const alt = escapeHtml(asset.title || asset.description || "");
        const w =
          asset.width != null
            ? ` width="${escapeHtml(String(asset.width))}"`
            : "";
        const h =
          asset.height != null
            ? ` height="${escapeHtml(String(asset.height))}"`
            : "";
        return `<figure class="blog-post__figure"><img src="${escapeHtml(asset.url)}" alt="${alt}"${w}${h} loading="lazy" /></figure>`;
      },
      [BLOCKS.EMBEDDED_ENTRY]: (node, next) => {
        const id = node?.data?.target?.sys?.id;
        if (!id) return "";
        const entry = entryMap.get(id);
        if (entry?.handle) {
          const label = escapeHtml((entry.title || "Post").trim());
          return `<p class="blog-post__embed"><button type="button" class="blog-post__embed-btn" data-handle="${escapeHtml(entry.handle)}">${label}</button></p>`;
        }
        if (node.content?.length) {
          return `<div class="blog-post__embed-fallback">${next(node.content)}</div>`;
        }
        return "";
      },
      [INLINES.ENTRY_HYPERLINK]: (node, next) => {
        const id = node?.data?.target?.sys?.id;
        if (!id) return next(node.content);
        const entry = entryMap.get(id);
        if (entry?.handle) {
          return `<button type="button" class="blog-post__inline-entry" data-handle="${escapeHtml(entry.handle)}">${next(node.content)}</button>`;
        }
        return `<span class="blog-post__inline-entry-fallback">${next(node.content)}</span>`;
      },
      [INLINES.ASSET_HYPERLINK]: (node, next) => {
        const id = node?.data?.target?.sys?.id;
        if (!id) return next(node.content);
        const asset = assetMap.get(id);
        if (asset?.url) {
          return `<a href="${escapeHtml(asset.url)}" class="blog-post__asset-link">${next(node.content)}</a>`;
        }
        return next(node.content);
      },
      [INLINES.EMBEDDED_ENTRY]: (node) => {
        const id = node?.data?.target?.sys?.id;
        if (!id) return "";
        const entry = entryMap.get(id);
        if (entry?.handle) {
          const label = escapeHtml((entry.title || "Post").trim());
          return `<button type="button" class="blog-post__embed-inline-btn" data-handle="${escapeHtml(entry.handle)}">${label}</button>`;
        }
        return "";
      },
    },
  };
}
