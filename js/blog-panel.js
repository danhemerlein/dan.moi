import { documentToHtmlString } from "https://esm.sh/@contentful/rich-text-html-renderer@16.3.0";
import { BLOCKS, INLINES } from "https://esm.sh/@contentful/rich-text-types@16.0.0";
import { createBlogPostMetaElement } from "./blog-utils.js";

function layoutDebugMark(name, detail) {
  window.__layoutDebugMark?.(name, detail);
}

function layoutDebugSnapshot(label) {
  window.__layoutDebugSnapshot?.(label);
}

/** Ensures at least one paint before continuing (skeleton visible on fast/cached fetches). */
function waitForPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

const ARTICLE_BODY_SKELETON_HTML = `
<div class="blog-post__skeleton" aria-hidden="true">
  <div class="blog-post__skeleton-line blog-post__skeleton-line--lg"></div>
  <div class="blog-post__skeleton-line"></div>
  <div class="blog-post__skeleton-line"></div>
  <div class="blog-post__skeleton-line"></div>
  <div class="blog-post__skeleton-line blog-post__skeleton-line--sm"></div>
</div>`;

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildAssetEntryMaps(links) {
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

function richTextOptions(links) {
  const { assets: assetMap, entries: entryMap } = buildAssetEntryMaps(links);

  return {
    renderNode: {
      [BLOCKS.EMBEDDED_ASSET]: (node) => {
        const id = node?.data?.target?.sys?.id;
        if (!id) return "";
        const asset = assetMap.get(id);
        if (!asset?.url) return "";
        const alt = escapeHtml(asset.title || asset.description || "");
        const w = asset.width != null ? ` width="${escapeHtml(String(asset.width))}"` : "";
        const h = asset.height != null ? ` height="${escapeHtml(String(asset.height))}"` : "";
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

function setListStatus(ul, text, className = "blog-posts__status") {
  ul.replaceChildren();
  const li = document.createElement("li");
  li.className = className;
  li.textContent = text;
  ul.appendChild(li);
}

function renderPostList(ul, items) {
  ul.replaceChildren();
  const fragment = document.createDocumentFragment();
  for (const item of items) {
    if (!item) continue;
    const title = item.title?.trim() || "Untitled";
    const handle = item.handle?.trim();
    const li = document.createElement("li");
    li.className = "blog-posts__item";
    if (handle) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "blog-posts__button";
      btn.dataset.handle = handle;
      btn.textContent = title;
      li.appendChild(btn);
    } else {
      const titleOnly = document.createElement("span");
      titleOnly.className = "blog-posts__title-fallback";
      titleOnly.textContent = title;
      li.appendChild(titleOnly);
    }

    li.appendChild(
      createBlogPostMetaElement({
        published: item.published,
        contentJson: item.content?.json,
        variant: "list",
      }),
    );
    fragment.appendChild(li);
  }
  ul.appendChild(fragment);
  if (!ul.children.length) {
    setListStatus(ul, "No posts yet.");
  }
  layoutDebugMark("blog:list-rendered", {
    itemCount: items.filter(Boolean).length,
  });
}

function initBlogPanel() {
  const panel = document.getElementById("blog-panel");
  const ul = document.getElementById("blog-posts");
  const listWrap = document.getElementById("blog-posts-list-wrap");
  const articleRoot = document.getElementById("blog-post-article");
  const backBtn = document.getElementById("blog-post-back");
  const titleEl = document.getElementById("blog-post-title");
  const metaEl = document.getElementById("blog-post-meta");
  const bodyEl = document.getElementById("blog-post-body");

  if (
    !panel ||
    !ul ||
    !listWrap ||
    !articleRoot ||
    !backBtn ||
    !titleEl ||
    !metaEl ||
    !bodyEl
  ) {
    return;
  }

  layoutDebugMark("blog:panel-init");

  /** Used to paint title + meta immediately when opening from the list (reduces CLS). */
  let blogPostListItems = [];

  function scrollBlogPanelToTop() {
    const blogPanel = document.getElementById("blog");
    const scrollEl = blogPanel?.shadowRoot?.querySelector(".content");
    if (scrollEl instanceof HTMLElement) scrollEl.scrollTop = 0;
    listWrap.scrollTop = 0;
    articleRoot.scrollTop = 0;
  }

  function showListView() {
    layoutDebugMark("blog:show-list-view");
    listWrap.hidden = false;
    articleRoot.hidden = true;
    bodyEl.removeAttribute("aria-busy");
    bodyEl.innerHTML = "";
    titleEl.textContent = "";
    metaEl.replaceChildren();
    metaEl.hidden = true;
    scrollBlogPanelToTop();
  }

  function showArticleView() {
    layoutDebugMark("blog:show-article-view");
    listWrap.hidden = true;
    articleRoot.hidden = false;
    scrollBlogPanelToTop();
    backBtn.focus({ preventScroll: true });
  }

  async function openPostByHandle(handle) {
    if (!handle) return;

    layoutDebugMark("blog:open-post-start", {
      handle,
      listWrapClientH: listWrap.clientHeight,
      listWrapScrollH: listWrap.scrollHeight,
      blogPanelOffsetH: panel.offsetHeight,
    });
    showArticleView();

    bodyEl.innerHTML = ARTICLE_BODY_SKELETON_HTML;
    bodyEl.setAttribute("aria-busy", "true");
    layoutDebugMark("blog:skeleton-injected", {
      bodyOffset: { w: bodyEl.offsetWidth, h: bodyEl.offsetHeight },
    });
    layoutDebugSnapshot("blog:after-skeleton-sync");

    const snapshot = blogPostListItems.find(
      (i) => i?.handle?.trim() === handle,
    );

    if (snapshot) {
      titleEl.textContent = snapshot.title?.trim() || "Untitled";
      metaEl.replaceChildren(
        createBlogPostMetaElement({
          published: snapshot.published,
          contentJson: snapshot.content?.json,
          variant: "article",
        }),
      );
      metaEl.hidden = false;
    } else {
      titleEl.textContent = "Loading…";
      metaEl.replaceChildren();
      metaEl.hidden = true;
    }

    layoutDebugSnapshot("blog:after-title-meta-sync");

    await waitForPaint();
    layoutDebugMark("blog:after-waitForPaint-before-fetch");
    layoutDebugSnapshot("blog:before-fetch");

    const { data, errors } = await window.contentfulRequest(
      window.GET_BLOG_POST_BY_HANDLE_QUERY,
      { handle },
    );

    layoutDebugMark("blog:open-post-fetch-done", {
      ok: !errors?.length,
      hasItem: Boolean(data?.blogPostCollection?.items?.[0]),
    });

    if (errors?.length) {
      const first = errors[0]?.message || "Could not load post.";
      titleEl.textContent = "";
      bodyEl.removeAttribute("aria-busy");
      bodyEl.innerHTML = `<p class="blog-post__error">${escapeHtml(first)}</p>`;
      metaEl.replaceChildren();
      metaEl.hidden = true;
      return;
    }

    const item = data?.blogPostCollection?.items?.[0];
    if (!item) {
      titleEl.textContent = "";
      bodyEl.removeAttribute("aria-busy");
      bodyEl.innerHTML =
        '<p class="blog-post__error">Post not found.</p>';
      metaEl.replaceChildren();
      metaEl.hidden = true;
      return;
    }

    const t = item.title?.trim() || "Untitled";
    titleEl.textContent = t;

    const json = item.content?.json;
    const links = item.content?.links;

    metaEl.replaceChildren(
      createBlogPostMetaElement({
        published: item.published,
        contentJson: json,
        variant: "article",
      }),
    );
    metaEl.hidden = false;

    if (!json) {
      bodyEl.removeAttribute("aria-busy");
      bodyEl.innerHTML =
        '<p class="blog-post__empty">No content for this post yet.</p>';
      return;
    }

    try {
      const html = documentToHtmlString(json, richTextOptions(links));
      bodyEl.removeAttribute("aria-busy");
      bodyEl.innerHTML = html;
      layoutDebugMark("blog:article-body-set", { htmlLength: html.length });
      layoutDebugSnapshot("blog:after-body-innerHTML");
      requestAnimationFrame(function () {
        layoutDebugMark("blog:article-body-after-rAF-1");
        layoutDebugSnapshot("blog:after-body-rAF-1");
      });
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          layoutDebugMark("blog:article-body-after-rAF-2");
          layoutDebugSnapshot("blog:after-body-rAF-2");
        });
      });
    } catch (e) {
      console.warn(e);
      bodyEl.removeAttribute("aria-busy");
      bodyEl.innerHTML =
        '<p class="blog-post__error">Could not render this post.</p>';
    }
  }

  panel.addEventListener("click", (ev) => {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;

    const postBtn = t.closest(
      "[data-handle].blog-posts__button, [data-handle].blog-post__embed-btn, [data-handle].blog-post__inline-entry, [data-handle].blog-post__embed-inline-btn",
    );
    if (postBtn instanceof HTMLElement) {
      const handle = postBtn.dataset.handle?.trim();
      if (handle) {
        ev.preventDefault();
        openPostByHandle(handle);
      }
      return;
    }
  });

  backBtn.addEventListener("click", () => {
    layoutDebugMark("blog:back-click");
    showListView();
  });

  (async () => {
    layoutDebugMark("blog:list-fetch-start");
    setListStatus(ul, "Loading…", "blog-posts__status blog-posts__status--loading");

    const { data, errors } = await window.contentfulRequest(
      window.GET_ALL_BLOG_POSTS_QUERY,
    );

    layoutDebugMark("blog:list-fetch-done", { ok: !errors?.length });

    if (errors?.length) {
      const first = errors[0]?.message || "Could not load posts.";
      setListStatus(ul, first, "blog-posts__status blog-posts__status--error");
      return;
    }

    const collection = data?.blogPostCollection;
    blogPostListItems = collection?.items ?? [];
    renderPostList(ul, blogPostListItems);
  })();
}

function boot() {
  initBlogPanel();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
