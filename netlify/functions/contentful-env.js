export default async function handler() {
  const spaceId = process.env.CONTENTFUL_SPACE_ID ?? "";
  const accessToken = process.env.CONTENTFUL_ACCESS_TOKEN ?? "";
  const body = `window.CONTENTFUL_CONFIG=${JSON.stringify({ spaceId, accessToken })};`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
