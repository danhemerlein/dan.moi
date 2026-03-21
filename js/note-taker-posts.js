(() => {
  function setStatus(ul, text, className = "note-taker-posts__status") {
    ul.replaceChildren();
    const li = document.createElement("li");
    li.className = className;
    li.textContent = text;
    ul.appendChild(li);
  }

  function renderPosts(ul, items) {
    ul.replaceChildren();
    const fragment = document.createDocumentFragment();
    for (const item of items) {
      if (!item) continue;
      const title = item.title?.trim() || "Untitled";
      const handle = item.handle?.trim();
      const li = document.createElement("li");
      li.className = "note-taker-posts__item";
      if (handle) {
        const a = document.createElement("a");
        a.className = "note-taker-posts__link";
        a.href = `/blog/${encodeURIComponent(handle)}`;
        a.textContent = title;
        li.appendChild(a);
      } else {
        li.textContent = title;
      }
      fragment.appendChild(li);
    }
    ul.appendChild(fragment);
    if (!ul.children.length) {
      setStatus(ul, "No posts yet.");
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const ul = document.getElementById("note-taker-posts");
    if (!ul) return;

    setStatus(ul, "Loading…", "note-taker-posts__status note-taker-posts__status--loading");

    const { data, errors } = await window.contentfulRequest(
      window.GET_ALL_BLOG_POSTS_QUERY,
    );

    if (errors?.length) {
      const first = errors[0]?.message || "Could not load posts.";
      setStatus(ul, first, "note-taker-posts__status note-taker-posts__status--error");
      return;
    }

    const collection = data?.blogPostCollection;
    const items = collection?.items ?? [];
    renderPosts(ul, items);
  });
})();
