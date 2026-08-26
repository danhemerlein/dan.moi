# dan.moi

Personal site for Dan Hemerlein — a single-page app with dropdown panels for Blog, Writes Code, Makes Music, and Collects Moods. Content is pulled from Contentful via GraphQL.

Built with vanilla JS and native Web Components — no framework, no bundler, no build step.

## Running locally

1. Copy `.env.example` to `.env` and fill in your Contentful credentials:

   ```
   CONTENTFUL_SPACE_ID=your-space-id
   CONTENTFUL_ACCESS_TOKEN=your-access-token
   ```

2. Start the dev server:

   ```bash
   node serve.mjs
   ```

3. Open `http://localhost:3333`.

Override the port with `PORT=1234 node serve.mjs`.

### Dev modes

Append these query params to any URL (including direct article links) to jump straight into a panel while developing:

- `?dev-mode=blog-list` — Blog panel opens and stays open
- `?dev-mode=blog-article` — Blog panel opens with the first article loaded
- `?dev-mode=code-list` — Writes Code panel opens and stays open
- `?dev-mode=code-project` — Writes Code panel opens with the first project loaded
- `?dev-mode=music-list` — Makes Music panel opens and stays open
- `?dev-mode=moodboard` — Collects Moods panel opens and stays open

## Architecture

See `CLAUDE.md` for details on the component structure, Contentful data fetching, and CSS conventions.
