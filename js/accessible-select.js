(() => {
  /**
   * Accessible combobox-style single select (WAI-ARIA listbox pattern).
   * Emits `change` with detail `{ value: string }` when the selection changes.
   */
  class AccessibleSelect extends HTMLElement {
    static get observedAttributes() {
      return ["disabled", "placeholder"];
    }

    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._options = [];
      this._value = "";
      /** After user picks from the list, empty value shows option label (e.g. ALL), not placeholder. */
      this._userCommitted = false;
      this._open = false;
      this._activeIndex = 0;
      this._listboxId = `as-lb-${Math.random().toString(36).slice(2, 11)}`;
      this._btnId = `${this._listboxId}-trigger`;

      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            width: 100%;
            max-width: 100%;
            box-sizing: border-box;
            --accessible-select-option-height: 2.625rem;
            font-family: var(--font-hypertext);
          }
          :host([hidden]) {
            display: none !important;
          }
          .wrap {
            position: relative;
            width: 100%;
          }
          .trigger {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.25rem;
            margin: 0;
            padding: 0.25rem 0.375rem;
            border: 1px solid var(--accessible-select-border, var(--color-mint-border));
            border-radius: 0.375rem;
            background: var(--accessible-select-bg, var(--color-mint-cream));
            color: var(--accessible-select-ink, var(--color-ink));
            font-family: var(--type-roboto-mono-12-font-family);
            font-style: normal;
            font-weight: 400;
            font-size: var(--type-roboto-mono-12-font-size, 0.75rem);
            line-height: var(--type-roboto-mono-12-line-height, 1rem);
            letter-spacing: var(--type-roboto-mono-12-letter-spacing, -0.01em);
            text-transform: uppercase;
            cursor: pointer;
          }
          .trigger:disabled {
            opacity: 0.55;
            cursor: not-allowed;
          }
          /* Inset ring: default outline sits outside the border and is clipped by
             dropdown-panel / panel-scroll overflow (top/left vanish at the scroll edge). */
          .trigger:focus-visible {
            outline: none;
            box-shadow: inset 0 0 0 0.125rem
              var(--accessible-select-focus, var(--color-lime));
          }
          .trigger-label {
            flex: 1 1 auto;
            min-width: 0;
            text-align: center;
          }
          .chevron {
            display: flex;
            align-items: center;
            justify-content: center;
            transform: rotate(180deg);
            transition: transform 0.25s ease-in-out;
          }
          .chevron svg {
            display: block;
            width: 1rem;
            height: 1rem;
          }

          .trigger[aria-expanded="true"] .chevron {
            transform: rotate(0deg);
          }

          .listbox {
            position: absolute;
            top: calc(100% + 0.25rem);
            left: 0;
            right: 0;
            z-index: 20;
            margin: 0;
            padding: 0.25rem;
            list-style: none;
            border: 1px solid var(--color-mint-border);
            border-radius: 0.5rem;
            background: var(--accessible-select-bg, var(--color-mint-cream));
            box-shadow: 0.125rem 0.125rem 0.25rem 0 rgba(63, 92, 68, 0.25);
            max-height: calc(4 * var(--accessible-select-option-height));
            overflow-y: auto;
            overscroll-behavior: contain;
            -webkit-overflow-scrolling: touch;
            width: 6.625rem;
          }
          .listbox[hidden] {
            display: none !important;
          }
          .option {
            margin: 0;
            padding: 0 0.75rem;
            min-height: var(--accessible-select-option-height);
            display: flex;
            align-items: center;

            cursor: pointer;
          }
          .option__label {
            margin: 0;
            font-family: var(--type-roboto-mono-12-font-family);
            font-style: normal;
            font-weight: 400;
            font-size: var(--type-roboto-mono-12-font-size, 0.75rem);
            line-height: var(--type-roboto-mono-12-line-height, 1rem);
            letter-spacing: var(--type-roboto-mono-12-letter-spacing, -0.01em);
            text-transform: uppercase;
            text-align: center;
            color: var(--accessible-select-ink, var(--color-ink));
          }
          .option[aria-selected="true"],
          .option:hover,
          .option:focus-visible,
          .option:focus {
            background: var(--accessible-select-selected-bg, var(--color-mint-active));
            border-radius: 0.125rem;
          }
          .option:focus,
          .option:focus-visible {
            outline: none;
          }
        </style>
        <div class="wrap" part="wrap">
          <button type="button" class="trigger" part="trigger" id="${this._btnId}" role="combobox" aria-autocomplete="list" aria-haspopup="listbox" aria-expanded="false" aria-controls="${this._listboxId}">
            <span class="trigger-label" part="value"></span>
            <span class="chevron" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" width="1rem" height="1rem" viewBox="0 0 16 16" fill="none"><path d="M12 10L8 6L4 10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
          </button>
          <div class="listbox" id="${this._listboxId}" role="listbox" tabindex="-1" hidden part="listbox" aria-labelledby="${this._btnId}"></div>
        </div>
      `;

      this._btn = this.shadowRoot.getElementById(this._btnId);
      this._valueEl = this.shadowRoot.querySelector(".trigger-label");
      this._listbox = this.shadowRoot.querySelector(".listbox");
    }

    connectedCallback() {
      this._btn?.setAttribute(
        "aria-label",
        this.getAttribute("aria-label") || "Select an option",
      );
      this._onDocClick = (e) => {
        if (!this._open) return;
        const path = e.composedPath();
        if (!path.includes(this)) this.close();
      };
      this._onDocKey = (e) => {
        if (e.key === "Escape" && this._open) {
          e.stopPropagation();
          this.close();
          this._btn?.focus();
        }
      };

      document.addEventListener("click", this._onDocClick);
      document.addEventListener("keydown", this._onDocKey, true);

      this._btn?.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.disabled) return;
        this.toggle();
      });

      this._btn?.addEventListener("keydown", (e) => {
        if (this.disabled) return;
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const wasClosed = !this._open;
          if (!this._open) this.open();
          if (wasClosed) return;
          if (e.key === "ArrowDown") this._moveActive(1);
          else this._moveActive(-1);
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.toggle();
        }
      });

      this._listbox?.addEventListener("keydown", (e) => {
        if (!this._open) return;
        if (e.key === "Tab") {
          this.close();
          return;
        }
        const opts = this._getOptionEls();
        if (e.key === "ArrowDown") {
          e.preventDefault();
          this._moveActive(1);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          this._moveActive(-1);
        } else if (e.key === "Home") {
          e.preventDefault();
          this._setActiveIndex(0);
        } else if (e.key === "End") {
          e.preventDefault();
          this._setActiveIndex(opts.length - 1);
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const v = this._options[this._activeIndex]?.value;
          if (v !== undefined) this.#commitValue(v);
        }
      });

      this._syncDisabled();
      this.#renderOptions();
      this.#syncButtonLabel();
    }

    disconnectedCallback() {
      document.removeEventListener("click", this._onDocClick);
      document.removeEventListener("keydown", this._onDocKey, true);
    }

    attributeChangedCallback(name) {
      if (name === "disabled") this._syncDisabled();
      if (name === "placeholder") this.#syncButtonLabel();
    }

    get disabled() {
      return this.hasAttribute("disabled");
    }

    set disabled(v) {
      if (v) this.setAttribute("disabled", "");
      else this.removeAttribute("disabled");
    }

    get value() {
      return this._value;
    }

    set value(v) {
      const s = v == null ? "" : String(v);
      if (this._value === s) return;
      this._value = s;
      this.#syncButtonLabel();
      this.#syncSelectedAria();
    }

    /**
     * @param {{ value: string, label: string }[]} options
     */
    setOptions(options) {
      this._options = Array.isArray(options) ? options.slice() : [];
      if (!this._options.some((o) => o.value === this._value)) {
        this._value = this._options[0]?.value ?? "";
      }
      this.#renderOptions();
      this.#syncButtonLabel();
      this.#syncSelectedAria();
      this.#syncActiveToValue();
    }

    _syncDisabled() {
      const d = this.disabled;
      this._btn.disabled = d;
      if (d) this.close();
    }

    _getOptionEls() {
      return this._listbox
        ? Array.from(this._listbox.querySelectorAll('[role="option"]'))
        : [];
    }

    #renderOptions() {
      if (!this._listbox) return;
      this._listbox.replaceChildren();
      this._options.forEach((opt, i) => {
        const el = document.createElement("div");
        el.setAttribute("role", "option");
        el.className = "option";
        el.id = `${this._listboxId}-opt-${i}`;
        el.setAttribute("data-value", opt.value);
        const labelEl = document.createElement("span");
        labelEl.className = "option__label";
        labelEl.setAttribute("part", "option-label");
        labelEl.textContent = opt.label;
        el.appendChild(labelEl);
        el.tabIndex = -1;
        el.setAttribute(
          "aria-selected",
          opt.value === this._value ? "true" : "false",
        );
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          this.#commitValue(opt.value);
        });
        el.addEventListener("mouseenter", () => {
          this._activeIndex = i;
          this._focusActiveOption();
        });
        this._listbox.appendChild(el);
      });
    }

    #syncButtonLabel() {
      const ph = this.getAttribute("placeholder")?.trim();
      if (this._value === "" && ph && !this._userCommitted) {
        if (this._valueEl) this._valueEl.textContent = ph;
        return;
      }
      const cur = this._options.find((o) => o.value === this._value);
      if (this._valueEl) {
        this._valueEl.textContent = cur?.label ?? "";
      }
    }

    #syncSelectedAria() {
      this._getOptionEls().forEach((el, i) => {
        const v = this._options[i]?.value;
        el.setAttribute("aria-selected", v === this._value ? "true" : "false");
      });
    }

    #syncActiveToValue() {
      const idx = this._options.findIndex((o) => o.value === this._value);
      this._activeIndex = idx >= 0 ? idx : 0;
    }

    toggle() {
      if (this._open) this.close();
      else this.open();
    }

    open() {
      if (this.disabled || !this._options.length) return;
      this._open = true;
      this._btn?.setAttribute("aria-expanded", "true");
      this._listbox?.removeAttribute("hidden");
      this.#syncActiveToValue();
      this._focusActiveOption();
    }

    close() {
      if (!this._open) return;
      this._open = false;
      this._btn?.setAttribute("aria-expanded", "false");
      this._listbox?.setAttribute("hidden", "");
    }

    _moveActive(delta) {
      const opts = this._getOptionEls();
      if (!opts.length) return;
      let next = this._activeIndex + delta;
      next = Math.max(0, Math.min(opts.length - 1, next));
      this._activeIndex = next;
      this._focusActiveOption();
    }

    _setActiveIndex(i) {
      const opts = this._getOptionEls();
      if (!opts.length) return;
      this._activeIndex = Math.max(0, Math.min(opts.length - 1, i));
      this._focusActiveOption();
    }

    _focusActiveOption() {
      const opts = this._getOptionEls();
      opts.forEach((el, i) => {
        el.tabIndex = i === this._activeIndex ? 0 : -1;
      });
      opts[this._activeIndex]?.focus({ preventScroll: false });
      const lb = this._listbox;
      const active = opts[this._activeIndex];
      if (lb && active) {
        const lbRect = lb.getBoundingClientRect();
        const oRect = active.getBoundingClientRect();
        if (oRect.bottom > lbRect.bottom) {
          active.scrollIntoView({ block: "nearest" });
        } else if (oRect.top < lbRect.top) {
          active.scrollIntoView({ block: "nearest" });
        }
      }
    }

    #commitValue(v) {
      const next = v == null ? "" : String(v);
      this._userCommitted = true;
      if (this._value === next) {
        this.#syncButtonLabel();
        this.close();
        this._btn?.focus();
        return;
      }
      this._value = next;
      this.#syncButtonLabel();
      this.#syncSelectedAria();
      this.close();
      this._btn?.focus();
      this.dispatchEvent(
        new CustomEvent("change", {
          bubbles: true,
          composed: true,
          detail: { value: this._value },
        }),
      );
    }
  }

  customElements.define("accessible-select", AccessibleSelect);
})();
