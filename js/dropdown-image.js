(() => {
  const STATE_EVENT = "dropdown:state-changed";

  /** @type {number} */
  let generation = 0;
  /** @type {number} */
  let coalesceRaf = 0;

  function anyPanelOpen() {
    return Boolean(document.querySelector("dropdown-panel[open]"));
  }

  function getElements() {
    const hero = document.querySelector("image-element.hero-image");
    const dock = document.querySelector("image-element.image-dock");
    return hero instanceof HTMLElement && dock instanceof HTMLElement
      ? { hero, dock }
      : null;
  }

  function syncDockAria(dock, visible) {
    dock.setAttribute("aria-hidden", String(!visible));
  }

  /**
   * @param {HTMLElement} el
   * @param {string} propertyName
   * @param {number} timeoutMs
   * @param {number} gen
   * @param {() => void} onDone
   */
  function waitTransition(el, propertyName, timeoutMs, gen, onDone) {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      el.removeEventListener("transitionend", onEnd);
      clearTimeout(tid);
      if (gen !== generation) return;
      onDone();
    };
    const onEnd = (e) => {
      if (e.target !== el || e.propertyName !== propertyName) return;
      done();
    };
    el.addEventListener("transitionend", onEnd);
    const tid = setTimeout(done, timeoutMs);
  }

  function applyClosedVisuals(els) {
    const { hero, dock } = els;
    hero.classList.remove("hero-image--exit");
    dock.classList.remove(
      "image-dock--prep-open",
      "image-dock--open-anim",
      "image-dock--exit",
      "image-dock--shown",
    );
    syncDockAria(dock, false);
  }

  /**
   * @param {{ hero: HTMLElement; dock: HTMLElement }} els
   * @param {number} gen
   */
  function runOpen(els, gen) {
    const { hero, dock } = els;

    const fullyOpen =
      dock.classList.contains("image-dock--shown") &&
      !dock.classList.contains("image-dock--exit");
    if (fullyOpen) return;

    const openingInProgress =
      hero.classList.contains("hero-image--exit") &&
      !dock.classList.contains("image-dock--shown");
    if (openingInProgress) return;

    dock.classList.remove(
      "image-dock--prep-open",
      "image-dock--open-anim",
      "image-dock--exit",
      "image-dock--shown",
    );
    hero.classList.remove("hero-image--exit");
    syncDockAria(dock, false);

    requestAnimationFrame(() => {
      if (gen !== generation) return;
      hero.classList.add("hero-image--exit");

      /* Next frame: hero transition has started — begin dock in parallel (overlap). */
      requestAnimationFrame(() => {
        if (gen !== generation) return;
        dock.classList.add("image-dock--prep-open");
        syncDockAria(dock, true);
        dock.offsetWidth;
        requestAnimationFrame(() => {
          if (gen !== generation) return;
          dock.classList.add("image-dock--open-anim", "image-dock--shown");

          waitTransition(dock, "transform", 620, gen, () => {
            if (gen !== generation) return;
            dock.classList.remove("image-dock--prep-open", "image-dock--open-anim");
          });
        });
      });
    });
  }

  /**
   * @param {{ hero: HTMLElement; dock: HTMLElement }} els
   * @param {number} gen
   */
  function runClose(els, gen) {
    const { hero, dock } = els;

    const fullyClosed =
      !dock.classList.contains("image-dock--shown") &&
      !hero.classList.contains("hero-image--exit");
    if (fullyClosed) return;

    if (!dock.classList.contains("image-dock--shown")) {
      applyClosedVisuals(els);
      return;
    }

    if (dock.classList.contains("image-dock--exit")) return;

    dock.classList.remove("image-dock--prep-open", "image-dock--open-anim");
    dock.classList.add("image-dock--exit");
    /* Same moment dock starts receding: hero begins rising from below (overlap). */
    hero.classList.remove("hero-image--exit");

    waitTransition(dock, "transform", 600, gen, () => {
      if (gen !== generation) return;
      dock.classList.remove("image-dock--exit", "image-dock--shown");
      syncDockAria(dock, false);
    });
  }

  function tick() {
    coalesceRaf = 0;
    const els = getElements();
    if (!els) return;

    const gen = ++generation;
    if (anyPanelOpen()) runOpen(els, gen);
    else runClose(els, gen);
  }

  function onStateChanged() {
    if (coalesceRaf) cancelAnimationFrame(coalesceRaf);
    coalesceRaf = requestAnimationFrame(tick);
  }

  document.addEventListener(STATE_EVENT, onStateChanged);
})();
