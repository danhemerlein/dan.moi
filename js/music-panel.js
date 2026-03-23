const STREAMING_LINKS = [
  ["spotify", "Spotify"],
  ["bandcamp", "Bandcamp"],
  ["apple", "Apple Music"],
  ["tidal", "Tidal"],
  ["amazon", "Amazon"],
  ["deezer", "Deezer"],
  ["napster", "Napster"],
  ["googlePlay", "Google Play"],
  ["soundcloud", "SoundCloud"],
];

/** English three-letter month labels (Jan–Dec). */
const MONTH_ABBREV_EN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Full English month names → 3-letter abbrev (handles unparsed CMS text & Safari Date.parse gaps). */
const FULL_MONTH_TO_ABBREV_EN = [
  ["January", "Jan"],
  ["February", "Feb"],
  ["March", "Mar"],
  ["April", "Apr"],
  ["May", "May"],
  ["June", "Jun"],
  ["July", "Jul"],
  ["August", "Aug"],
  ["September", "Sep"],
  ["October", "Oct"],
  ["November", "Nov"],
  ["December", "Dec"],
];

function abbreviateEnglishMonthNames(str) {
  let out = str;
  for (const [full, abbr] of FULL_MONTH_TO_ABBREV_EN) {
    out = out.replace(new RegExp(`\\b${full}\\b`, "gi"), abbr);
  }
  return out;
}

function setListStatus(ul, text, className = "panel-list__status") {
  ul.replaceChildren();
  const li = document.createElement("li");
  li.className = className;
  li.textContent = text;
  ul.appendChild(li);
}

function formatReleaseLabel(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const t = Date.parse(s);
  let display;
  if (!Number.isNaN(t)) {
    const d = new Date(t);
    const mon = MONTH_ABBREV_EN[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear();
    display = `${mon} ${day}, ${year}`;
  } else {
    display = s;
  }
  return abbreviateEnglishMonthNames(display);
}

function formatCredits(item) {
  const parts = [];
  if (item.performed) parts.push("Performed");
  if (item.produced) parts.push("Produced");
  if (item.wrote) parts.push("Wrote");
  return parts.length ? parts.join(" · ") : null;
}

function artistNameOnly(item) {
  const artist = item.artist?.trim();
  return artist || null;
}

/** Only allow http(s) links in the list (Contentful text fields). */
function safeStreamingHref(raw) {
  const u = String(raw ?? "").trim();
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  return null;
}

function renderMusicList(ul, items, emptyMessage = "No music projects yet.") {
  ul.replaceChildren();
  const fragment = document.createDocumentFragment();

  for (const item of items) {
    if (!item) continue;
    const title = item.title?.trim() || "Untitled";
    const li = document.createElement("li");
    li.className = "panel-list__item music-project";

    const shell = document.createElement("div");
    shell.className = "music-project__shell";

    const art = item.artwork;
    if (art?.url) {
      const media = document.createElement("div");
      media.className = "music-project__media";
      const img = document.createElement("img");
      img.className = "music-project__art";
      img.src = art.url;
      img.alt = (art.title || "").trim() || "";
      img.loading = "lazy";
      img.decoding = "async";
      media.appendChild(img);
      shell.appendChild(media);
    }

    const column = document.createElement("div");
    column.className = "music-project__column";

    const headline = document.createElement("div");
    headline.className = "music-project__headline";

    const titleEl = document.createElement("p");
    titleEl.className = "music-project__title";
    titleEl.textContent = title;
    headline.appendChild(titleEl);

    const dateStr = formatReleaseLabel(item.releaseDate);
    if (dateStr) {
      const dateEl = document.createElement("p");
      dateEl.className = "music-project__date";
      dateEl.textContent = dateStr;
      headline.appendChild(dateEl);
    }

    column.appendChild(headline);

    const artistName = artistNameOnly(item);
    if (artistName) {
      const meta = document.createElement("p");
      meta.className = "music-project__meta";
      meta.textContent = artistName;
      column.appendChild(meta);
    }

    const credits = formatCredits(item);
    const linkParts = [];
    for (const [key, label] of STREAMING_LINKS) {
      const raw = item[key];
      const href = typeof raw === "string" ? safeStreamingHref(raw) : null;
      if (href) linkParts.push({ href, label });
    }

    if (credits || linkParts.length) {
      const footer = document.createElement("div");
      footer.className = "music-project__footer";

      if (linkParts.length) {
        const linksWrap = document.createElement("div");
        linksWrap.className = "music-project__links";
        linkParts.forEach((part, i) => {
          if (i > 0) {
            const sep = document.createElement("span");
            sep.className = "music-project__links-sep";
            sep.setAttribute("aria-hidden", "true");
            sep.textContent = "·";
            linksWrap.appendChild(sep);
          }
          const a = document.createElement("a");
          a.className = "music-project__link";
          a.href = part.href;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.textContent = part.label;
          linksWrap.appendChild(a);
        });
        footer.appendChild(linksWrap);
      }

      if (credits) {
        const cred = document.createElement("p");
        cred.className = "music-project__credits";
        cred.textContent = credits;
        footer.appendChild(cred);
      }

      column.appendChild(footer);
    }

    shell.appendChild(column);
    li.appendChild(shell);

    fragment.appendChild(li);
  }

  ul.appendChild(fragment);
  if (!ul.children.length) {
    setListStatus(ul, emptyMessage);
  }
}

function initMusicPanel() {
  const ul = document.getElementById("music-projects");
  if (!ul) return;

  (async () => {
    setListStatus(
      ul,
      "Loading…",
      "panel-list__status panel-list__status--loading",
    );

    const { items: fetchedItems, errors } =
      await window.fetchAllMusicProjects();

    if (errors?.length) {
      const first = errors[0]?.message || "Could not load music projects.";
      setListStatus(
        ul,
        first,
        "panel-list__status panel-list__status--error",
      );
      return;
    }

    renderMusicList(ul, fetchedItems ?? []);
  })();
}

function boot() {
  initMusicPanel();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
