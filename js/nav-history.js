// Browser back/forward support for the dropdown panels.
//
// Every history entry this module creates carries a nav state:
//   { nav: true, panel: <dropdown-panel id> | null, detail: <blog handle | code project id> | null }
// The stack always mirrors the UI hierarchy — home → panel list → detail — so
// the browser back button walks up one level: detail → list → homepage.
//
// UI code reports user-initiated navigation via `window.navHistory.sync(state)`.
// Panel open/close is picked up automatically from `dropdown:state-changed`.
// On popstate the saved state is re-applied: dropdowns are opened/closed here,
// and a `nav:restore` event lets blog/code panels show their list or detail.
;(() => {
  const RESTORE_EVENT = 'nav:restore'
  const HOME = { nav: true, panel: null, detail: null }
  // Guards against a popstate that never arrives (should not happen in practice).
  const POP_TIMEOUT_MS = 1000

  let applying = false
  let pendingPop = null
  let queue = Promise.resolve()

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'

  function currentState() {
    return history.state?.nav ? history.state : HOME
  }

  /** Hierarchy path for a state, e.g. [] (home), ['blog'], ['blog', 'my-post']. */
  function pathOf(state) {
    if (!state.panel) return []
    return state.detail ? [state.panel, state.detail] : [state.panel]
  }

  function stateFromPath(path) {
    return { nav: true, panel: path[0] ?? null, detail: path[1] ?? null }
  }

  function urlFor(state) {
    const path =
      state.panel === 'blog' && state.detail
        ? '/notes/' + encodeURIComponent(state.detail)
        : '/'
    return path + location.search
  }

  function goBack(steps) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        pendingPop = null
        resolve()
      }, POP_TIMEOUT_MS)
      pendingPop = () => {
        clearTimeout(timer)
        resolve()
      }
      history.go(-steps)
    })
  }

  // Pop back to the deepest entry shared with the target, then push the rest.
  // Keeps back-button behavior hierarchical even when switching panels
  // (e.g. moodboard → code list: back goes home, not to the moodboard).
  async function step(target) {
    const curPath = pathOf(currentState())
    const targetPath = pathOf(target)

    let shared = 0
    while (
      shared < curPath.length &&
      shared < targetPath.length &&
      curPath[shared] === targetPath[shared]
    ) {
      shared++
    }

    const stepsBack = curPath.length - shared
    if (stepsBack > 0) await goBack(stepsBack)

    for (let i = shared; i < targetPath.length; i++) {
      const state = stateFromPath(targetPath.slice(0, i + 1))
      history.pushState(state, '', urlFor(state))
    }
  }

  /** Record a UI-initiated navigation. The UI is expected to already reflect `target`. */
  function sync({ panel = null, detail = null } = {}) {
    if (applying) return
    const target = { nav: true, panel, detail: panel ? detail : null }
    queue = queue.then(() => step(target)).catch((e) => console.warn(e))
  }

  function apply(state) {
    applying = true
    try {
      if (!state.panel) {
        document.dispatchEvent(new CustomEvent('dropdown:close-all'))
        return
      }
      const panel = document.getElementById(state.panel)
      if (panel && !panel.open && typeof panel.setOpen === 'function') {
        document.dispatchEvent(
          new CustomEvent('dropdown:close-all', {
            detail: { exceptId: state.panel },
          }),
        )
        panel.setOpen(true)
      }
      document.dispatchEvent(new CustomEvent(RESTORE_EVENT, { detail: state }))
    } finally {
      applying = false
    }
  }

  window.addEventListener('popstate', () => {
    if (pendingPop) {
      const done = pendingPop
      pendingPop = null
      done()
      return
    }
    apply(currentState())
  })

  document.addEventListener('dropdown:state-changed', () => {
    if (applying) return
    const openId = document.querySelector('dropdown-panel[open]')?.id ?? null
    // Same panel still open: detail changes are reported by the panel itself.
    if (openId && openId === currentState().panel) return
    sync({ panel: openId })
  })

  // Normalize the landing entry. A direct article link gets a synthetic
  // home → blog list → article stack so back walks up the hierarchy.
  let initialState = null
  if (history.state?.nav) {
    // Reload or bfcache restore: entries below are already ours.
    initialState = history.state
  } else {
    const articleMatch = /^\/notes\/([^/]+)\/?$/.exec(location.pathname)
    if (articleMatch) {
      const handle = decodeURIComponent(articleMatch[1])
      history.replaceState(HOME, '', urlFor(HOME))
      const list = stateFromPath(['blog'])
      history.pushState(list, '', urlFor(list))
      initialState = stateFromPath(['blog', handle])
      history.pushState(initialState, '', urlFor(initialState))
    } else {
      history.replaceState(HOME, '', location.href)
    }
  }

  window.navHistory = { sync }

  // Panel modules register their `nav:restore` listeners before DOMContentLoaded.
  if (initialState?.panel) {
    document.addEventListener('DOMContentLoaded', () => apply(initialState), {
      once: true,
    })
  }
})()
