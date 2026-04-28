// Dev modes — activated via URL param: ?dev-mode=blog-list, blog-article, code-list, code-project, music-list, or moodboard-list
// Only runs on localhost. Reload the page to exit.
(() => {
  const mode = new URLSearchParams(location.search).get("dev-mode");
  if (!mode) return;

  const host = location.hostname;
  if (host !== "localhost" && host !== "127.0.0.1" && host !== "") return;

  const onDirectArticleUrl = /^\/notes\//.test(location.pathname);

  // Watches both DOM additions and attribute changes (e.g. `hidden` removal).
  function waitForElement(selector, timeout = 8000) {
    const el = document.querySelector(selector);
    if (el) return Promise.resolve(el);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`[dev-mode] timeout waiting for ${selector}`)),
        timeout,
      );
      const obs = new MutationObserver(() => {
        const found = document.querySelector(selector);
        if (found) {
          clearTimeout(timer);
          obs.disconnect();
          resolve(found);
        }
      });
      obs.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    });
  }

  async function openPanel(id) {
    await customElements.whenDefined("dropdown-panel");
    const panel = await waitForElement(`#${id}`);
    document.dispatchEvent(
      new CustomEvent("dropdown:close-all", { detail: { exceptId: id } }),
    );
    panel.setOpen(true);
    return panel;
  }

  function keepPanelOpen(panel) {
    document.addEventListener("dropdown:state-changed", () => {
      if (!panel.open) requestAnimationFrame(() => panel.setOpen(true));
    });
  }

  (async () => {
    try {
      if (mode === "blog-list" || mode === "blog-article") {
        const panel = await openPanel("blog");
        keepPanelOpen(panel);

        if (mode === "blog-list" && onDirectArticleUrl) {
          // blog-panel.js auto-opened the article from the URL; dismiss it to show the list.
          await waitForElement("#blog-post-article:not([hidden])");
          document.getElementById("blog-post-back")?.click();
        } else if (mode === "blog-article" && !onDirectArticleUrl) {
          // Normal root URL — click the first post.
          const btn = await waitForElement(
            "#blog-posts [data-handle].panel-list__button",
          );
          btn.click();
        }
        // blog-article + onDirectArticleUrl: article already shown from URL, nothing to do.
      } else if (mode === "code-list" || mode === "code-project") {
        const panel = await openPanel("writes-code");
        keepPanelOpen(panel);

        if (mode === "code-project") {
          const btn = await waitForElement(
            "#code-projects [data-id].panel-list__button",
          );
          btn.click();
        }
      } else if (mode === "music-list") {
        const panel = await openPanel("makes-music");
        keepPanelOpen(panel);
      } else if (mode === "moodboard") {
        const panel = await openPanel("collects-moods");
        keepPanelOpen(panel);
      }
    } catch (e) {
      console.warn(e.message);
    }
  })();
})();
