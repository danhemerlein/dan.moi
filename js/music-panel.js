import { STREAMING_LINKS, MONTH_ABBREV_EN, FULL_MONTH_TO_ABBREV_EN } from './constants.js'

function abbreviateEnglishMonthNames(str) {
  let out = str
  for (const [full, abbr] of FULL_MONTH_TO_ABBREV_EN) {
    out = out.replace(new RegExp(`\\b${full}\\b`, 'gi'), abbr)
  }
  return out
}

function setListStatus(ul, text, className = 'm-0') {
  ul.replaceChildren()
  const li = document.createElement('li')
  li.className = className
  li.textContent = text
  ul.appendChild(li)
}

function formatReleaseLabel(raw) {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null
  const t = Date.parse(s)
  let display
  if (!Number.isNaN(t)) {
    const d = new Date(t)
    const mon = MONTH_ABBREV_EN[d.getMonth()]
    const day = d.getDate()
    const year = d.getFullYear()
    display = `${mon} ${day} ${year}`
  } else {
    display = s
  }
  return abbreviateEnglishMonthNames(display).replace(/,/g, '')
}

function formatCredits(item) {
  const parts = []
  if (item.performed) parts.push('Performed')
  if (item.produced) parts.push('Produced')
  if (item.wrote) parts.push('Wrote')
  return parts.length ? parts : null
}

function artistNameOnly(item) {
  const artist = item.artist?.trim()
  return artist || null
}

function safeStreamingHref(raw) {
  const u = String(raw ?? '').trim()
  if (!u) return null
  if (/^https?:\/\//i.test(u)) return u
  return null
}

function renderMusicList(ul, items, emptyMessage = 'No music projects yet.') {
  ul.replaceChildren()
  const fragment = document.createDocumentFragment()

  for (const item of items) {
    if (!item) continue
    const title = item.title?.trim() || 'Untitled'
    const li = document.createElement('li')
    li.className = 'panel-list__item music-project'

    const shell = document.createElement('div')
    shell.className = 'music-project__shell flex flex-col gap-3 min-w-0'

    const top = document.createElement('div')
    top.className = 'music-project__top flex gap-3'

    const art = item.artwork
    if (art?.url) {
      const media = document.createElement('div')
      media.className = 'music-project__media flex-shrink-0 overflow-hidden'
      const img = document.createElement('img')
      img.className = 'music-project__art block w-full h-full'
      img.src = art.url
      img.alt = (art.title || '').trim() || ''
      img.loading = 'lazy'
      img.decoding = 'async'
      media.appendChild(img)
      top.appendChild(media)
    }

    const topText = document.createElement('div')
    topText.className = 'music-project__top-text flex flex-col'

    const titleGroup = document.createElement('div')
    titleGroup.className = 'music-project__title-group flex items-center'

    const titleEl = document.createElement('p')
    titleEl.className = 'music-project__title m-0 font-normal'
    titleEl.textContent = title
    titleGroup.appendChild(titleEl)

    const dateStr = formatReleaseLabel(item.releaseDate)
    if (dateStr) {
      const dateDesktop = document.createElement('p')
      dateDesktop.className =
        'music-project__date music-project__date--desktop hidden lg-block m-0 font-style-normal font-normal uppercase ml-auto text-right'
      dateDesktop.textContent = dateStr
      titleGroup.appendChild(dateDesktop)
    }

    topText.appendChild(titleGroup)

    const artistName = artistNameOnly(item)
    if (artistName) {
      const meta = document.createElement('p')
      meta.className = 'music-project__meta font-style-normal font-normal'
      meta.textContent = artistName
      topText.appendChild(meta)
    }

    top.appendChild(topText)
    shell.appendChild(top)

    const credits = formatCredits(item)
    const linkParts = []
    for (const [key, label] of STREAMING_LINKS) {
      const raw = item[key]
      const href = typeof raw === 'string' ? safeStreamingHref(raw) : null
      if (href) linkParts.push({ href, label })
    }

    if (dateStr || credits || linkParts.length) {
      const bottom = document.createElement('div')
      bottom.className = 'music-project__bottom flex flex-col gap-2 lg-flex-row'

      if (dateStr) {
        const dateMobile = document.createElement('p')
        dateMobile.className =
          'music-project__date music-project__date--mobile m-0 font-style-normal font-normal uppercase lg-hidden'
        dateMobile.textContent = dateStr
        bottom.appendChild(dateMobile)
      }

      if (linkParts.length) {
        const linksWrap = document.createElement('div')
        linksWrap.className = 'music-project__links flex flex-wrap items-center'
        linkParts.forEach((part, i) => {
          if (i > 0) {
            const sep = document.createElement('span')
            sep.className = 'music-project__links-sep'
            sep.setAttribute('aria-hidden', 'true')
            sep.textContent = '·'
            linksWrap.appendChild(sep)
          }
          const a = document.createElement('a')
          a.className = 'music-project__link lowercase'
          a.href = part.href
          a.target = '_blank'
          a.rel = 'noopener noreferrer'
          a.textContent = part.label
          linksWrap.appendChild(a)
        })
        bottom.appendChild(linksWrap)
      }

      if (credits) {
        const cred = document.createElement('p')
        cred.className = 'music-project__credits m-0 flex gap-1'
        for (const part of credits) {
          const span = document.createElement('span')
          span.className =
            'music-project__credit font-style-normal font-normal uppercase'
          span.textContent = part
          cred.appendChild(span)
        }
        bottom.appendChild(cred)
      }

      shell.appendChild(bottom)
    }

    li.appendChild(shell)
    fragment.appendChild(li)
  }

  ul.appendChild(fragment)
  if (!ul.children.length) {
    setListStatus(ul, emptyMessage)
  }
}

const PANEL_HTML = `
  <div id="music-panel" class="panel-scroll flex flex-1 flex-col gap-0 w-full max-w-full min-w-0 min-h-0 overflow-hidden" aria-live="polite">
    <div id="music-projects-list-wrap" class="panel-scroll__viewport flex-1 min-h-0">
      <ul id="music-projects" class="panel-list mt-2 m-0 p-0 flex flex-col gap-3"></ul>
    </div>
  </div>
`

class MusicPanel extends HTMLElement {
  #initialized = false

  connectedCallback() {
    if (this.#initialized) return
    this.#initialized = true
    this.classList.add(
      'flex',
      'flex-col',
      'flex-1',
      'min-h-0',
      'min-w-0',
      'w-full',
      'max-w-full',
      'overflow-hidden',
    )
    this.innerHTML = PANEL_HTML
    this.#init()
  }

  #init() {
    const ul = this.querySelector('#music-projects')
    if (!ul) return
    ;(async () => {
      setListStatus(ul, 'Loading…', 'm-0')

      const { items: fetchedItems, errors } =
        await window.fetchAllMusicProjects()

      if (errors?.length) {
        const first = errors[0]?.message || 'Could not load music projects.'
        setListStatus(ul, first, 'font-style-normal m-0')
        return
      }

      renderMusicList(ul, fetchedItems ?? [])
    })()
  }
}

customElements.define('music-panel', MusicPanel)
