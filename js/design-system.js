;(() => {
  class DsColorSwatch extends HTMLElement {
    connectedCallback() {
      const token = this.getAttribute('token')
      const value = this.getAttribute('value')

      this.classList.add('ds-swatch', 'flex', 'flex-col', 'gap-1')
      this.style.setProperty('--swatch-color', `var(--color-${token})`)

      this.innerHTML = `
        <div class="ds-swatch__preview"></div>
        <p class="ds-swatch__name type-label">--color-${token}</p>
        <p class="ds-swatch__value type-label">${value}</p>
      `
    }
  }

  customElements.define('ds-color-swatch', DsColorSwatch)
})()
