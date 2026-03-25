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

  /** Contentful caps collection queries at 100 items; use skip to page through. */
  const GET_BLOG_POSTS_PAGE_QUERY = `
    query BlogPostsPage($skip: Int!, $limit: Int!) {
      blogPostCollection(order: published_DESC, skip: $skip, limit: $limit) {
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

  async function fetchAllBlogPosts() {
    const pageSize = 100;
    const all = [];
    let skip = 0;
    for (;;) {
      const { data, errors } = await contentfulRequest(
        GET_BLOG_POSTS_PAGE_QUERY,
        { skip, limit: pageSize },
      );
      if (errors?.length) {
        return { items: all, errors };
      }
      const items = data?.blogPostCollection?.items ?? [];
      all.push(...items);
      if (items.length < pageSize) break;
      skip += pageSize;
    }
    return { items: all, errors: [] };
  }

  const GET_BLOG_YEAR_BOUNDS_QUERY = `
    query BlogYearBounds {
      oldest: blogPostCollection(order: published_ASC, limit: 1) {
        items {
          published
        }
      }
      newest: blogPostCollection(order: published_DESC, limit: 1) {
        items {
          published
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

  /** List payload: ids + titles (+ optional date); full rich text loaded per selection.
   * Field API id must match Contentful (default: timelineLaunchDate). If you use another
   * field for timeline text, add it here and read it in code-panel `timelineValueFromItem`. */
  const GET_CODE_PROJECTS_PAGE_QUERY = `
    query CodeProjectsPage($skip: Int!, $limit: Int!) {
      codeProjectCollection(order: order_ASC, skip: $skip, limit: $limit) {
        items {
          sys {
            id
          }
          title
          timelineLaunchDate
        }
      }
    }
  `;

  async function fetchAllCodeProjects() {
    const pageSize = 100;
    const all = [];
    let skip = 0;
    for (;;) {
      const { data, errors } = await contentfulRequest(
        GET_CODE_PROJECTS_PAGE_QUERY,
        { skip, limit: pageSize },
      );
      if (errors?.length) {
        return { items: all, errors };
      }
      const items = data?.codeProjectCollection?.items ?? [];
      all.push(...items);
      if (items.length < pageSize) break;
      skip += pageSize;
    }
    return { items: all, errors: [] };
  }

  const GET_MUSIC_PROJECTS_PAGE_QUERY = `
    query MusicProjectsPage($skip: Int!, $limit: Int!) {
      musicProjectCollection(
        order: releaseDateSort_DESC,
        skip: $skip,
        limit: $limit
      ) {
        items {
          sys {
            id
          }
          performed
          produced
          wrote
          artist
          role
          handle
          title
          artwork {
            title
            url
          }
          releaseDate
          spotify
          bandcamp
          apple
          tidal
          amazon
          deezer
          napster
          googlePlay
          soundcloud
        }
      }
    }
  `;

  async function fetchAllMusicProjects() {
    const pageSize = 100;
    const all = [];
    let skip = 0;
    for (;;) {
      const { data, errors } = await contentfulRequest(
        GET_MUSIC_PROJECTS_PAGE_QUERY,
        { skip, limit: pageSize },
      );
      if (errors?.length) {
        return { items: all, errors };
      }
      const items = data?.musicProjectCollection?.items ?? [];
      all.push(...items);
      if (items.length < pageSize) break;
      skip += pageSize;
    }
    return { items: all, errors: [] };
  }

  const MOODBOARD_ENTRY_ID = "5qaYjs8UZbaw8ZFihn1Y3w";

  const GET_MOODBOARD_INITIAL_QUERY = `
    query MoodboardInitial($id: String!) {
      moodboard(id: $id) {
        sys {
          id
        }
        imagesCollection(limit: 10, skip: 0) {
          total
          items {
            title
            url
          }
        }
      }
    }
  `;

  const GET_MOODBOARD_IMAGES_PAGE_QUERY = `
    query MoodboardImagesPage($id: String!, $skip: Int!, $limit: Int!) {
      moodboard(id: $id) {
        imagesCollection(limit: $limit, skip: $skip) {
          items {
            title
            url
          }
        }
      }
    }
  `;

  async function fetchMoodboardInitial() {
    const { data, errors } = await contentfulRequest(
      GET_MOODBOARD_INITIAL_QUERY,
      { id: MOODBOARD_ENTRY_ID },
    );
    return {
      moodboard: data?.moodboard ?? null,
      errors,
    };
  }

  async function fetchMoodboardImagesPage(skip, limit = 10) {
    const { data, errors } = await contentfulRequest(
      GET_MOODBOARD_IMAGES_PAGE_QUERY,
      { id: MOODBOARD_ENTRY_ID, skip, limit },
    );
    const items =
      data?.moodboard?.imagesCollection?.items?.filter(Boolean) ?? [];
    return { items, errors };
  }

  const GET_CODE_PROJECT_BY_ID_QUERY = `
    query CodeProjectById($id: String!) {
      codeProjectCollection(where: { sys: { id: $id } }, limit: 1) {
        items {
          sys {
            id
          }
          title
          link
          timelineLaunchDate
          image {
            url
            title
          }
          description {
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
  window.fetchAllBlogPosts = fetchAllBlogPosts;
  window.fetchAllCodeProjects = fetchAllCodeProjects;
  window.fetchAllMusicProjects = fetchAllMusicProjects;
  window.GET_BLOG_YEAR_BOUNDS_QUERY = GET_BLOG_YEAR_BOUNDS_QUERY;
  window.GET_BLOG_POST_BY_HANDLE_QUERY = GET_BLOG_POST_BY_HANDLE_QUERY;
  window.GET_CODE_PROJECT_BY_ID_QUERY = GET_CODE_PROJECT_BY_ID_QUERY;
  window.fetchMoodboardInitial = fetchMoodboardInitial;
  window.fetchMoodboardImagesPage = fetchMoodboardImagesPage;
})();
