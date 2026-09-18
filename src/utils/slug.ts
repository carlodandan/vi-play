/**
 * Utility to convert arbitrary media titles into clean, URL-friendly slugs for SEO.
 * E.g., "Dune: Part Two (2024)" -> "dune-part-two"
 */
export function slugify(text?: string | null): string {
  if (!text) return "";
  return text
    .toString()
    .normalize("NFD") // split accented characters into their base chars and diacritical marks
    .replace(/[\u0300-\u036f]/g, "") // remove diacritical marks
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // remove non-alphanumeric chars except space and hyphen
    .replace(/[\s_-]+/g, "-") // collapse spaces and dashes into single dash
    .replace(/^-+|-+$/g, ""); // remove leading or trailing dash
}

/**
 * Builds an SEO-friendly internal detail path.
 * E.g. /movie/693134/dune-part-two
 */
export function buildMediaPath(
  type: string,
  id: number | string,
  title?: string | null,
): string {
  const slug = slugify(title);
  return slug ? `/${type}/${id}/${slug}` : `/${type}/${id}`;
}

/**
 * Builds an SEO-friendly internal watch path.
 * E.g. /watch/tv/209867/1/2/solo-leveling
 */
export function buildWatchPath(
  type: string,
  id: number | string,
  season?: number,
  episode?: number,
  title?: string | null,
): string {
  const slug = slugify(title);
  if (season !== undefined && episode !== undefined) {
    return slug
      ? `/watch/${type}/${id}/${season}/${episode}/${slug}`
      : `/watch/${type}/${id}/${season}/${episode}`;
  }
  return slug ? `/watch/${type}/${id}/${slug}` : `/watch/${type}/${id}`;
}
