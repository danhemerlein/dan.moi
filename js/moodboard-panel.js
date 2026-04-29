const MOODBOARD_BREAKPOINT = "(max-width: 719px)";
const PAGE_SIZE = 10;

function contentfulImageSrc(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (/ctfassets\.net$/i.test(u.hostname)) {
      u.searchParams.set("fm", "webp");
      u.searchParams.set("q", "85");
    }
    return u.href;
  } catch {
    return url;
  }
}

function altFromTitle(title) {
  return (title ?? "").trim();
}

function buildPairs(items) {
  const rows = [];
  for (let i = 0; i < items.length; i++) {
    if (i % 2 === 0) rows.push([items[i]]);
    else rows[rows.length - 1].push(items[i]);
  }
  return rows;
}

function createMoodboardImage(src, alt, loading) {
  const el = document.createElement("image-element");
  el.className = "moodboard-panel__img";
  el.setAttribute("src", src);
  el.setAttribute("alt", alt);
  if (loading === "lazy") el.setAttribute("loading", "lazy");
  el.setAttribute("decoding", "async");
  return el;
}

/** Sentinel sits in scroll-wrap after gallery (same pattern as blog list). */
function insertSmallScreenSentinel(gallery, sentinel, index, length) {
  if (index === length - 2) {
    gallery.appendChild(sentinel);
  }
}

const PANEL_HTML = `
  <div id="moodboard-panel" class="panel-scroll moodboard-panel" aria-live="polite">
    <div id="moodboard-scroll-wrap" class="panel-scroll__viewport">
      <div id="moodboard-gallery" class="moodboard-panel__gallery"></div>
      <div
        id="moodboard-load-sentinel"
        class="panel-scroll__load-sentinel"
        hidden
        aria-hidden="true"
      ></div>
    </div>
  </div>
`;

class MoodboardPanel extends HTMLElement {
  #items = [];
  #total = 0;
  #skip = 0;
  #loadingMore = false;
  #observer = null;
  #mql = null;
  #onMql = null;
  #initialized = false;
  #onDropdownState = null;

