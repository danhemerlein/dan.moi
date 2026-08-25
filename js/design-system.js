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

  const navToggle = document.querySelector('.ds-nav__toggle')
  const navList = document.getElementById('ds-nav-list')

  if (navToggle && navList) {
    navToggle.addEventListener('click', () => {
      const isOpen = navToggle.getAttribute('aria-expanded') === 'true'
      navToggle.setAttribute('aria-expanded', String(!isOpen))
      navList.hidden = isOpen
    })

    navList.addEventListener('click', (e) => {
      if (!(e.target instanceof HTMLElement) || !e.target.closest('a')) return
      if (window.matchMedia('(min-width: 768px)').matches) return
      navToggle.setAttribute('aria-expanded', 'false')
      navList.hidden = true
    })
  }
})()
