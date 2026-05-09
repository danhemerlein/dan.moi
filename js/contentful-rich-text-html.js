const BLOCKS = {
  DOCUMENT: 'document',
  PARAGRAPH: 'paragraph',
  HEADING_1: 'heading-1',
  HEADING_2: 'heading-2',
  HEADING_3: 'heading-3',
  HEADING_4: 'heading-4',
  HEADING_5: 'heading-5',
  HEADING_6: 'heading-6',
  UL_LIST: 'unordered-list',
  OL_LIST: 'ordered-list',
  LIST_ITEM: 'list-item',
  HR: 'hr',
  QUOTE: 'blockquote',
  EMBEDDED_ENTRY: 'embedded-entry-block',
  EMBEDDED_ASSET: 'embedded-asset-block',
  TABLE: 'table',
  TABLE_ROW: 'table-row',
  TABLE_CELL: 'table-cell',
  TABLE_HEADER_CELL: 'table-header-cell',
}

const INLINES = {
  HYPERLINK: 'hyperlink',
  ENTRY_HYPERLINK: 'entry-hyperlink',
  ASSET_HYPERLINK: 'asset-hyperlink',
  EMBEDDED_ENTRY: 'embedded-entry-inline',
}

const BLOCK_TAGS = {
  paragraph: 'p',
  'heading-1': 'h1',
  'heading-2': 'h2',
  'heading-3': 'h3',
  'heading-4': 'h4',
  'heading-5': 'h5',
  'heading-6': 'h6',
  'unordered-list': 'ul',
  'ordered-list': 'ol',
  'list-item': 'li',
  blockquote: 'blockquote',
  table: 'table',
  'table-row': 'tr',
  'table-cell': 'td',
  'table-header-cell': 'th',
}

const MARK_TAGS = {
  bold: ['<b>', '</b>'],
  italic: ['<i>', '</i>'],
  underline: ['<u>', '</u>'],
  code: ['<code>', '</code>'],
  strikethrough: ['<s>', '</s>'],
  superscript: ['<sup>', '</sup>'],
  subscript: ['<sub>', '</sub>'],
}

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderText(node) {
  let s = escapeHtml(node.value ?? '')
  for (const mark of node.marks ?? []) {
    const tags = MARK_TAGS[mark.type]
    if (tags) s = tags[0] + s + tags[1]
  }
  return s
}

function defaultRenderNode(node, children) {
  switch (node.nodeType) {
    case 'document':
      return children()
    case 'hr':
      return '<hr/>'
    case INLINES.HYPERLINK: {
      const href = escapeHtml(node.data?.uri ?? '')
      return `<a href="${href}">${children()}</a>`
    }
    default: {
      const tag = BLOCK_TAGS[node.nodeType]
      if (tag) return `<${tag}>${children()}</${tag}>`
      return children()
    }
  }
}

function nodeToHtml(node, renderNode) {
  if (node.nodeType === 'text') return renderText(node)

  const next = (contentNodes) =>
    (contentNodes ?? []).map((child) => nodeToHtml(child, renderNode)).join('')

  const custom = renderNode[node.nodeType]
  if (custom) return custom(node, next)

  return defaultRenderNode(node, () => next(node.content ?? []))
}

export function documentToHtmlString(doc, options = {}) {
  if (!doc) return ''
  return nodeToHtml(doc, options.renderNode ?? {})
}

export function buildAssetEntryMaps(links) {
  const assets = new Map()
  for (const a of links?.assets?.block ?? []) {
    if (a?.sys?.id) assets.set(a.sys.id, a)
  }
  const entries = new Map()
  for (const e of links?.entries?.block ?? []) {
    if (e?.sys?.id) entries.set(e.sys.id, e)
  }
  return { assets, entries }
}

export function richTextOptions(links) {
  const { assets: assetMap, entries: entryMap } = buildAssetEntryMaps(links)

  return {
    renderNode: {
      [BLOCKS.EMBEDDED_ASSET]: (node) => {
        const id = node?.data?.target?.sys?.id
        if (!id) return ''
        const asset = assetMap.get(id)
        if (!asset?.url) return ''
        const alt = escapeHtml(asset.title || asset.description || '')
        const w =
          asset.width != null
            ? ` width="${escapeHtml(String(asset.width))}"`
            : ''
        const h =
          asset.height != null
            ? ` height="${escapeHtml(String(asset.height))}"`
            : ''
        return `<figure class="blog-post__figure"><img src="${escapeHtml(asset.url)}" alt="${alt}"${w}${h} loading="lazy" class="max-w-full h-auto rounded-sm align-middle" /></figure>`
      },
      [BLOCKS.EMBEDDED_ENTRY]: (node, next) => {
        const id = node?.data?.target?.sys?.id
        if (!id) return ''
        const entry = entryMap.get(id)
        if (entry?.handle) {
          const label = escapeHtml((entry.title || 'Post').trim())
          return `<p class="rich-text-embed"><button type="button" class="rich-text-embed-btn" data-handle="${escapeHtml(entry.handle)}">${label}</button></p>`
        }
        if (node.content?.length) {
          return `<div class="rich-text-embed-fallback">${next(node.content)}</div>`
        }
        return ''
      },
      [INLINES.ENTRY_HYPERLINK]: (node, next) => {
        const id = node?.data?.target?.sys?.id
        if (!id) return next(node.content)
        const entry = entryMap.get(id)
        if (entry?.handle) {
          return `<button type="button" class="rich-text-inline-entry cursor-pointer" data-handle="${escapeHtml(entry.handle)}">${next(node.content)}</button>`
        }
        return `<span class="rich-text-inline-entry-fallback">${next(node.content)}</span>`
      },
      [INLINES.ASSET_HYPERLINK]: (node, next) => {
        const id = node?.data?.target?.sys?.id
        if (!id) return next(node.content)
        const asset = assetMap.get(id)
        if (asset?.url) {
          return `<a href="${escapeHtml(asset.url)}">${next(node.content)}</a>`
        }
        return next(node.content)
      },
      [INLINES.EMBEDDED_ENTRY]: (node) => {
        const id = node?.data?.target?.sys?.id
        if (!id) return ''
        const entry = entryMap.get(id)
        if (entry?.handle) {
          const label = escapeHtml((entry.title || 'Post').trim())
          return `<button type="button" class="rich-text-embed-inline-btn" data-handle="${escapeHtml(entry.handle)}">${label}</button>`
        }
        return ''
      },
    },
  }
}