  connectedCallback() {
    if (this.#initialized) return;
    this.#initialized = true;
    this.innerHTML = PANEL_HTML;
    this.#bind();
    this.#bindDropdownEvents();
    this.#loadInitial();
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#observer = null;
    if (this.#mql && this.#onMql) {
      this.#mql.removeEventListener("change", this.#onMql);
    }
    this.#mql = null;
    this.#onMql = null;
    if (this.#onDropdownState) {
      document.removeEventListener("dropdown:state-changed", this.#onDropdownState);
      this.#onDropdownState = null;
    }
  }

  #bindDropdownEvents() {
    const blogIntroSection = document.querySelector("blog-intro-section");
    const middleLine = document.querySelector(".middle-line");
    const bottomLine = document.querySelector(".bottom-line");
    const containerEl = document.querySelector(".container");

    const COLLAPSE_TRANSITION = "height 320ms cubic-bezier(0.45, 0, 0.55, 1)";

    function collapseEl(el) {
      if (!el) return;
      const h = el.offsetHeight;
      if (!h) return;
      el.style.overflow = "hidden";
      el.style.marginTop = "0";
      el.style.height = h + "px";
      el.offsetHeight;
      el.style.transition = COLLAPSE_TRANSITION;
      el.offsetHeight;
      el.style.height = "0";
    }

    function expandEl(el) {
      if (!el) return;
      el.style.transition = "";
      el.style.height = "";
      el.style.overflow = "";
      el.style.marginTop = "";
    }

    this.#onDropdownState = () => {
      const moodboardDropdown = document.getElementById("collects-moods");
      if (!moodboardDropdown) return;

      if (moodboardDropdown.open) {
        containerEl?.classList.add("moodboard-open");
        collapseEl(blogIntroSection);
        collapseEl(middleLine);
        collapseEl(bottomLine);
      } else {
        expandEl(blogIntroSection);
        expandEl(middleLine);
        expandEl(bottomLine);
        containerEl?.classList.remove("moodboard-open");
      }
    };

    document.addEventListener("dropdown:state-changed", this.#onDropdownState);
  }

  #bind() {
    this.#mql = window.matchMedia(MOODBOARD_BREAKPOINT);
    this.#onMql = () => {
      this.#render();
      this.#syncObserver();
    };
    this.#mql.addEventListener("change", this.#onMql);
  }

  #isSmallScreen() {
    return (
      this.#mql?.matches ?? window.matchMedia(MOODBOARD_BREAKPOINT).matches
    );
  }

  #gallery() {
    return this.querySelector("#moodboard-gallery");
  }

  #sentinel() {
    return this.querySelector("#moodboard-load-sentinel");
  }

  #scrollWrap() {
    return this.querySelector("#moodboard-scroll-wrap");
  }

  async #loadInitial() {
    const gallery = this.#gallery();
    if (!gallery) return;

    gallery.innerHTML =
      '<p class="moodboard-panel__status moodboard-panel__status--loading">Loading…</p>';

    const { moodboard, errors } = await window.fetchMoodboardInitial();
    if (errors?.length) {
      const msg = errors[0]?.message || "Could not load moodboard.";
      gallery.innerHTML = `<p class="moodboard-panel__status moodboard-panel__status--error">${escapeHtml(msg)}</p>`;
      return;
    }

    const col = moodboard?.imagesCollection;
    this.#total = col?.total ?? 0;
    this.#items = (col?.items ?? []).filter(Boolean);
    this.#skip = this.#items.length;

    if (!this.#items.length) {
      gallery.innerHTML =
        '<p class="moodboard-panel__status">No images yet.</p>';
      return;
    }

    this.#render();
    this.#setupObserver();
  }

  async #loadMore() {
    if (this.#loadingMore || this.#skip >= this.#total) return;
    this.#loadingMore = true;
    this.#observer?.disconnect();
    const { items, errors } = await window.fetchMoodboardImagesPage(
      this.#skip,
      PAGE_SIZE,
    );
    this.#loadingMore = false;
    if (errors?.length) {
      this.#setupObserver();
      return;
    }
    this.#items.push(...items);
    this.#skip += items.length;
    this.#render();
    this.#syncObserver();
  }

  #render() {
    const gallery = this.#gallery();
    const sentinel = this.#sentinel();
    const scrollWrap = this.#scrollWrap();
    if (!gallery || !sentinel || !scrollWrap) return;

    scrollWrap.appendChild(sentinel);
    gallery.replaceChildren();

    const small = this.#isSmallScreen();
    const needMore = this.#skip < this.#total;

    if (small) {
      const n = this.#items.length;
      this.#items.forEach((image, index) => {
        insertSmallScreenSentinel(gallery, sentinel, index, n);
        const src = contentfulImageSrc(image.url);
        const alt = altFromTitle(image.title);
        gallery.appendChild(createMoodboardImage(src, alt, "eager"));
      });
      if (n < 2) {
        scrollWrap.appendChild(sentinel);
      }
    } else {
      const rows = buildPairs(this.#items);
      rows.forEach((group, rowIndex) => {
        const row = document.createElement("div");
        row.className = "moodboard-panel__row";
        const loading = rowIndex > 7 ? "lazy" : "eager";
        for (const image of group) {
          const src = contentfulImageSrc(image.url);
          const alt = altFromTitle(image.title);
          row.appendChild(createMoodboardImage(src, alt, loading));
        }
        gallery.appendChild(row);
      });
      scrollWrap.appendChild(sentinel);
    }

    sentinel.hidden = !needMore;
  }

  #setupObserver() {
    this.#observer?.disconnect();
    const sentinel = this.#sentinel();
    const root = this.#scrollWrap();
    if (!sentinel || !root || sentinel.hidden) return;

    this.#observer = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e?.isIntersecting) return;
        if (this.#skip >= this.#total) return;
        this.#loadMore();
      },
      { root, threshold: 0, rootMargin: "120px" },
    );
    this.#observer.observe(sentinel);
  }

  #syncObserver() {
    this.#observer?.disconnect();
    const sentinel = this.#sentinel();
    if (!sentinel || sentinel.hidden) return;
    this.#setupObserver();
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

customElements.define("moodboard-panel", MoodboardPanel);
