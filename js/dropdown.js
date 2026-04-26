;(() => {
  const CLOSE_EVENT = 'dropdown:close-all'
  const STATE_EVENT = 'dropdown:state-changed'

  function syncBodyBackground() {
    const openPanel = document.querySelector('dropdown-panel[open]')
    if (!openPanel?.id) {
      document.documentElement.style.removeProperty('--color-surface')
      return
    }
    const trigger = document.querySelector(
      `dropdown-trigger[for="${CSS.escape(openPanel.id)}"]`,
    )
    const bodyBg = trigger?.getAttribute('body-bg')
    if (bodyBg) {
      document.documentElement.style.setProperty('--color-surface', bodyBg)
    } else {
      document.documentElement.style.removeProperty('--color-surface')
    }
  }

  function syncAllTriggerBackgrounds() {
    document.querySelectorAll('dropdown-trigger').forEach((el) => {
      el.syncOpenStyles?.()
    })
  }

  function syncAllTriggerAria() {
    document.querySelectorAll('dropdown-trigger').forEach((el) => {
      const targetId = el.getAttribute('for')
      if (!targetId) return
      const panel = document.getElementById(targetId)
      const button = el.shadowRoot?.querySelector('button')
      if (!button) return
      const isOpen = panel instanceof DropdownPanel && panel.open
      button.setAttribute('aria-expanded', String(isOpen))
    })
  }

  function notifyDropdownStateChanged() {
    syncBodyBackground()
    syncAllTriggerBackgrounds()
    syncAllTriggerAria()
  }

  class DropdownPanel extends HTMLElement {
    static get observedAttributes() {
      return ['open']
    }

    constructor() {
      super()
      this.attachShadow({ mode: 'open' })
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
          }
          /* Stable box: match width to the column; avoid horizontal reflow from content. */
          :host([variant="scroll"][open]) {
            width: 100%;
            max-width: 100%;
            min-width: 0;
            box-sizing: border-box;
          }
          /* Fixed footprint: slot content must not change the open panel size — use explicit height. */
          :host([variant="scroll"][open]) .inner {
            --dropdown-scroll-panel-height: var(
              --dropdown-scroll-max-height,
              min(55vh, 28rem)
            );
            height: var(--dropdown-scroll-panel-height);
            max-height: var(--dropdown-scroll-panel-height);
            min-height: var(--dropdown-scroll-panel-height);
            box-sizing: border-box;
          }
          :host([variant="scroll"][open]) .inner .content {
            display: flex;
            flex-direction: column;
            min-height: 0;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior: contain;
          }
          .panel {
            border-radius: 0.875rem;
            overflow: hidden;
            margin-top: 0;
            border: 0;
            background: transparent;
          }

          :host([open]) .panel {
            margin-top: 0.75rem;
          }

          .inner {
            /* Closed state (animated). */
            display: grid;
            grid-template-rows: 0fr;
            opacity: 0;
            transform: translateY(-0.375rem);
            padding: 0;
            pointer-events: none;

            transition:
              grid-template-rows 260ms ease,
              opacity 180ms ease,
              transform 260ms ease,
              padding 240ms ease,
              height 360ms cubic-bezier(0.45, 0, 0.55, 1),
              max-height 360ms cubic-bezier(0.45, 0, 0.55, 1),
              min-height 360ms cubic-bezier(0.45, 0, 0.55, 1);
            overflow: hidden;
          }
          .inner .content {
            min-height: 0;
          }
          /* Closed: slot content must not contribute min-height (avoids layout shift when
             slotted trees grow, e.g. blog list loading after fetch). */
          :host(:not([open])) .inner > .content {
            max-height: 0;
            overflow: hidden;
          }
          :host([open]) .inner {
            opacity: 1;
            transform: translateY(0);
            grid-template-rows: 1fr;
            pointer-events: auto;
          }
          ::slotted(p) {
            margin: 0;
            line-height: 1.3;
            font-size: 1.05rem;
          }
        </style>
        <div class="panel" part="panel">
          <div class="inner" part="content">
            <div class="content">
              <slot></slot>
            </div>
          </div>
        </div>
      `

      // Ensure panels are closed immediately (prevents an initial "flash").
      this.setAttribute('aria-hidden', 'true')
      this.setAttribute('inert', '')
    }

    connectedCallback() {
      // Default to closed unless explicitly marked `open`.
      const shouldOpen = this.hasAttribute('open')
      this.setOpen(shouldOpen)
    }

    attributeChangedCallback(name, _oldValue, newValue) {
      if (name === 'open') {
        this.setOpen(newValue !== null)
      }
    }

    get open() {
      return this.hasAttribute('open')
    }

    setOpen(isOpen) {
      const wasOpen = this.hasAttribute('open')
      if (wasOpen === isOpen) {
        this.setAttribute('aria-hidden', String(!isOpen))
        this.#syncInert(isOpen)
        return
      }

      if (!isOpen && wasOpen && this.contains(document.activeElement)) {
        const id = this.id
        if (id) {
          const trigger = document.querySelector(
            `dropdown-trigger[for="${CSS.escape(id)}"]`,
          )
          trigger?.shadowRoot?.querySelector('button')?.focus()
        }
      }

      if (isOpen) this.setAttribute('open', '')
      else this.removeAttribute('open')

      this.setAttribute('aria-hidden', String(!isOpen))
      this.#syncInert(isOpen)
      this.dispatchEvent(
        new CustomEvent(STATE_EVENT, { bubbles: true, composed: true }),
      )
    }

    /** aria-hidden alone does not exclude focusables from tab order; inert does. */
    #syncInert(isOpen) {
      if (isOpen) this.removeAttribute('inert')
      else this.setAttribute('inert', '')
    }
  }

  class DropdownTrigger extends HTMLElement {
    static get observedAttributes() {
      return ['bg', 'bg-open']
    }

    constructor() {
      super()
      this.attachShadow({ mode: 'open' })
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: inline;
          }
          button {
            background-color: var(--dropdown-trigger-bg, transparent);
            border: 0;
            padding: 4px 6px;
            border-radius: 8px;
            margin: 0;
            font: inherit;
            color: inherit;
            cursor: pointer;
            transition: background-color 260ms ease;
          }
          button:focus-visible {
            outline: 0.125rem solid
              var(--dropdown-trigger-focus-outline, transparent);
            border-radius: 0.375rem;
          }
        </style>
        <button type="button" part="trigger" aria-expanded="false">
          <slot></slot>
        </button>
      `
    }

    connectedCallback() {
      const button = this.shadowRoot.querySelector('button')
      const targetId = this.getAttribute('for')

      if (!targetId) {
        console.warn('[dropdown-trigger] Missing required `for` attribute.')
        return
      }

      button.addEventListener('click', () => {
        const panel = document.getElementById(targetId)
        if (!(panel instanceof DropdownPanel)) return

        // Close everything else, then toggle this panel.
        document.dispatchEvent(
          new CustomEvent(CLOSE_EVENT, { detail: { exceptId: targetId } }),
        )

        const nextState = !panel.open
        panel.setOpen(nextState)
      })

      this.syncOpenStyles()
    }

    attributeChangedCallback(name, _oldValue, _newValue) {
      if (name !== 'bg' && name !== 'bg-open') return
      this.syncOpenStyles()
    }

    syncOpenStyles() {
      const targetId = this.getAttribute('for')
      if (!targetId) return
      const panel = document.getElementById(targetId)
      const isOpen = panel instanceof DropdownPanel && panel.open
      const bgOpen = this.getAttribute('bg-open')
      const bg = this.getAttribute('bg')

      if (isOpen && bgOpen) {
        this.style.setProperty('--dropdown-trigger-bg', bgOpen)
      } else if (bg) {
        this.style.setProperty('--dropdown-trigger-bg', bg)
      } else {
        this.style.removeProperty('--dropdown-trigger-bg')
      }

      const focusOutline = bgOpen || bg
      if (focusOutline) {
        this.style.setProperty('--dropdown-trigger-focus-outline', focusOutline)
      } else {
        this.style.removeProperty('--dropdown-trigger-focus-outline')
      }
    }
  }

  customElements.define('dropdown-panel', DropdownPanel)
  customElements.define('dropdown-trigger', DropdownTrigger)

  document.addEventListener(STATE_EVENT, notifyDropdownStateChanged)

  // Global close handler: when you open one panel, close the rest.
  document.addEventListener(CLOSE_EVENT, (e) => {
    const exceptId = e.detail?.exceptId
    document.querySelectorAll('dropdown-panel').forEach((panel) => {
      if (!(panel instanceof DropdownPanel)) return
      if (exceptId && panel.id === exceptId) return
      panel.setOpen(false)
    })
  })

  // Close when clicking outside.
  document.addEventListener('click', (e) => {
    const path = e.composedPath()
    const clickedTrigger = path.some(
      (el) => el instanceof HTMLElement && el.tagName === 'DROPDOWN-TRIGGER',
    )
    const clickedPanel = path.some(
      (el) => el instanceof HTMLElement && el.tagName === 'DROPDOWN-PANEL',
    )
    if (!clickedTrigger && !clickedPanel) {
      document.querySelectorAll('dropdown-panel').forEach((panel) => {
        if (panel instanceof DropdownPanel) panel.setOpen(false)
      })
    }
  })

  // Close on Escape.
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    document.querySelectorAll('dropdown-panel').forEach((panel) => {
      if (panel instanceof DropdownPanel) panel.setOpen(false)
    })
  })

  notifyDropdownStateChanged()
})()
