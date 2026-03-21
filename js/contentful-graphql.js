(() => {
  async function contentfulRequest(query, variables = {}) {
    const cfg = window.CONTENTFUL_CONFIG;
    if (!cfg?.spaceId || !cfg?.accessToken) {
      const message = "CONTENTFUL_CONFIG missing (use node serve.mjs or set window.CONTENTFUL_CONFIG).";
      console.warn(message);
      return { data: null, errors: [{ message }] };
    }

    const endpoint = `https://graphql.contentful.com/content/v1/spaces/${cfg.spaceId}/environments/master`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    const json = await res.json().catch(() => ({}));
    const errors = json.errors || [];
    if (errors.length) {
      errors.forEach((e) => console.warn(e.message));
      return { data: null, errors };
    }
    return { data: json.data ?? {}, errors: [] };
  }

  const GET_ALL_BLOG_POSTS_QUERY = `
    query AllBlogPosts {
      blogPostCollection(order: published_DESC, limit: 50) {
        items {
          sys {
            id
          }
          title
          handle
          published
          content {
            json
          }
        }
      }
    }
  `;

  /** Rich text field API id must match your Blog post model (this space uses "content"). */
  const GET_BLOG_POST_BY_HANDLE_QUERY = `
    query BlogPostByHandle($handle: String!) {
      blogPostCollection(where: { handle: $handle }, limit: 1) {
        items {
          sys {
            id
          }
          title
          handle
          published
          content {
            json
            links {
              assets {
                block {
                  sys {
                    id
                  }
                  url
                  title
                  description
                  width
                  height
                  contentType
                }
              }
              entries {
                block {
                  sys {
                    id
                  }
                  ... on BlogPost {
                    title
                    handle
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  window.contentfulRequest = contentfulRequest;
  window.GET_ALL_BLOG_POSTS_QUERY = GET_ALL_BLOG_POSTS_QUERY;
  window.GET_BLOG_POST_BY_HANDLE_QUERY = GET_BLOG_POST_BY_HANDLE_QUERY;
})();
