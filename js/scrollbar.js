export function initScrollbar({ articleWrap, articleRoot, bodyEl, trackStartEl, lerpFactor = 0.12 }) {
  const scrollbarThumb = articleWrap.querySelector('.panel-scroll__custom-bar-thumb')
  if (!scrollbarThumb) return { updateScrollbar: () => {} }

  let thumbH = 0
  let cachedTrackStart = 0
  let cachedTrackEnd = 0
  let thumbCurrentPos = 0
  let thumbTargetPos = 0
  let thumbRafId = null

  // Reflow-safe: reads layout only here, never inside the scroll handler.
  function recomputeTrack() {
    if (!thumbH) thumbH = scrollbarThumb.offsetHeight
    const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize)
    const bottomPad = window.matchMedia('(min-width: 768px)').matches
      ? 2 * remPx
      : 1 * remPx
    const startEl = (trackStartEl && !trackStartEl.hidden) ? trackStartEl : bodyEl
    cachedTrackStart = startEl.offsetTop
    cachedTrackEnd = articleRoot.clientHeight - thumbH - bottomPad
  }

  function tickThumb() {
    thumbCurrentPos += (thumbTargetPos - thumbCurrentPos) * lerpFactor
    scrollbarThumb.style.transform = `translateY(${Math.round(thumbCurrentPos)}px)`
    if (Math.abs(thumbTargetPos - thumbCurrentPos) > 0.5) {
      thumbRafId = requestAnimationFrame(tickThumb)
    } else {
      thumbCurrentPos = thumbTargetPos
      scrollbarThumb.style.transform = `translateY(${Math.round(thumbCurrentPos)}px)`
      thumbRafId = null
    }
  }

  function updateScrollbar() {
    if (articleWrap.hidden) {
      if (scrollbarThumb.style.display !== 'none') scrollbarThumb.style.display = 'none'
      if (thumbRafId !== null) { cancelAnimationFrame(thumbRafId); thumbRafId = null }
      return
    }
    const { scrollTop, scrollHeight, clientHeight } = articleRoot
    if (scrollHeight <= clientHeight) {
      if (scrollbarThumb.style.display !== 'none') scrollbarThumb.style.display = 'none'
      return
    }
    // Only touch display when state actually changes to avoid dirtying layout.
    const wasHidden = scrollbarThumb.style.display !== 'block'
    if (wasHidden) scrollbarThumb.style.display = 'block'
    // Measure after making visible; skip on every subsequent scroll tick.
    if (wasHidden || !thumbH) recomputeTrack()
    const maxScroll = scrollHeight - clientHeight
    const fraction = maxScroll > 0 ? Math.max(0, Math.min(1, scrollTop / maxScroll)) : 0
    const range = Math.max(0, cachedTrackEnd - cachedTrackStart)
    thumbTargetPos = cachedTrackStart + fraction * range
    if (wasHidden) {
      // snap to position on first show — no glide from zero
      thumbCurrentPos = thumbTargetPos
      scrollbarThumb.style.transform = `translateY(${Math.round(thumbCurrentPos)}px)`
    } else if (thumbRafId === null) {
      thumbRafId = requestAnimationFrame(tickThumb)
    }
  }

  articleRoot.addEventListener('scroll', updateScrollbar, { passive: true })

  const ro = new ResizeObserver(() => {
    thumbH = 0 // invalidate cache so recomputeTrack() re-measures
    updateScrollbar()
  })
  ro.observe(articleRoot)
  ro.observe(bodyEl)
  if (trackStartEl) ro.observe(trackStartEl)

  return { updateScrollbar }
}
