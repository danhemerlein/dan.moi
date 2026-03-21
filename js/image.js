(() => {
  class MoiImage extends HTMLElement {
    static get observedAttributes() {
      return ["src", "alt", "width", "height", "loading", "decoding"];
    }

    constructor() {
      super();

      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            align-self: center; /* centers within flex cross-axis */
          }

          img {
            display: block;
            margin-left: auto;
            margin-right: auto;
            max-width: 100%;
            height: auto;
          }

          :host(.image-dock) {
            margin-top: 0;
            align-self: unset;
          }
          :host(.image-dock) img {
            width: 80px;
            height: 80px;
            max-width: none;
            object-fit: contain;
            margin-left: 0;
            margin-right: 0;
          }
        </style>
        <img part="img" />
      `;

      this._img = this.shadowRoot.querySelector("img");
    }

    connectedCallback() {
      this.#sync();
    }

    attributeChangedCallback() {
      this.#sync();
    }

    #sync() {
      const src = this.getAttribute("src");
      const alt = this.getAttribute("alt") ?? "";

      if (src) this._img.src = src;
      else this._img.removeAttribute("src");

      this._img.alt = alt;

      const width = this.getAttribute("width");
      if (width !== null) this._img.style.width = width;
      else this._img.style.removeProperty("width");

      const height = this.getAttribute("height");
      if (height !== null) this._img.style.height = height;
      else this._img.style.removeProperty("height");

      // Pass through common loading hints if provided.
      for (const attr of ["loading", "decoding"]) {
        if (this.hasAttribute(attr)) {
          this._img.setAttribute(attr, this.getAttribute(attr));
        } else {
          this._img.removeAttribute(attr);
        }
      }
    }
  }

  customElements.define("image-element", MoiImage);
})();
