;(() => {
  const STORAGE_KEY = 'theme'

  class ThemeToggle extends HTMLElement {
    constructor() {
      super()
      this.attachShadow({ mode: 'open' })
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
          }
          button {
            display: flex;
            align-items: center;
            background: none;
            border: 0;
            padding: 0;
            margin: 0;
            cursor: pointer;
          }
          .track {
            position: relative;
            flex-shrink: 0;
            width: 2.75rem;
            height: 1.5rem;
            border-radius: 0.75rem;
            background-color: var(--color-gray-light);
            border: 0.125rem solid var(--color-ink-6);
            transition: background-color 260ms ease, border-color 260ms ease;
          }
          button[aria-checked="true"] .track {
            background-color: var(--color-stone-gray);
          }
          .thumb {
            position: absolute;
            top: 0.0625rem;
            left: 0.0625rem;
            width: 1.125rem;
            height: 1.125rem;
            border-radius: 50%;
            background-color: var(--color-surface);
            transition: transform 260ms ease;
          }
          button[aria-checked="true"] .thumb {
            transform: translateX(1.25rem);
          }
          button:focus-visible .track {
            border-color: var(--color-azure);
          }
          @media (prefers-reduced-motion: reduce) {
            .track,
            .thumb {
              transition-duration: 0.01ms;
            }
          }
        </style>
        <button type="button" tabindex="0" role="switch" aria-checked="false" aria-label="Switch to dark theme">
          <span class="track">
            <span class="thumb"></span>
          </span>
        </button>
      `
    }

    connectedCallback() {
      this._button = this.shadowRoot.querySelector('button')
      this._button.addEventListener('click', () => this.#toggle())
      this.#syncFromDocument()

      this._mql = window.matchMedia('(prefers-color-scheme: dark)')
      this._onSystemChange = () => {
        if (this.#storedTheme()) return
        this.#applyTheme(this._mql.matches ? 'dark' : 'light', {
          persist: false,
        })
      }
      this._mql.addEventListener('change', this._onSystemChange)
    }

    disconnectedCallback() {
      this._mql?.removeEventListener('change', this._onSystemChange)
    }

    #storedTheme() {
      try {
        return localStorage.getItem(STORAGE_KEY)
      } catch {
        return null
      }
    }

    #toggle() {
      const current = document.documentElement.getAttribute('data-theme')
      this.#applyTheme(current === 'dark' ? 'light' : 'dark', { persist: true })
    }

    #applyTheme(theme, { persist }) {
      document.documentElement.setAttribute('data-theme', theme)
      if (persist) {
        try {
          localStorage.setItem(STORAGE_KEY, theme)
        } catch {}
      }
      this.#syncButton(theme)
      document.dispatchEvent(
        new CustomEvent('theme:changed', {
          detail: { theme },
          bubbles: true,
          composed: true,
        }),
      )
    }

    #syncFromDocument() {
      this.#syncButton(
        document.documentElement.getAttribute('data-theme') || 'light',
      )
    }

    #syncButton(theme) {
      const isDark = theme === 'dark'
      this._button.setAttribute('aria-checked', String(isDark))
      this._button.setAttribute(
        'aria-label',
        isDark ? 'Switch to light theme' : 'Switch to dark theme',
      )
    }
  }

  customElements.define('theme-toggle', ThemeToggle)
})()
