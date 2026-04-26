import { documentToHtmlString } from "https://esm.sh/@contentful/rich-text-html-renderer@16.3.0";
import {
  escapeHtml,
  richTextOptions,
} from "./contentful-rich-text-html.js";
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

function getYearFromPublished(published) {
  if (!published) return null;
  const d = new Date(published);
  if (Number.isNaN(d.getTime())) return null;
  return d.getFullYear();
}

function yearBoundsFromPosts(items) {
  let minY = Infinity;
  let maxY = -Infinity;
  for (const item of items) {
    const y = getYearFromPublished(item?.published);
    if (y == null) continue;
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(minY)) return { min: null, max: null };
  return { min: minY, max: maxY };
}

function buildYearFilterOptions(minY, maxY) {
  const opts = [{ value: "", label: "ALL" }];
  if (minY == null || maxY == null) return opts;
  for (let y = maxY; y >= minY; y--) {
    opts.push({ value: String(y), label: String(y) });
  }
  return opts;
}

function filterPostsByYear(items, yearStr) {
  if (!yearStr) return items;
  const y = Number(yearStr);
  if (Number.isNaN(y)) return items;
  return items.filter((i) => getYearFromPublished(i?.published) === y);
}

/** How many rows to reveal each time the list hits the bottom (ALL view only). */
const BLOG_LIST_PAGE_SIZE = 20;

function formatPostCount(n) {
  const k = Math.max(0, Math.floor(Number(n)) || 0);
  return `${k} ${k === 1 ? "post" : "posts"}`;
}

function setListStatus(ul, text, className = "panel-list__status") {
  ul.replaceChildren();
  const li = document.createElement("li");
  li.className = className;
  li.textContent = text;
  ul.appendChild(li);
}

function renderPostList(ul, items, emptyMessage = "No posts yet.") {
  ul.replaceChildren();
  const fragment = document.createDocumentFragment();
  for (const item of items) {
    if (!item) continue;
    const title = item.title?.trim() || "Untitled";
    const handle = item.handle?.trim();
    const li = document.createElement("li");
    li.className = "panel-list__item";
    if (handle) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "panel-list__button";
      btn.dataset.handle = handle;
      btn.textContent = title;
      li.appendChild(btn);
    } else {
      const titleOnly = document.createElement("span");
      titleOnly.className = "panel-list__title-fallback";
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
    setListStatus(ul, emptyMessage);
  }
  layoutDebugMark("blog:list-rendered", {
    itemCount: items.filter(Boolean).length,
  });
}

