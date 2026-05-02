import { MONTHS } from './constants.js'

function getNumberWithOrdinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * @param {string | Date} dateObj - ISO string from Contentful or Date
 */
export function createReadableDateFromContentful(dateObj) {
  const d = new Date(dateObj);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = MONTHS[d.getMonth()];
  const day = d.getDate();
  return `${month} ${getNumberWithOrdinal(day)}, ${year}`;
}

/**
 * @param {string} str - plain text
 * @returns {number} estimated minutes (0 if no words)
 */
export function readingTime(str) {
  const wpm = 225;
  const trimmed = str.trim();
  if (!trimmed) return 0;
  const words = trimmed.split(/\s+/).length;
  return Math.ceil(words / wpm);
}

/**
 * Walks a Contentful rich text document JSON and concatenates text node values.
 * @param {object | null | undefined} node
 * @returns {string}
 */
export function plainTextFromRichTextJson(node) {
  if (!node || typeof node !== "object") return "";
  if (node.nodeType === "text" && typeof node.value === "string") {
    return node.value;
  }
  if (Array.isArray(node.content)) {
    return node.content.map(plainTextFromRichTextJson).join(" ");
  }
  return "";
}

/**
 * @param {object | null | undefined} document - rich text root (nodeType document)
 * @returns {number} minutes (minimum 1 for display when content is empty)
 */
export function readingTimeMinutesFromRichText(document) {
  const text = plainTextFromRichTextJson(document).replace(/\s+/g, " ").trim();
  const mins = readingTime(text);
  return mins < 1 ? 1 : mins;
}

export function formatReadingTimeLabel(minutes) {
  return minutes === 1 ? "1 min read" : `${minutes} min read`;
}

/**
 * Reusable post metadata: publication date + reading time (same markup for list + article).
 * @param {{ published?: string | null, contentJson?: object | null, variant?: "list" | "article" }} input
 * @returns {HTMLDivElement}
 */
export function createBlogPostMetaElement({
  published,
  contentJson,
  variant,
}) {
  const meta = document.createElement("div");
  meta.className = "blog-post-meta flex flex-wrap items-baseline gap-4";
  if (variant === "list" || variant === "article") {
    meta.classList.add(`blog-post-meta--${variant}`, 'mt-2')
  }

  if (published) {
    const readable = createReadableDateFromContentful(published);
    if (readable) {
      const timeEl = document.createElement("time");
      timeEl.className = "blog-post-meta__date font-style-normal font-normal uppercase";
      timeEl.dateTime = published;
      timeEl.textContent = readable;
      meta.appendChild(timeEl);
    }
  }

  const minutes = readingTimeMinutesFromRichText(contentJson);
  const readEl = document.createElement("span");
  readEl.className = "blog-post-meta__reading font-style-normal font-normal uppercase";
  readEl.textContent = formatReadingTimeLabel(minutes);
  meta.appendChild(readEl);

  return meta;
}
