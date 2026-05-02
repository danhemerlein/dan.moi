export const CLOSE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M0.5625 0.562927L7.31738 7.31781M7.31738 0.562927L0.5625 7.31781" stroke="currentColor" stroke-width="1.12581" stroke-linecap="round" stroke-linejoin="round"/></svg>`

export const ARTICLE_BODY_SKELETON_HTML = `
<div class="content-skeleton flex flex-col gap-3 pointer-events-none" aria-hidden="true">
  <div class="content-skeleton__line content-skeleton__line--lg"></div>
  <div class="content-skeleton__line"></div>
  <div class="content-skeleton__line"></div>
  <div class="content-skeleton__line"></div>
  <div class="content-skeleton__line content-skeleton__line--sm"></div>
</div>`

export const STREAMING_LINKS = [
  ['spotify', 'Spotify'],
  ['bandcamp', 'Bandcamp'],
  ['apple', 'Apple Music'],
  ['tidal', 'Tidal'],
  ['amazon', 'Amazon'],
  ['deezer', 'Deezer'],
  ['napster', 'Napster'],
  ['googlePlay', 'Google Play'],
  ['soundcloud', 'SoundCloud'],
]

const MONTH_DATA = [
  { full: 'January',   abbr: 'Jan' },
  { full: 'February',  abbr: 'Feb' },
  { full: 'March',     abbr: 'Mar' },
  { full: 'April',     abbr: 'Apr' },
  { full: 'May',       abbr: 'May' },
  { full: 'June',      abbr: 'Jun' },
  { full: 'July',      abbr: 'Jul' },
  { full: 'August',    abbr: 'Aug' },
  { full: 'September', abbr: 'Sep' },
  { full: 'October',   abbr: 'Oct' },
  { full: 'November',  abbr: 'Nov' },
  { full: 'December',  abbr: 'Dec' },
]

export const MONTHS = MONTH_DATA.map(m => m.full)
export const MONTH_ABBREV_EN = MONTH_DATA.map(m => m.abbr)
export const FULL_MONTH_TO_ABBREV_EN = MONTH_DATA.map(m => [m.full, m.abbr])
