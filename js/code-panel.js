import { documentToHtmlString } from 'https://esm.sh/@contentful/rich-text-html-renderer@16.3.0'
import { escapeHtml, richTextOptions } from './contentful-rich-text-html.js'
import { CLOSE_SVG } from './icons.js'

function layoutDebugMark(name, detail) {
  window.__layoutDebugMark?.(name, detail)
}

/** Ensures at least one paint before continuing (skeleton visible on fast/cached fetches). */
function waitForPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  })
}

const ARTICLE_BODY_SKELETON_HTML = `
<div class="blog-post__skeleton" aria-hidden="true">
  <div class="blog-post__skeleton-line blog-post__skeleton-line--lg"></div>
  <div class="blog-post__skeleton-line"></div>
  <div class="blog-post__skeleton-line"></div>
  <div class="blog-post__skeleton-line"></div>
  <div class="blog-post__skeleton-line blog-post__skeleton-line--sm"></div>
</div>`

/**
 * Renders a single year or a year range from Contentful timeline / launch data.
 * Handles ISO Date strings, and plain text that includes months or ranges (e.g. "Jan 2020 – Dec 2022").
 */
function formatTimelineLabel(raw) {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null

  const fourDigitYears = s.match(/\b(19\d{2}|20\d{2})\b/g)
  if (fourDigitYears?.length) {
    const years = [...new Set(fourDigitYears.map(Number))].sort((a, b) => a - b)
    if (years.length === 1) return String(years[0])
    return `${years[0]}–${years[years.length - 1]}`
  }

  const t = Date.parse(s)
  if (!Number.isNaN(t)) {
    return String(new Date(t).getUTCFullYear())
  }

  return null
}

function setListStatus(ul, text, className = 'panel-list__status') {
  ul.replaceChildren()
  const li = document.createElement('li')
  li.className = className
  li.textContent = text
  ul.appendChild(li)
}

function renderProjectList(ul, items, emptyMessage = 'No projects yet.') {
  ul.replaceChildren()
  const fragment = document.createDocumentFragment()
  for (const item of items) {
    if (!item) continue
    const id = item.sys?.id?.trim()
    const title = item.title?.trim() || 'Untitled'
    const li = document.createElement('li')
    li.className = 'panel-list__item flex flex-row items-baseline gap-3 p-0'

    const yearStr = formatTimelineLabel(item.timelineLaunchDate)

    if (id) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'panel-list__button flex-1 min-w-0 text-left'
      btn.dataset.id = id
      btn.textContent = title
      li.appendChild(btn)
    } else {
      const titleOnly = document.createElement('span')
      titleOnly.className = 'panel-list__title-fallback flex-1 min-w-0 text-left'
      titleOnly.textContent = title
      li.appendChild(titleOnly)
    }

    if (yearStr) {
      const meta = document.createElement('p')
      meta.className = 'code-project-meta code-project-meta--list flex-shrink-0 m-0 ml-auto'
      meta.textContent = yearStr
      li.appendChild(meta)
    }

    fragment.appendChild(li)
  }
  ul.appendChild(fragment)
  if (!ul.children.length) {
    setListStatus(ul, emptyMessage)
  }
  layoutDebugMark('code:list-rendered', {
    itemCount: items.filter(Boolean).length,
  })
}

const PANEL_HTML = `
  <div id="code-panel" class="panel-scroll" aria-live="polite">
    <div id="code-projects-list-wrap" class="panel-scroll__viewport">
      <ul id="code-projects" class="panel-list"></ul>
    </div>
    <div id="code-project-article" class="panel-scroll__article" hidden>
      <button type="button" id="code-project-back" class="panel-detail__back">
        ${CLOSE_SVG}
      </button>
      <h2 id="code-project-title" class="blog-post__title"></h2>
      <p id="code-project-timeline" class="code-project-meta" hidden></p>
      <div id="code-project-hero" class="code-project__hero flex w-full" hidden></div>
      <article id="code-project-body" class="blog-post__body"></article>
    </div>
  </div>
`

class CodePanel extends HTMLElement {
  connectedCallback() {
    if (this.dataset.rendered) return
    this.dataset.rendered = ''
    this.classList.add('flex', 'flex-col', 'flex-1', 'min-h-0', 'min-w-0', 'w-full', 'max-w-full', 'overflow-hidden')
    this.innerHTML = PANEL_HTML
    this.#init()
  }

  #init() {
    const panel = document.getElementById('code-panel')
    const ul = document.getElementById('code-projects')
    const listWrap = document.getElementById('code-projects-list-wrap')
    const articleRoot = document.getElementById('code-project-article')
    const backBtn = document.getElementById('code-project-back')
    const titleEl = document.getElementById('code-project-title')
    const timelineEl = document.getElementById('code-project-timeline')
    const heroEl = document.getElementById('code-project-hero')
    const bodyEl = document.getElementById('code-project-body')

