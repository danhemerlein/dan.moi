;(() => {
  const PAUSE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <rect x="5" y="3" width="4" height="18" rx="1" fill="#1b1b1b"/>
    <rect x="15" y="3" width="4" height="18" rx="1" fill="#1b1b1b"/>
  </svg>`

  const PLAY_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <polygon points="5,3 19,12 5,21" fill="#1b1b1b"/>
  </svg>`

  class MoiVideo extends HTMLElement {
    static get observedAttributes() {
      return ['src']
    }

    constructor() {
      super()
      this.attachShadow({ mode: 'open' })
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            align-self: center;
            position: relative;
          }

          :host(.image-dock) {
            margin-top: 0;
            align-self: unset;
          }

          video {
            display: block;
            margin-left: auto;
            margin-right: auto;
            max-width: 100%;
            height: auto;
          }

          :host(.image-dock) video {
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
          }

          :host([show-controls]) button {
            display: block;
          }

          button svg {
            display: block;
            width: 1.25rem;
            height: 1.25rem;
          }
        </style>
        <video part="video" muted loop autoplay playsinline></video>
        <button type="button" aria-label="Pause video">${PAUSE_ICON}</button>
      `

      this._video = this.shadowRoot.querySelector('video')
      this._btn = this.shadowRoot.querySelector('button')
      this._playing = true

      this._btn.addEventListener('click', () => {
        const next = !this._playing
        document
          .querySelectorAll('video-element')
          .forEach((el) => el.setPlaying(next))
        this._btn.innerHTML = next ? PAUSE_ICON : PLAY_ICON
        this._btn.setAttribute(
          'aria-label',
          next ? 'Pause video' : 'Play video',
        )
      })
    }

    connectedCallback() {
      this.#syncSrc()
    }

    attributeChangedCallback() {
      this.#syncSrc()
    }

    setPlaying(playing) {
      this._playing = playing
      playing ? this._video.play() : this._video.pause()
    }

    #syncSrc() {
      const src = this.getAttribute('src')
      if (src) this._video.src = src
      else this._video.removeAttribute('src')
    }
  }

  customElements.define('video-element', MoiVideo)
})()