function initBlogPanel() {
  const panel = document.getElementById("blog-panel");
  const ul = document.getElementById("blog-posts");
  const yearFilterEl = document.getElementById("blog-year-filter");
  const listFooter = document.getElementById("blog-posts-list-footer");
  const pageStatusEl = document.getElementById("blog-posts-page-status");
  const loadSentinel = document.getElementById("blog-posts-load-sentinel");
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
  let yearFilterReady = false;

  /**
   * How many posts to show from the top when viewing ALL (grows via scroll / sentinel).
   * Year filter shows the full set for that year in one pass.
   */
  let visibleCount = BLOG_LIST_PAGE_SIZE;

  function getYearFilterValue() {
    if (!yearFilterEl) return "";
    return yearFilterEl.value ?? "";
  }

  /** Syncs footer copy + infinite-scroll sentinel (ALL only). */
  function updateListFooterAndSentinel(
    yearStr,
    total,
    toShow,
    sliceForDisplay,
  ) {
    if (loadSentinel) {
      const needMore =
        !yearStr && total > 0 && toShow < total && sliceForDisplay.length > 0;
      loadSentinel.hidden = !needMore;
    }

    if (!listFooter || !pageStatusEl) return;

    if (total === 0) {
      if (yearStr) {
        listFooter.hidden = !articleRoot.hidden;
        pageStatusEl.textContent = `${formatPostCount(0)} in ${yearStr}`;
      } else {
        listFooter.hidden = true;
        pageStatusEl.textContent = "";
      }
      return;
    }

    listFooter.hidden = !articleRoot.hidden;

    if (yearStr) {
      pageStatusEl.textContent = `${formatPostCount(total)} in ${yearStr}`;
      return;
    }

    pageStatusEl.textContent = `Showing ${toShow} of ${total}`;
  }

  let listLoadObserver = null;
  if (loadSentinel && listWrap) {
    listLoadObserver = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e?.isIntersecting) return;
        if (getYearFilterValue()) return;
        const filtered = filterPostsByYear(blogPostListItems, "");
        const total = filtered.length;
        if (visibleCount >= total) return;
        visibleCount = Math.min(
          visibleCount + BLOG_LIST_PAGE_SIZE,
          total,
        );
        refreshBlogList();
      },
      { root: listWrap, rootMargin: "120px", threshold: 0 },
    );
  }

  function refreshBlogList() {
    const yearStr = getYearFilterValue();
    const filtered = filterPostsByYear(blogPostListItems, yearStr);
    const total = filtered.length;

    let pageItems;
    let toShow;

    if (yearStr) {
      pageItems = filtered;
      toShow = total;
    } else {
      toShow = Math.min(visibleCount, total);
      pageItems = filtered.slice(0, toShow);
    }

    const emptyMessage =
      total === 0
        ? yearStr
          ? "No posts for this year."
          : "No posts yet."
        : "No posts yet.";

    renderPostList(ul, pageItems, emptyMessage);
    updateListFooterAndSentinel(yearStr, total, toShow, pageItems);

    if (listLoadObserver && loadSentinel) {
      listLoadObserver.disconnect();
      if (!loadSentinel.hidden) {
        listLoadObserver.observe(loadSentinel);
      }
    }
  }

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
    if (yearFilterEl && yearFilterReady) yearFilterEl.hidden = false;
    if (blogPostListItems.length) refreshBlogList();
    scrollBlogPanelToTop();
  }

  function showArticleView() {
    layoutDebugMark("blog:show-article-view");
    listWrap.hidden = true;
    articleRoot.hidden = false;
    if (yearFilterEl) yearFilterEl.hidden = true;
    if (listFooter) listFooter.hidden = true;
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

    const articleUrl = "/notes/" + encodeURIComponent(handle);
    if (location.pathname !== articleUrl) {
      history.pushState({ blogHandle: handle }, "", articleUrl);
    }

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
      bodyEl.innerHTML = '<p class="blog-post__error">Post not found.</p>';
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

  window.__openBlogPostByHandle = async function openBlogPostFromExternal(
    handle,
  ) {
    const blogPanel = document.getElementById("blog");
    if (
      blogPanel instanceof HTMLElement &&
      typeof blogPanel.setOpen === "function"
    ) {
      document.dispatchEvent(
        new CustomEvent("dropdown:close-all", {
          detail: { exceptId: "blog" },
        }),
      );
      blogPanel.setOpen(true);
    }
    await openPostByHandle(handle);
  };

  panel.addEventListener("click", (ev) => {
    const t = ev.target;
    if (!(t instanceof HTMLElement)) return;

    const postBtn = t.closest(
      "[data-handle].panel-list__button, [data-handle].blog-post__embed-btn, [data-handle].blog-post__inline-entry, [data-handle].blog-post__embed-inline-btn",
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

  // Always reset to list view when the blog panel opens.
  document.addEventListener("dropdown:state-changed", () => {
    const blogDropdown = document.getElementById("blog");
    if (blogDropdown?.open) showListView();
  });

  backBtn.addEventListener("click", () => {
    layoutDebugMark("blog:back-click");
    if (location.pathname !== "/") history.pushState(null, "", "/");
    showListView();
  });

  window.addEventListener("popstate", async (e) => {
    const handle = e.state?.blogHandle;
    if (handle) {
      const blogDropdown = document.getElementById("blog");
      if (blogDropdown && typeof blogDropdown.setOpen === "function") {
        document.dispatchEvent(
          new CustomEvent("dropdown:close-all", { detail: { exceptId: "blog" } }),
        );
        blogDropdown.setOpen(true);
      }
      await openPostByHandle(handle);
    } else {
      showListView();
    }
  });

  // Clear the URL when the blog panel is closed while on an article URL.
  document.addEventListener("dropdown:state-changed", () => {
    const blogDropdown = document.getElementById("blog");
    if (blogDropdown && !blogDropdown.open && location.pathname.startsWith("/notes/")) {
      history.pushState(null, "", "/");
    }
  });

  // Open article on direct URL load (e.g. /notes/:handle).
  const initMatch = /^\/notes\/([^/]+)\/?$/.exec(location.pathname);
  if (initMatch) {
    const handle = decodeURIComponent(initMatch[1]);
    history.replaceState({ blogHandle: handle }, "", location.pathname + location.search);
    const blogDropdown = document.getElementById("blog");
    if (blogDropdown && typeof blogDropdown.setOpen === "function") {
      document.dispatchEvent(
        new CustomEvent("dropdown:close-all", { detail: { exceptId: "blog" } }),
      );
      blogDropdown.setOpen(true);
    }
    openPostByHandle(handle);
  }

  if (yearFilterEl) {
    yearFilterEl.addEventListener("change", () => {
      if (!getYearFilterValue()) {
        visibleCount = BLOG_LIST_PAGE_SIZE;
      }
      refreshBlogList();
      listWrap.scrollTop = 0;
    });
  }

  (async () => {
    layoutDebugMark("blog:list-fetch-start");
    setListStatus(
      ul,
      "Loading…",
      "panel-list__status panel-list__status--loading",
    );

    const [listRes, boundsRes] = await Promise.all([
      window.fetchAllBlogPosts(),
      window.contentfulRequest(window.GET_BLOG_YEAR_BOUNDS_QUERY),
    ]);

    const { items: fetchedItems, errors } = listRes;

    layoutDebugMark("blog:list-fetch-done", { ok: !errors?.length });

    if (errors?.length) {
      const first = errors[0]?.message || "Could not load posts.";
      setListStatus(ul, first, "panel-list__status panel-list__status--error");
      if (yearFilterEl) yearFilterEl.hidden = true;
      if (listFooter) listFooter.hidden = true;
      if (loadSentinel) loadSentinel.hidden = true;
      return;
    }

    blogPostListItems = fetchedItems ?? [];
    visibleCount = BLOG_LIST_PAGE_SIZE;

    let minY = null;
    let maxY = null;
    if (!boundsRes.errors?.length && boundsRes.data) {
      const oldestPub = boundsRes.data.oldest?.items?.[0]?.published;
      const newestPub = boundsRes.data.newest?.items?.[0]?.published;
      if (oldestPub && newestPub) {
        minY = new Date(oldestPub).getFullYear();
        maxY = new Date(newestPub).getFullYear();
      }
    }
    if (minY == null || maxY == null) {
      const fb = yearBoundsFromPosts(blogPostListItems);
      minY = fb.min;
      maxY = fb.max;
    }

    if (
      yearFilterEl &&
      blogPostListItems.length &&
      minY != null &&
      maxY != null
    ) {
      yearFilterEl.setOptions(buildYearFilterOptions(minY, maxY));
      yearFilterReady = true;
      yearFilterEl.hidden = !articleRoot.hidden;
      refreshBlogList();
    } else {
      if (yearFilterEl) yearFilterEl.hidden = true;
      refreshBlogList();
    }
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
