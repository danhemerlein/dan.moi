export default async function handler(request, context) {
  const response = await context.next()
  const contentType = response.headers.get('content-type') || ''

  if (!contentType.includes('text/html')) {
    return response
  }

  const url = new URL(request.url)
  const origin = url.origin
  const html = await response.text()

  const rewritten = html.replaceAll(
    'https://dan.moi/assets/share.jpg',
    `${origin}/assets/share.jpg`,
  )

  return new Response(rewritten, response)
}
