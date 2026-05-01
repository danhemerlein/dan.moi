/**
 * Layout / CLS diagnostics — opt-in only.
 * Enable: add ?debugLayout=1 to the URL, or run localStorage.setItem("debugLayout", "1") and reload.
 * Disable: localStorage.removeItem("debugLayout") or omit the query param.
 *
 * Copy/paste: logs are plain text. If __layoutDebugCopySession() fails (DevTools focused),
 * click the page once, retry, or run: copy(__layoutDebugSessionText())
 */
(function layoutDebug() {
  const enabled =
    new URLSearchParams(window.location.search).get("debugLayout") === "1" ||
    window.localStorage.getItem("debugLayout") === "1";

  if (!enabled) {
    window.__layoutDebugMark = function () {};
    window.__layoutDebugSnapshot = function () {};
    window.__layoutDebugCopyLast = function () {};
    window.__layoutDebugCopySession = function () {};
    window.__layoutDebugSessionText = function () {
      return "";
    };
    window.__layoutDebugLastText = function () {
      return "";
    };
    return;
  }

  const t0 = performance.now();

  /** Pretty JSON so copy/paste from the console is fully readable (no collapsed {…}). */
  function jsonReplacer(_key, value) {
    if (!value || typeof value !== "object") return value;
    if (
      typeof value.width === "number" &&
      typeof value.height === "number" &&
      ("top" in value || "x" in value)
    ) {
      return {
        x: value.x,
        y: value.y,
        width: value.width,
        height: value.height,
        top: value.top,
        left: value.left,
        right: value.right,
        bottom: value.bottom,
      };
    }
    return value;
  }

  function serializeForLog(data) {
    if (data === null) return "null";
    if (typeof data !== "object") return String(data);
    try {
      return JSON.stringify(data, jsonReplacer, 2);
    } catch (err) {
      return "[layout-debug serialize error: " + err.message + "]";
    }
  }

  /** Full text of the most recent log line (for DevTools: copy(__layoutDebugLastLine)). */
  let lastFullLine = "";
  /** Recent full lines (newest last) so you can copy a whole interaction. */
  const sessionLog = [];
  const SESSION_LOG_MAX = 200;

  function recordSession(full) {
    lastFullLine = full;
    sessionLog.push(full);
    if (sessionLog.length > SESSION_LOG_MAX) {
      sessionLog.splice(0, sessionLog.length - SESSION_LOG_MAX);
    }
    window.__layoutDebugLastLine = full;
    window.__layoutDebugSessionLog = sessionLog;
  }

  /** String for DevTools `copy(__layoutDebugSessionText())` when Clipboard API is blocked. */
  window.__layoutDebugSessionText = function () {
    return sessionLog.join("\n\n--- layout-debug ---\n\n");
  };

  window.__layoutDebugLastText = function () {
    return lastFullLine || "";
  };

  function tryExecCommandCopy(text) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText =
        "position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none;";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, text.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  }

  function copyToClipboardWithFallback(label, text) {
    if (!text) {
      console.warn("[layout-debug] nothing to copy");
      return Promise.resolve();
    }
    window.focus();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(
        function () {
          console.log(
            "[layout-debug] copied " +
              label +
              " (" +
              text.length +
              " chars)",
          );
        },
        function (err) {
          if (tryExecCommandCopy(text)) {
            console.log(
              "[layout-debug] copied " +
                label +
                " via execCommand (" +
                text.length +
                " chars)",
            );
            return;
          }
          console.warn(
            "[layout-debug] Clipboard blocked (" +
              (err && err.message ? err.message : String(err)) +
              "). Click the document, then run again — or in the console run: copy(__layoutDebug" +
              (label === "session" ? "SessionText()" : "LastText()") +
              ")",
          );
        },
      );
    }
    if (tryExecCommandCopy(text)) {
      console.log(
        "[layout-debug] copied " + label + " via execCommand (" + text.length + " chars)",
      );
      return Promise.resolve();
    }
    console.warn(
      "[layout-debug] No clipboard; use: copy(__layoutDebug" +
        (label === "session" ? "SessionText()" : "LastText()") +
        ")",
    );
    return Promise.resolve();
  }

  const log = function (msg, data) {
    const elapsed = (performance.now() - t0).toFixed(1);
    const prefix = "[layout-debug +" + elapsed + "ms] " + msg;
    if (data !== undefined) {
      const full = prefix + "\n" + serializeForLog(data);
      recordSession(full);
      console.log(full);
    } else {
      const full = prefix;
      recordSession(full);
      console.log(full);
    }
  };

  window.__layoutDebugCopyLast = function () {
    return copyToClipboardWithFallback("last line", lastFullLine || "");
  };

  window.__layoutDebugCopySession = function () {
    const text = window.__layoutDebugSessionText();
    return copyToClipboardWithFallback("session", text);
  };

  log(
    "enabled — layout-debug (copy: __layoutDebugCopySession() or copy(__layoutDebugSessionText()); if blocked, click page then retry)",
  );

  window.__layoutDebugMark = function (name, detail) {
    log("mark: " + name, detail === undefined ? {} : detail);
  };

  function rectSummary(el) {
    if (!(el instanceof Element)) return null;
    const r = el.getBoundingClientRect();
    return {
      top: Math.round(r.top * 100) / 100,
      left: Math.round(r.left * 100) / 100,
      width: Math.round(r.width * 100) / 100,
      height: Math.round(r.height * 100) / 100,
    };
  }

  let lastSnapshotRects = null;

  function deltaRect(prev, curr) {
    if (
      !prev ||
      !curr ||
      typeof prev !== "object" ||
      typeof curr !== "object"
    ) {
      return null;
    }
    const d = (a, b) => Math.round((b - a) * 100) / 100;
    return {
      dTop: d(prev.top, curr.top),
      dLeft: d(prev.left, curr.left),
      dWidth: d(prev.width, curr.width),
      dHeight: d(prev.height, curr.height),
    };
  }

  /** Full layout snapshot for debugging shifts (opt-in from blog-panel). */
  function logLayoutSnapshot(label) {
    const sel = [
      [".paragraph-container", "paragraph-container"],
      [".intro-line", "intro-line"],
      ["#blog", "#blog"],
      ["#blog-panel", "#blog-panel"],
      ["#blog-post-article", "#blog-post-article"],
      ["#blog-post-body", "#blog-post-body"],
    ];
    const out = { label };
    const deltaKeys = [
      "paragraph-container",
      "intro-line",
      "#blog",
      "#blog-panel",
    ];
    for (const [q, key] of sel) {
      const el = document.querySelector(q);
      out[key] = el ? rectSummary(el) : "(missing)";
      if (el && (q === "#blog-post-body" || q === "#blog-post-article")) {
        out[key + "Offset"] = {
          w: el.offsetWidth,
          h: el.offsetHeight,
        };
        const sk = el.querySelector?.(".blog-post__skeleton");
        if (sk) {
          out[key + "SkeletonRect"] = rectSummary(sk);
        }
      }
    }
    const panel = document.querySelector("#blog-panel");
    if (panel instanceof HTMLElement) {
      out["#blog-panelLayout"] = {
        offsetW: panel.offsetWidth,
        offsetH: panel.offsetHeight,
        scrollH: panel.scrollHeight,
        clientH: panel.clientHeight,
      };
    }
    const listWrap = document.querySelector(".panel-scroll__viewport");
    if (listWrap instanceof HTMLElement && !listWrap.hidden) {
      out.blogListWrapScroll = {
        clientHeight: listWrap.clientHeight,
        scrollHeight: listWrap.scrollHeight,
        scrollTop: listWrap.scrollTop,
      };
    }
    const art = document.querySelector("#blog-post-article");
    if (art instanceof HTMLElement && !art.hidden) {
      out.blogArticleScroll = {
        clientHeight: art.clientHeight,
        scrollHeight: art.scrollHeight,
        scrollTop: art.scrollTop,
      };
    }
    const scroll = document
      .getElementById("blog")
      ?.shadowRoot?.querySelector(".content");
    if (scroll instanceof HTMLElement) {
      out.blogDropdownScroll = {
        clientWidth: scroll.clientWidth,
        clientHeight: scroll.clientHeight,
        scrollHeight: scroll.scrollHeight,
        scrollTop: scroll.scrollTop,
      };
    }
    if (lastSnapshotRects) {
      const deltas = {};
      for (const key of deltaKeys) {
        const dr = deltaRect(lastSnapshotRects[key], out[key]);
        if (dr) deltas[key] = dr;
      }
      if (Object.keys(deltas).length) {
        out.deltaFromPreviousSnapshot = deltas;
      }
    }
    lastSnapshotRects = {};
    for (const key of deltaKeys) {
      const v = out[key];
      lastSnapshotRects[key] =
        v && typeof v === "object" ? { ...v } : v;
    }
    log("layout snapshot: " + label, out);
  }

  window.__layoutDebugSnapshot = logLayoutSnapshot;

  function observeResize(selector, label) {
    const el = document.querySelector(selector);
    if (!el) {
      log("ResizeObserver skip (not found): " + selector);
      return;
    }
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const t = e.target;
        log("resize: " + label, {
          contentRect: {
            w: Math.round(e.contentRect.width * 100) / 100,
            h: Math.round(e.contentRect.height * 100) / 100,
          },
          borderBox: e.borderBoxSize?.[0]
            ? {
                w: Math.round(e.borderBoxSize[0].inlineSize * 100) / 100,
                h: Math.round(e.borderBoxSize[0].blockSize * 100) / 100,
              }
            : undefined,
          clientRect:
            t instanceof Element ? rectSummary(t) : undefined,
        });
      }
    });
    ro.observe(el);
  }

  try {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType !== "layout-shift") continue;
        if (entry.hadRecentInput) continue;
        const sources = entry.sources?.map((s) => ({
          node:
            s.node instanceof Element
              ? s.node.tagName +
                (s.node.id ? "#" + s.node.id : "") +
                (s.node.className
                  ? "." + String(s.node.className).split(/\s+/).slice(0, 2).join(".")
                  : "")
              : s.node,
          prev: s.previousRect,
          curr: s.currentRect,
        }));
        log("CLS layout-shift", {
          value: entry.value,
          startTime: entry.startTime,
          sources: sources ?? "(no sources in this browser)",
        });
      }
    });
    po.observe({ type: "layout-shift", buffered: true });
  } catch (e) {
    log("PerformanceObserver layout-shift unavailable", String(e));
  }

  let lastClientWidth = document.documentElement.clientWidth;
  window.addEventListener(
    "resize",
    function () {
      const w = document.documentElement.clientWidth;
      if (w !== lastClientWidth) {
        log("viewport clientWidth changed", { from: lastClientWidth, to: w });
        lastClientWidth = w;
      }
    },
    { passive: true },
  );

  function startObservers() {
    observeResize(".paragraph-container", ".paragraph-container");
    observeResize(".intro-line", ".intro-line");
    observeResize("#blog-panel", "#blog-panel");
    observeResize("#blog-post-article", "#blog-post-article");
    observeResize("#blog-post-body", "#blog-post-body");
    const blogPanel = document.getElementById("blog");
    if (blogPanel) {
      observeResize("#blog", "#blog (dropdown-panel host)");
    }

    const pc = document.querySelector(".paragraph-container");
    if (pc) {
      log("paragraph-container initial rect", rectSummary(pc));
    }
    const bi = document.querySelector(".intro-line");
    if (bi) {
      log("intro-line initial rect", rectSummary(bi));
    }

    let frame = 0;
    const maxFrames = 180;
    function sampleFrame() {
      frame += 1;
      const pc = document.querySelector(".paragraph-container");
      const bi = document.querySelector(".intro-line");
      if (frame <= maxFrames) {
        if (frame === 1 || frame === 30 || frame === 60 || frame === 120) {
          if (pc) log("rAF sample frame " + frame + " .paragraph-container", rectSummary(pc));
          if (bi) log("rAF sample frame " + frame + " .intro-line", rectSummary(bi));
        }
      }
      if (frame < maxFrames) requestAnimationFrame(sampleFrame);
    }
    requestAnimationFrame(sampleFrame);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObservers);
  } else {
    startObservers();
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      log("document.fonts.ready");
    });
  }

  window.addEventListener("load", function () {
    log("window load");
    const pc = document.querySelector(".paragraph-container");
    if (pc) log("paragraph-container rect at load", rectSummary(pc));
  });
})();
