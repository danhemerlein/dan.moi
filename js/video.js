;(() => {
  const PAUSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <rect x="5" y="3" width="4" height="18" rx="1" fill="currentColor"/>
    <rect x="15" y="3" width="4" height="18" rx="1" fill="currentColor"/>
  </svg>`

  const PLAY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <polygon points="5,3 19,12 5,21" fill="currentColor"/>
  </svg>`

  // Safari decodes VP9 WebM but ignores the alpha track; use canvas compositing instead.
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

  const STYLE = `
    :host { display: block; align-self: center; position: relative; }
    :host(.image-dock) { margin-top: 0; align-self: unset; }
    video, canvas {
      display: block;
      margin-left: auto;
      margin-right: auto;
      max-width: 100%;
      height: auto;
    }
    :host(.image-dock) video,
    :host(.image-dock) canvas {
      width: 80px;
      height: 80px;
      max-width: none;
      object-fit: contain;
      margin-left: 0;
      margin-right: 0;
    }
    button {
      display: none;
      position: absolute;
      bottom: 0.5rem;
      right: 0.5rem;
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.25rem;
      line-height: 0;
      color: var(--color-ink);
    }
    :host([show-controls]) button { display: block; }
    button svg { display: block; width: 1.25rem; height: 1.25rem; }
    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0;
      margin: -1px; overflow: hidden; clip: rect(0,0,0,0);
      white-space: nowrap; border: 0;
    }
  `

  class MoiVideo extends HTMLElement {
    static get observedAttributes() { return ['src', 'description'] }

    constructor() {
      super()
      this.attachShadow({ mode: 'open' })
      this._rafId = null

      if (isSafari) {
        this.shadowRoot.innerHTML = `
          <style>${STYLE}</style>
          <span class="sr-only"></span>
          <canvas part="video" aria-hidden="true"></canvas>
          <video muted loop playsinline style="display:none"></video>
          <button type="button" aria-label="Pause video">${PAUSE_ICON}</button>
        `
        this._canvas = this.shadowRoot.querySelector('canvas')
        this._video  = this.shadowRoot.querySelector('video')

        this._video.addEventListener('loadedmetadata', () => {
          this._halfW = this._video.videoWidth / 2
          this._vidH  = this._video.videoHeight
          this._canvas.width  = this._halfW
          this._canvas.height = this._vidH
          this._ctx = this._canvas.getContext('2d')
        })

        this._video.addEventListener('play', () => this.#kick())
        this._video.addEventListener('seeked', () => this.#drawOnce())
      } else {
        this.shadowRoot.innerHTML = `
          <style>${STYLE}</style>
          <span class="sr-only"></span>
          <video part="video" muted loop autoplay playsinline aria-hidden="true"></video>
          <button type="button" aria-label="Pause video">${PAUSE_ICON}</button>
        `
        this._video = this.shadowRoot.querySelector('video')
      }

      this._srOnly = this.shadowRoot.querySelector('.sr-only')
      this._btn    = this.shadowRoot.querySelector('button')

      this._btn.addEventListener('click', () => {
        const next = this._video.paused
        document.querySelectorAll('video-element').forEach(el => el.setPlaying(next))
        this._btn.innerHTML = next ? PAUSE_ICON : PLAY_ICON
        this._btn.setAttribute('aria-label', next ? 'Pause video' : 'Play video')
      })
    }

    connectedCallback()            { this.#syncSrc(); this.#syncDescription() }
    attributeChangedCallback()     { this.#syncSrc(); this.#syncDescription() }

    setPlaying(playing) {
      playing ? this._video.play() : this._video.pause()
    }

    #syncSrc() {
      const src = this.getAttribute('src')
      if (isSafari) {
        const split = src ? src.replace(/\.webm$/, '_split.webm') : ''
        if (this._video.src !== split) {
          this._video.src = split
          if (split) this._video.play().catch(() => {})
        }
      } else {
        if (src) this._video.src = src
        else this._video.removeAttribute('src')
      }
    }

    #syncDescription() {
      this._srOnly.textContent = this.getAttribute('description') ?? ''
    }

    // Start the render loop
    #kick() {
      if (this._rafId) return
      this._rafId = requestAnimationFrame(() => this.#render())
    }

    // Draw a single frame (used when paused/seeked)
    #drawOnce() {
      if (this._ctx && this._video.readyState >= 2) this.#composite()
    }

    #render() {
      this._rafId = null
      if (this._ctx && this._video.readyState >= 2) this.#composite()
      if (!this._video.paused && !this._video.ended) {
        this._rafId = requestAnimationFrame(() => this.#render())
      }
    }

    #composite() {
      const { _ctx: ctx, _video: v, _halfW: hw, _vidH: vh } = this

      ctx.drawImage(v, 0, 0, hw, vh, 0, 0, hw, vh)
      const colorData = ctx.getImageData(0, 0, hw, vh)

      // right half is a grayscale mask: white=opaque, black=transparent
      ctx.drawImage(v, hw, 0, hw, vh, 0, 0, hw, vh)
      const alphaData = ctx.getImageData(0, 0, hw, vh)

      for (let i = 0; i < colorData.data.length; i += 4) {
        colorData.data[i + 3] = alphaData.data[i]
      }
      ctx.putImageData(colorData, 0, 0)
    }
  }

  customElements.define('video-element', MoiVideo)
})()