    if (
      !panel ||
      !ul ||
      !listWrap ||
      !articleRoot ||
      !backBtn ||
      !titleEl ||
      !timelineEl ||
      !heroEl ||
      !bodyEl
    ) {
      return
    }

    layoutDebugMark('code:panel-init')

    const introP = document.querySelector('.intro-line')
    const middleLine = document.querySelector('.middle-line')
    const bottomLine = document.querySelector('.bottom-line')
    const containerEl = document.querySelector('.container')

    let codeProjectListItems = []
    let introPExitHandler = null
    let bottomLineExitHandler = null

    function scrollCodePanelToTop() {
      const writesCodePanel = document.getElementById('writes-code')
      const scrollEl = writesCodePanel?.shadowRoot?.querySelector('.content')
      if (scrollEl instanceof HTMLElement) scrollEl.scrollTop = 0
      listWrap.scrollTop = 0
      articleRoot.scrollTop = 0
    }

    function showListView() {
      layoutDebugMark('code:show-list-view')
      listWrap.hidden = false
      articleRoot.hidden = true
      bodyEl.removeAttribute('aria-busy')
      bodyEl.innerHTML = ''
      titleEl.textContent = ''
      timelineEl.textContent = ''
      timelineEl.hidden = true
      heroEl.replaceChildren()
      heroEl.hidden = true
      scrollCodePanelToTop()
      if (introP) {
        if (introPExitHandler) {
          introP.removeEventListener('transitionend', introPExitHandler)
          introPExitHandler = null
        }
        introP.style.display = ''
        introP.offsetHeight
        introP.classList.remove('blog-article--exit-up')
      }
      middleLine?.classList.remove('blog-article--exit-down')
      if (bottomLine) {
        if (bottomLineExitHandler) {
          bottomLine.removeEventListener('transitionend', bottomLineExitHandler)
          bottomLineExitHandler = null
        }
        bottomLine.style.display = ''
        bottomLine.offsetHeight
        bottomLine.classList.remove('blog-article--exit-down')
      }
      document.getElementById('writes-code')?.classList.remove('code-panel--article')
      containerEl?.classList.remove('article-open')
    }

    function showArticleView() {
      layoutDebugMark('code:show-article-view')
      listWrap.hidden = true
      articleRoot.hidden = false
      scrollCodePanelToTop()
      backBtn.focus({ preventScroll: true })
      middleLine?.classList.add('blog-article--exit-down')
      bottomLine?.classList.add('blog-article--exit-down')
      document.getElementById('writes-code')?.classList.add('code-panel--article')
      containerEl?.classList.add('article-open')
      if (introP) {
        if (introPExitHandler) introP.removeEventListener('transitionend', introPExitHandler)
        introP.classList.add('blog-article--exit-up')
        introPExitHandler = (e) => {
          if (e.propertyName !== 'transform' || e.target !== introP) return
          introP.removeEventListener('transitionend', introPExitHandler)
          introPExitHandler = null
          introP.style.display = 'none'
        }
        introP.addEventListener('transitionend', introPExitHandler)
      }
      if (bottomLine) {
        if (bottomLineExitHandler) bottomLine.removeEventListener('transitionend', bottomLineExitHandler)
        bottomLineExitHandler = (e) => {
          if (e.propertyName !== 'transform' || e.target !== bottomLine) return
          bottomLine.removeEventListener('transitionend', bottomLineExitHandler)
          bottomLineExitHandler = null
          bottomLine.style.display = 'none'
        }
        bottomLine.addEventListener('transitionend', bottomLineExitHandler)
      }
    }

