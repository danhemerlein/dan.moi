const CONTENTFUL_QUERY = `
  query BlogPostByHandle($handle: String!) {
    blogPostCollection(where: { handle: $handle }, limit: 1) {
      items {
        title
        content {
          json
        }
      }
    }
  }
`

const CACHE_TTL_MS = 5 * 60 * 1000
const articleCache = new Map()

function getEnv(key) {
  try {
    if (typeof Netlify !== 'undefined' && Netlify.env) {
      const value = Netlify.env.get(key)
      if (value) return value
    }
  } catch {}
  try {
    return Deno.env.get(key)
  } catch {}
  return undefined
}

function escapeHtml(str) {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/** Flattens a Contentful rich-text document into a plain-text excerpt. */
function excerptFromRichText(doc, maxLength = 200) {
  const parts = []

  function walk(node) {
    if (!node) return
    if (typeof node.value === 'string') parts.push(node.value)
    if (Array.isArray(node.content)) node.content.forEach(walk)
  }
  walk(doc)

  const text = parts.join(' ').replace(/\s+/g, ' ').trim()
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '…'
}

async function fetchArticleMeta(handle) {
  const cached = articleCache.get(handle)
  if (cached && cached.expires > Date.now()) return cached.value

  const spaceId = getEnv('CONTENTFUL_SPACE_ID')
  const accessToken = getEnv('CONTENTFUL_ACCESS_TOKEN')
  if (!spaceId || !accessToken) return null

  const endpoint = `https://graphql.contentful.com/content/v1/spaces/${spaceId}/environments/master`

  let value = null
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: CONTENTFUL_QUERY, variables: { handle } }),
      signal: AbortSignal.timeout(3000),
    })
    const json = await res.json()
    const item = json?.data?.blogPostCollection?.items?.[0]
    if (item?.title) {
      value = {
        title: item.title,
        description: item.content?.json
          ? excerptFromRichText(item.content.json)
          : null,
      }
    }
  } catch {
    value = null
  }

  articleCache.set(handle, { value, expires: Date.now() + CACHE_TTL_MS })
  return value
}

function withMetaTag(html, tagMatcher, content) {
  return html.replace(tagMatcher, (full, prefix, suffix) => `${prefix}${escapeHtml(content)}${suffix}`)
}

export default async function handler(request, context) {
  const response = await context.next()
  const contentType = response.headers.get('content-type') || ''

  if (!contentType.includes('text/html')) {
    return response
  }

  const url = new URL(request.url)
  const origin = url.origin
  let html = await response.text()

  html = html.replaceAll(
    'https://dan.moi/assets/share.jpg',
    `${origin}/assets/share.jpg`,
  )

  const noteMatch = url.pathname.match(/^\/notes\/([^/]+)\/?$/)
  if (noteMatch) {
    const handle = decodeURIComponent(noteMatch[1])
    const article = await fetchArticleMeta(handle)

    if (article?.title) {
      const title = article.title
      const description = article.description || 'Dan Hemerlein\'s website.'
      const pageUrl = `${origin}${url.pathname}`

      html = withMetaTag(html, /(<title>)[^<]*(<\/title>)/, `${title} — dan.moi`)
      html = withMetaTag(
        html,
        /(<meta name="description" content=")[^"]*("\s*\/>)/,
        description,
      )
      html = withMetaTag(
        html,
        /(<meta property="og:title" content=")[^"]*("\s*\/>)/,
        title,
      )
      html = withMetaTag(
        html,
        /(<meta property="og:description" content=")[^"]*("\s*\/>)/,
        description,
      )
      html = withMetaTag(
        html,
        /(<meta property="og:url" content=")[^"]*("\s*\/>)/,
        pageUrl,
      )
      html = withMetaTag(
        html,
        /(<meta name="twitter:title" content=")[^"]*("\s*\/>)/,
        title,
      )
      html = withMetaTag(
        html,
        /(<meta name="twitter:description" content=")[^"]*("\s*\/>)/,
        description,
      )
    }
  }

  return new Response(html, response)
}
