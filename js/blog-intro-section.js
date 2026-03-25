/**
 * Renders the “note taker” intro line and blog dropdown panel (keeps ids for blog-panel.js).
 */
const HTML = `
  <p class="body-text">
    Dan Hemerlein is a reader first and a
    <dropdown-trigger
      for="blog"
      bg="var(--color-mint)"
      bg-open="var(--color-lime)"
      body-bg="var(--color-spring)"
      >note taker</dropdown-trigger
    >
    second.
  </p>
  <dropdown-panel id="blog" variant="scroll">
    <div id="blog-panel" class="panel-scroll" aria-live="polite">
      <accessible-select
        id="blog-year-filter"
        class="blog-year-filter type-roboto-mono-12-caps"
        hidden
        placeholder="YEAR"
        aria-label="Filter posts by year published"
      ></accessible-select>
      <div id="blog-posts-list-wrap" class="panel-scroll__viewport">
        <ul id="blog-posts" class="panel-list"></ul>
        <div
          id="blog-posts-load-sentinel"
          class="panel-scroll__load-sentinel"
          hidden
          aria-hidden="true"
        ></div>
      </div>
      <div
        id="blog-posts-list-footer"
        class="panel-scroll__list-footer"
        hidden
      >
        <p
          id="blog-posts-page-status"
          class="panel-scroll__list-footer__status"
        ></p>
      </div>
      <div id="blog-post-article" class="panel-scroll__article" hidden>
        <button
          type="button"
          id="blog-post-back"
          class="blog-post__back"
        >
          Back
        </button>
        <h2 id="blog-post-title" class="blog-post__title"></h2>
        <div id="blog-post-meta" hidden></div>
        <article
          id="blog-post-body"
          class="blog-post__body"
        ></article>
      </div>
    </div>
  </dropdown-panel>
`;

class BlogIntroSection extends HTMLElement {
  connectedCallback() {
    if (this.dataset.rendered) return;
    this.dataset.rendered = "";
    this.classList.add("blog-intro");
    this.innerHTML = HTML;
  }
}

customElements.define("blog-intro-section", BlogIntroSection);