    async function openProjectById(id) {
      if (!id) return

      layoutDebugMark('code:open-project-start', { id })
      showArticleView()

      bodyEl.innerHTML = ARTICLE_BODY_SKELETON_HTML
      bodyEl.setAttribute('aria-busy', 'true')

      const snapshot = codeProjectListItems.find((i) => i?.sys?.id === id)

      if (snapshot) {
        titleEl.textContent = snapshot.title?.trim() || 'Untitled'
      } else {
        titleEl.textContent = 'Loading…'
      }

      await waitForPaint()

      const { data, errors } = await window.contentfulRequest(
        window.GET_CODE_PROJECT_BY_ID_QUERY,
        { id },
      )

      layoutDebugMark('code:open-project-fetch-done', {
        ok: !errors?.length,
        hasItem: Boolean(data?.codeProjectCollection?.items?.[0]),
      })

      if (errors?.length) {
        const first = errors[0]?.message || 'Could not load project.'
        titleEl.textContent = ''
        timelineEl.textContent = ''
        timelineEl.hidden = true
        bodyEl.removeAttribute('aria-busy')
        bodyEl.innerHTML = `<p class="blog-post__error">${escapeHtml(first)}</p>`
        heroEl.replaceChildren()
        heroEl.hidden = true
        return
      }

      const item = data?.codeProjectCollection?.items?.[0]
      if (!item) {
        titleEl.textContent = ''
        timelineEl.textContent = ''
        timelineEl.hidden = true
        bodyEl.removeAttribute('aria-busy')
        bodyEl.innerHTML = '<p class="blog-post__error">Project not found.</p>'
        heroEl.replaceChildren()
        heroEl.hidden = true
        return
      }

      const t = item.title?.trim() || 'Untitled'
      titleEl.textContent = t

      const yearStr = formatTimelineLabel(item.timelineLaunchDate)
      if (yearStr) {
        timelineEl.textContent = yearStr
        timelineEl.hidden = false
      } else {
        timelineEl.textContent = ''
        timelineEl.hidden = true
      }

      heroEl.replaceChildren()
      const imgFields = item.image
      if (imgFields?.url) {
        const fig = document.createElement('figure')
        fig.className = 'code-project__figure w-full'
        const img = document.createElement('img')
        img.src = imgFields.url
        img.alt = (imgFields.title || '').trim() || ''
        img.loading = 'lazy'
        img.className = 'block mx-auto h-auto'
        fig.appendChild(img)
        heroEl.appendChild(fig)
        heroEl.hidden = false
      } else {
        heroEl.hidden = true
      }

      const json = item.description?.json
      const links = item.description?.links

      if (!json) {
        bodyEl.removeAttribute('aria-busy')
        bodyEl.innerHTML =
          '<p class="blog-post__empty">No description for this project yet.</p>'
        return
      }

      try {
        const html = documentToHtmlString(json, richTextOptions(links))
        bodyEl.removeAttribute('aria-busy')
        bodyEl.innerHTML = html
        layoutDebugMark('code:article-body-set', { htmlLength: html.length })
      } catch (e) {
        console.warn(e)
        bodyEl.removeAttribute('aria-busy')
        bodyEl.innerHTML =
          '<p class="blog-post__error">Could not render this project.</p>'
      }
    }

    panel.addEventListener('click', (ev) => {
      const t = ev.target
      if (!(t instanceof HTMLElement)) return

      const projectBtn = t.closest('[data-id].panel-list__button')
      if (projectBtn instanceof HTMLElement) {
        const id = projectBtn.dataset.id?.trim()
        if (id) {
          ev.preventDefault()
          openProjectById(id)
        }
        return
      }

      const postBtn = t.closest(
        '[data-handle].blog-post__embed-btn, [data-handle].blog-post__inline-entry, [data-handle].blog-post__embed-inline-btn',
      )
      if (postBtn instanceof HTMLElement) {
        const handle = postBtn.dataset.handle?.trim()
        if (handle) {
          ev.preventDefault()
          window.__openBlogPostByHandle?.(handle)
        }
      }
    })

    backBtn.addEventListener('click', () => {
      layoutDebugMark('code:back-click')
      showListView()
    })

    document.addEventListener('dropdown:state-changed', () => {
      const codeDropdown = document.getElementById('writes-code')
      if (codeDropdown?.open) showListView()
    })

    document.addEventListener('dropdown:state-changed', () => {
      const codeDropdown = document.getElementById('writes-code')
      if (codeDropdown && !codeDropdown.open) {
        if (introP) {
          if (introPExitHandler) {
            introP.removeEventListener('transitionend', introPExitHandler)
            introPExitHandler = null
          }
          introP.style.display = ''
          introP.offsetHeight
          introP.classList.remove('blog-article--exit-up')
        }
        middleLine?.classList.remove('blog-article--exit-down')
        if (bottomLine) {
          if (bottomLineExitHandler) {
            bottomLine.removeEventListener('transitionend', bottomLineExitHandler)
            bottomLineExitHandler = null
          }
          bottomLine.style.display = ''
          bottomLine.offsetHeight
          bottomLine.classList.remove('blog-article--exit-down')
        }
        codeDropdown.classList.remove('code-panel--article')
        containerEl?.classList.remove('article-open')
      }
    })
    ;(async () => {
      layoutDebugMark('code:list-fetch-start')
      setListStatus(
        ul,
        'Loading…',
        'panel-list__status panel-list__status--loading',
      )

      const { items: fetchedItems, errors } =
        await window.fetchAllCodeProjects()

      layoutDebugMark('code:list-fetch-done', { ok: !errors?.length })

      if (errors?.length) {
        const first = errors[0]?.message || 'Could not load projects.'
        setListStatus(ul, first, 'panel-list__status panel-list__status--error')
        return
      }

      codeProjectListItems = fetchedItems ?? []
      renderProjectList(ul, codeProjectListItems)
    })()
  }
}

customElements.define('code-panel', CodePanel)
