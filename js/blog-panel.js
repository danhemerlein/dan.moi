import { documentToHtmlString } from 'https://esm.sh/@contentful/rich-text-html-renderer@16.3.0'
import { escapeHtml, richTextOptions } from './contentful-rich-text-html.js'
import { createBlogPostMetaElement } from './blog-utils.js'
import { CLOSE_SVG, ARTICLE_BODY_SKELETON_HTML } from './constants.js'

function layoutDebugMark(name, detail) {
  window.__layoutDebugMark?.(name, detail)
}

function layoutDebugSnapshot(label) {
  window.__layoutDebugSnapshot?.(label)
}

function waitForPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  })
}

function getYearFromPublished(published) {
  if (!published) return null
  const d = new Date(published)
  if (Number.isNaN(d.getTime())) return null
  return d.getFullYear()
}

function yearBoundsFromPosts(items) {
  let minY = Infinity
  let maxY = -Infinity
  for (const item of items) {
    const y = getYearFromPublished(item?.published)
    if (y == null) continue
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  if (!Number.isFinite(minY)) return { min: null, max: null }
  return { min: minY, max: maxY }
}

function buildYearFilterOptions(minY, maxY) {
  const opts = [{ value: '', label: 'ALL' }]
  if (minY == null || maxY == null) return opts
  for (let y = maxY; y >= minY; y--) {
    opts.push({ value: String(y), label: String(y) })
  }
  return opts
}

function filterPostsByYear(items, yearStr) {
  if (!yearStr) return items
  const y = Number(yearStr)
  if (Number.isNaN(y)) return items
  return items.filter((i) => getYearFromPublished(i?.published) === y)
}

const BLOG_LIST_PAGE_SIZE = 20

function formatPostCount(n) {
  const k = Math.max(0, Math.floor(Number(n)) || 0)
  return `${k} ${k === 1 ? 'post' : 'posts'}`
}

function setListStatus(ul, text, className = 'm-0') {
  ul.replaceChildren()
  const li = document.createElement('li')
  li.className = className
  li.textContent = text
  ul.appendChild(li)
}

function renderPostList(ul, items, emptyMessage = 'No posts yet.') {
  ul.replaceChildren()
  const fragment = document.createDocumentFragment()
  for (const item of items) {
    if (!item) continue
    const title = item.title?.trim() || 'Untitled'
    const handle = item.handle?.trim()
    const li = document.createElement('li')
    li.className = 'panel-list__item'
    if (handle) {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className =
        'panel-list__button cursor-pointer block w-full m-0 p-0 font-style-normal font-normal text-left'
      btn.dataset.handle = handle
      btn.textContent = title
      li.appendChild(btn)
    } else {
      const titleOnly = document.createElement('span')
      titleOnly.className = 'panel-list__title-fallback block'
      titleOnly.textContent = title
      li.appendChild(titleOnly)
    }

    li.appendChild(
      createBlogPostMetaElement({
        published: item.published,
        contentJson: item.content?.json,
        variant: 'list',
      }),
    )
    fragment.appendChild(li)
  }
  ul.appendChild(fragment)
  if (!ul.children.length) {
    setListStatus(ul, emptyMessage)
  }
  layoutDebugMark('blog:list-rendered', {
    itemCount: items.filter(Boolean).length,
  })
}

const PANEL_HTML = `
  <div id="blog-panel" class="panel-scroll flex flex-1 flex-col gap-0 w-full max-w-full min-w-0 min-h-0 overflow-hidden" aria-live="polite">
    <accessible-select
      id="blog-year-filter"
      class="blog-year-filter flex-shrink-0 w-full max-w-full min-w-0 type-roboto-mono-12-caps"
      hidden
      placeholder="YEAR"
      aria-label="Filter posts by year published"
    ></accessible-select>
    <div id="blog-posts-list-wrap" class="panel-scroll__viewport flex-1 min-h-0">
      <ul id="blog-posts" class="panel-list mt-2 list-none m-0 p-0 flex flex-col gap-3"></ul>
      <div
        id="blog-posts-load-sentinel"
        class="panel-scroll__load-sentinel flex-shrink-0 w-full m-0 p-0 pointer-events-none"
        hidden
        aria-hidden="true"
      ></div>
    </div>
    <div
      id="blog-posts-list-footer"
      class="panel-scroll__list-footer"
      hidden
    >
      <p
        id="blog-posts-page-status"
        class="panel-scroll__list-footer__status uppercase m-0"
      ></p>
    </div>
    <div id="blog-post-article-wrap" class="panel-scroll__article-wrap relative flex flex-col flex-1 min-h-0" hidden>
      <div id="blog-post-article" class="panel-scroll__article flex flex-col flex-1 min-h-0">
        <button
          type="button"
          id="blog-post-back"
          class="panel-detail__back cursor-pointer"
        >
          ${CLOSE_SVG}
        </button>
        <h2 id="blog-post-title" class="article-title"></h2>
        <div id="blog-post-meta" hidden></div>
        <article
          id="blog-post-body"
          class="article-body"
        ></article>
      </div>
      <div class="panel-scroll__custom-bar-thumb" aria-hidden="true"></div>
    </div>
  </div>
`

class BlogPanel extends HTMLElement {
  connectedCallback() {
    if (this.dataset.rendered) return
    this.dataset.rendered = ''
    this.innerHTML = PANEL_HTML
    this.#init()
  }

  #init() {
    const panel = this.querySelector('#blog-panel')
    const ul = this.querySelector('#blog-posts')
    const yearFilterEl = this.querySelector('#blog-year-filter')
    const listFooter = this.querySelector('#blog-posts-list-footer')
    const pageStatusEl = this.querySelector('#blog-posts-page-status')
    const loadSentinel = this.querySelector('#blog-posts-load-sentinel')
    const listWrap = this.querySelector('#blog-posts-list-wrap')
    const articleWrap = this.querySelector('#blog-post-article-wrap')
    const articleRoot = this.querySelector('#blog-post-article')
    const backBtn = this.querySelector('#blog-post-back')
    const titleEl = this.querySelector('#blog-post-title')
    const metaEl = this.querySelector('#blog-post-meta')
    const bodyEl = this.querySelector('#blog-post-body')
    const scrollbarThumb = this.querySelector('.panel-scroll__custom-bar-thumb')

    const introP = document.querySelector('.intro-line')
    const middleLine = document.querySelector('.middle-line')
    const bottomLine = document.querySelector('.bottom-line')
    const containerEl = document.querySelector('.container')

    if (
      !panel ||
      !ul ||
      !listWrap ||
      !articleWrap ||
      !articleRoot ||
      !backBtn ||
      !titleEl ||
      !metaEl ||
      !bodyEl
    ) {
      return
    }

    layoutDebugMark('blog:panel-init')

    let thumbH = 0
    let cachedTrackStart = 0
    let cachedTrackEnd = 0
    let thumbCurrentPos = 0
    let thumbTargetPos = 0
    let thumbRafId = null

    // Reflow-safe: reads layout only here, never inside the scroll handler.
    function recomputeTrack() {
      if (!thumbH) thumbH = scrollbarThumb.offsetHeight
      const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize)
      const bottomPad = window.matchMedia('(min-width: 768px)').matches
        ? 2 * remPx
        : 1 * remPx
      cachedTrackStart = bodyEl.offsetTop
      cachedTrackEnd = articleRoot.clientHeight - thumbH - bottomPad
    }

    function tickThumb() {
      thumbCurrentPos += (thumbTargetPos - thumbCurrentPos) * 0.12
      scrollbarThumb.style.transform = `translateY(${Math.round(thumbCurrentPos)}px)`
      if (Math.abs(thumbTargetPos - thumbCurrentPos) > 0.5) {
        thumbRafId = requestAnimationFrame(tickThumb)
      } else {
        thumbCurrentPos = thumbTargetPos
        scrollbarThumb.style.transform = `translateY(${Math.round(thumbCurrentPos)}px)`
        thumbRafId = null
      }
    }

    function updateScrollbar() {
      if (!scrollbarThumb) return
      if (articleWrap.hidden) {
        if (scrollbarThumb.style.display !== 'none') scrollbarThumb.style.display = 'none'
        if (thumbRafId !== null) { cancelAnimationFrame(thumbRafId); thumbRafId = null }
        return
      }
      const { scrollTop, scrollHeight, clientHeight } = articleRoot
      if (scrollHeight <= clientHeight) {
        if (scrollbarThumb.style.display !== 'none') scrollbarThumb.style.display = 'none'
        return
      }
      // Only touch display when state actually changes to avoid dirtying layout.
      const wasHidden = scrollbarThumb.style.display !== 'block'
      if (wasHidden) scrollbarThumb.style.display = 'block'
      // Measure after making visible; skip on every subsequent scroll tick.
      if (wasHidden || !thumbH) recomputeTrack()
      const maxScroll = scrollHeight - clientHeight
      const fraction = maxScroll > 0 ? Math.max(0, Math.min(1, scrollTop / maxScroll)) : 0
      const range = Math.max(0, cachedTrackEnd - cachedTrackStart)
      thumbTargetPos = cachedTrackStart + fraction * range
      if (wasHidden) {
        // snap to position on first show — no glide from zero
        thumbCurrentPos = thumbTargetPos
        scrollbarThumb.style.transform = `translateY(${Math.round(thumbCurrentPos)}px)`
      } else if (thumbRafId === null) {
        thumbRafId = requestAnimationFrame(tickThumb)
      }
    }

    articleRoot.addEventListener('scroll', updateScrollbar, { passive: true })

    const ro = new ResizeObserver(() => {
      thumbH = 0 // invalidate cache so recomputeTrack() re-measures
      updateScrollbar()
    })
    ro.observe(articleRoot)
    ro.observe(bodyEl)

    let blogPostListItems = []
    let yearFilterReady = false
    let introPExitHandler = null
    let bottomLineExitHandler = null
    let visibleCount = BLOG_LIST_PAGE_SIZE

    function getYearFilterValue() {
      if (!yearFilterEl) return ''
      return yearFilterEl.value ?? ''
    }

    function updateListFooterAndSentinel(
      yearStr,
      total,
      toShow,
      sliceForDisplay,
    ) {
      if (loadSentinel) {
        const needMore =
          !yearStr && total > 0 && toShow < total && sliceForDisplay.length > 0
        loadSentinel.hidden = !needMore
      }

      if (!listFooter || !pageStatusEl) return

      if (total === 0) {
        if (yearStr) {
          listFooter.hidden = !articleWrap.hidden
          pageStatusEl.textContent = `${formatPostCount(0)} in ${yearStr}`
        } else {
          listFooter.hidden = true
          pageStatusEl.textContent = ''
        }
        return
      }

      listFooter.hidden = !articleWrap.hidden

      if (yearStr) {
        pageStatusEl.textContent = `${formatPostCount(total)} in ${yearStr}`
        return
      }

      pageStatusEl.textContent = `Showing ${toShow} of ${total}`
    }

    let listLoadObserver = null
    if (loadSentinel && listWrap) {
      listLoadObserver = new IntersectionObserver(
        (entries) => {
          const e = entries[0]
          if (!e?.isIntersecting) return
          if (getYearFilterValue()) return
          const filtered = filterPostsByYear(blogPostListItems, '')
          const total = filtered.length
          if (visibleCount >= total) return
          visibleCount = Math.min(visibleCount + BLOG_LIST_PAGE_SIZE, total)
          refreshBlogList()
        },
        { root: listWrap, rootMargin: '120px', threshold: 0 },
      )
    }

    function refreshBlogList() {
      const yearStr = getYearFilterValue()
      const filtered = filterPostsByYear(blogPostListItems, yearStr)
      const total = filtered.length

      let pageItems
      let toShow

      if (yearStr) {
        pageItems = filtered
        toShow = total
      } else {
        toShow = Math.min(visibleCount, total)
        pageItems = filtered.slice(0, toShow)
      }

      const emptyMessage =
        total === 0
          ? yearStr
            ? 'No posts for this year.'
            : 'No posts yet.'
          : 'No posts yet.'

      renderPostList(ul, pageItems, emptyMessage)
      updateListFooterAndSentinel(yearStr, total, toShow, pageItems)

      if (listLoadObserver && loadSentinel) {
        listLoadObserver.disconnect()
        if (!loadSentinel.hidden) {
          listLoadObserver.observe(loadSentinel)
        }
      }
    }

    function scrollBlogPanelToTop() {
      const blogDropdown = document.getElementById('blog')
      const scrollEl = blogDropdown?.shadowRoot?.querySelector('.content')
      if (scrollEl instanceof HTMLElement) scrollEl.scrollTop = 0
      listWrap.scrollTop = 0
      articleRoot.scrollTop = 0
    }

    function showListView() {
      layoutDebugMark('blog:show-list-view')
      listWrap.hidden = false
      articleWrap.hidden = true
      bodyEl.removeAttribute('aria-busy')
      bodyEl.innerHTML = ''
      titleEl.textContent = ''
      metaEl.replaceChildren()
      metaEl.hidden = true
      if (yearFilterEl && yearFilterReady) yearFilterEl.hidden = false
      if (blogPostListItems.length) refreshBlogList()
      scrollBlogPanelToTop()
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
      document.getElementById('blog')?.classList.remove('blog-panel--article')
      containerEl?.classList.remove('article-open')
    }

    function showArticleView() {
      layoutDebugMark('blog:show-article-view')
      listWrap.hidden = true
      articleWrap.hidden = false
      if (yearFilterEl) yearFilterEl.hidden = true
      if (listFooter) listFooter.hidden = true
      scrollBlogPanelToTop()
      backBtn.focus({ preventScroll: true })
      middleLine?.classList.add('blog-article--exit-down')
      bottomLine?.classList.add('blog-article--exit-down')
      document.getElementById('blog')?.classList.add('blog-panel--article')
      containerEl?.classList.add('article-open')
      if (introP) {
        if (introPExitHandler)
          introP.removeEventListener('transitionend', introPExitHandler)
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
        if (bottomLineExitHandler)
          bottomLine.removeEventListener('transitionend', bottomLineExitHandler)
        bottomLineExitHandler = (e) => {
          if (e.propertyName !== 'transform' || e.target !== bottomLine) return
          bottomLine.removeEventListener('transitionend', bottomLineExitHandler)
          bottomLineExitHandler = null
          bottomLine.style.display = 'none'
        }
        bottomLine.addEventListener('transitionend', bottomLineExitHandler)
      }
      requestAnimationFrame(updateScrollbar)
    }

    async function openPostByHandle(handle) {
      if (!handle) return

      layoutDebugMark('blog:open-post-start', {
        handle,
        listWrapClientH: listWrap.clientHeight,
        listWrapScrollH: listWrap.scrollHeight,
        blogPanelOffsetH: panel.offsetHeight,
      })
      showArticleView()

      const articleUrl = '/notes/' + encodeURIComponent(handle)
      if (location.pathname !== articleUrl) {
        history.pushState({ blogHandle: handle }, '', articleUrl)
      }

      bodyEl.innerHTML = ARTICLE_BODY_SKELETON_HTML
      bodyEl.setAttribute('aria-busy', 'true')
      layoutDebugMark('blog:skeleton-injected', {
        bodyOffset: { w: bodyEl.offsetWidth, h: bodyEl.offsetHeight },
      })
      layoutDebugSnapshot('blog:after-skeleton-sync')

      const snapshot = blogPostListItems.find(
        (i) => i?.handle?.trim() === handle,
      )

      if (snapshot) {
        titleEl.textContent = snapshot.title?.trim() || 'Untitled'
        metaEl.replaceChildren(
          createBlogPostMetaElement({
            published: snapshot.published,
            contentJson: snapshot.content?.json,
            variant: 'article',
          }),
        )
        metaEl.hidden = false
      } else {
        titleEl.textContent = 'Loading…'
        metaEl.replaceChildren()
        metaEl.hidden = true
      }

      layoutDebugSnapshot('blog:after-title-meta-sync')

      await waitForPaint()
      layoutDebugMark('blog:after-waitForPaint-before-fetch')
      layoutDebugSnapshot('blog:before-fetch')

      const { data, errors } = await window.contentfulRequest(
        window.GET_BLOG_POST_BY_HANDLE_QUERY,
        { handle },
      )

      layoutDebugMark('blog:open-post-fetch-done', {
        ok: !errors?.length,
        hasItem: Boolean(data?.blogPostCollection?.items?.[0]),
      })

      if (errors?.length) {
        const first = errors[0]?.message || 'Could not load post.'
        titleEl.textContent = ''
        bodyEl.removeAttribute('aria-busy')
        bodyEl.innerHTML = `<p class="article-error m-0">${escapeHtml(first)}</p>`
        metaEl.replaceChildren()
        metaEl.hidden = true
        return
      }

      const item = data?.blogPostCollection?.items?.[0]
      if (!item) {
        titleEl.textContent = ''
        bodyEl.removeAttribute('aria-busy')
        bodyEl.innerHTML = '<p class="article-error m-0">Post not found.</p>'
        metaEl.replaceChildren()
        metaEl.hidden = true
        return
      }

      const t = item.title?.trim() || 'Untitled'
      titleEl.textContent = t

      const json = item.content?.json
      const links = item.content?.links

      metaEl.replaceChildren(
        createBlogPostMetaElement({
          published: item.published,
          contentJson: json,
          variant: 'article',
        }),
      )
      metaEl.hidden = false

      if (!json) {
        bodyEl.removeAttribute('aria-busy')
        bodyEl.innerHTML =
          '<p class="article-empty m-0">No content for this post yet.</p>'
        return
      }

      try {
        const html = documentToHtmlString(json, richTextOptions(links))
        bodyEl.removeAttribute('aria-busy')
        bodyEl.innerHTML = html
        layoutDebugMark('blog:article-body-set', { htmlLength: html.length })
        layoutDebugSnapshot('blog:after-body-innerHTML')
        requestAnimationFrame(function () {
          layoutDebugMark('blog:article-body-after-rAF-1')
          layoutDebugSnapshot('blog:after-body-rAF-1')
        })
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            layoutDebugMark('blog:article-body-after-rAF-2')
            layoutDebugSnapshot('blog:after-body-rAF-2')
          })
        })
      } catch (e) {
        console.warn(e)
        bodyEl.removeAttribute('aria-busy')
        bodyEl.innerHTML =
          '<p class="article-error m-0">Could not render this post.</p>'
      }
    }

    window.__openBlogPostByHandle = async function openBlogPostFromExternal(
      handle,
    ) {
      const blogDropdown = document.getElementById('blog')
      if (
        blogDropdown instanceof HTMLElement &&
        typeof blogDropdown.setOpen === 'function'
      ) {
        document.dispatchEvent(
          new CustomEvent('dropdown:close-all', {
            detail: { exceptId: 'blog' },
          }),
        )
        blogDropdown.setOpen(true)
      }
      await openPostByHandle(handle)
    }

    panel.addEventListener('click', (ev) => {
      const t = ev.target
      if (!(t instanceof HTMLElement)) return

      const postBtn = t.closest(
        '[data-handle].panel-list__button, [data-handle].rich-text-embed-btn, [data-handle].rich-text-inline-entry, [data-handle].rich-text-embed-inline-btn',
      )
      if (postBtn instanceof HTMLElement) {
        const handle = postBtn.dataset.handle?.trim()
        if (handle) {
          ev.preventDefault()
          openPostByHandle(handle)
        }
        return
      }
    })

    document.addEventListener('dropdown:state-changed', () => {
      const blogDropdown = document.getElementById('blog')
      if (blogDropdown?.open) showListView()
    })

    backBtn.addEventListener('click', () => {
      layoutDebugMark('blog:back-click')
      if (location.pathname !== '/') history.pushState(null, '', '/')
      showListView()
    })

    window.addEventListener('popstate', async (e) => {
      const handle = e.state?.blogHandle
      if (handle) {
        const blogDropdown = document.getElementById('blog')
        if (blogDropdown && typeof blogDropdown.setOpen === 'function') {
          document.dispatchEvent(
            new CustomEvent('dropdown:close-all', {
              detail: { exceptId: 'blog' },
            }),
          )
          blogDropdown.setOpen(true)
        }
        await openPostByHandle(handle)
      } else {
        showListView()
      }
    })

    document.addEventListener('dropdown:state-changed', () => {
      const blogDropdown = document.getElementById('blog')
      if (blogDropdown && !blogDropdown.open) {
        if (location.pathname.startsWith('/notes/'))
          history.pushState(null, '', '/')
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
            bottomLine.removeEventListener(
              'transitionend',
              bottomLineExitHandler,
            )
            bottomLineExitHandler = null
          }
          bottomLine.style.display = ''
          bottomLine.offsetHeight
          bottomLine.classList.remove('blog-article--exit-down')
        }
        blogDropdown.classList.remove('blog-panel--article')
        containerEl?.classList.remove('article-open')
      }
    })

    const initMatch = /^\/notes\/([^/]+)\/?$/.exec(location.pathname)
    if (initMatch) {
      const handle = decodeURIComponent(initMatch[1])
      history.replaceState(
        { blogHandle: handle },
        '',
        location.pathname + location.search,
      )
      const blogDropdown = document.getElementById('blog')
      if (blogDropdown && typeof blogDropdown.setOpen === 'function') {
        document.dispatchEvent(
          new CustomEvent('dropdown:close-all', {
            detail: { exceptId: 'blog' },
          }),
        )
        blogDropdown.setOpen(true)
      }
      openPostByHandle(handle)
    }

    if (yearFilterEl) {
      yearFilterEl.addEventListener('change', () => {
        if (!getYearFilterValue()) {
          visibleCount = BLOG_LIST_PAGE_SIZE
        }
        refreshBlogList()
        listWrap.scrollTop = 0
      })
    }

    ;(async () => {
      layoutDebugMark('blog:list-fetch-start')
      setListStatus(ul, 'Loading…', ' m-0')

      const [listRes, boundsRes] = await Promise.all([
        window.fetchAllBlogPosts(),
        window.contentfulRequest(window.GET_BLOG_YEAR_BOUNDS_QUERY),
      ])

      const { items: fetchedItems, errors } = listRes

      layoutDebugMark('blog:list-fetch-done', { ok: !errors?.length })

      if (errors?.length) {
        const first = errors[0]?.message || 'Could not load posts.'
        setListStatus(ul, first, ' font-style-normal m-0')
        if (yearFilterEl) yearFilterEl.hidden = true
        if (listFooter) listFooter.hidden = true
        if (loadSentinel) loadSentinel.hidden = true
        return
      }

      blogPostListItems = fetchedItems ?? []
      visibleCount = BLOG_LIST_PAGE_SIZE

      let minY = null
      let maxY = null
      if (!boundsRes.errors?.length && boundsRes.data) {
        const oldestPub = boundsRes.data.oldest?.items?.[0]?.published
        const newestPub = boundsRes.data.newest?.items?.[0]?.published
        if (oldestPub && newestPub) {
          minY = new Date(oldestPub).getFullYear()
          maxY = new Date(newestPub).getFullYear()
        }
      }
      if (minY == null || maxY == null) {
        const fb = yearBoundsFromPosts(blogPostListItems)
        minY = fb.min
        maxY = fb.max
      }

      if (
        yearFilterEl &&
        blogPostListItems.length &&
        minY != null &&
        maxY != null
      ) {
        yearFilterEl.setOptions(buildYearFilterOptions(minY, maxY))
        yearFilterReady = true
        yearFilterEl.hidden = !articleRoot.hidden
        refreshBlogList()
      } else {
        if (yearFilterEl) yearFilterEl.hidden = true
        refreshBlogList()
      }
    })()
  }
}

customElements.define('blog-panel', BlogPanel)
