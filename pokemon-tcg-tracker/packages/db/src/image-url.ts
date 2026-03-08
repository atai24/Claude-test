/**
 * Image URL rewriting utility.
 *
 * All image URLs in the DB are stored as their original pokemontcg.io URLs:
 *   https://images.pokemontcg.io/base1/4.png
 *   https://images.pokemontcg.io/base1/4_hires.png
 *   https://images.pokemontcg.io/base1/logo.png
 *   https://images.pokemontcg.io/base1/symbol.png
 *
 * Set IMAGES_BASE_URL to rewrite to your own host. The path after the origin
 * is preserved exactly, so migrating to cloud is a drop-in base URL swap.
 *
 * Examples:
 *   IMAGES_BASE_URL=http://localhost:3001/images
 *     → http://localhost:3001/images/base1/4.png
 *
 *   IMAGES_BASE_URL=https://assets.example.com
 *     → https://assets.example.com/base1/4.png
 *
 *   IMAGES_BASE_URL unset
 *     → original pokemontcg.io URL (no change)
 */

const POKEMON_TCG_IMAGE_ORIGIN = "https://images.pokemontcg.io";

export function imageUrl(original: string | null): string | null {
  if (!original) return null;

  const base = process.env.IMAGES_BASE_URL?.replace(/\/$/, "");
  if (!base) return original;

  if (!original.startsWith(POKEMON_TCG_IMAGE_ORIGIN)) return original;

  const path = original.slice(POKEMON_TCG_IMAGE_ORIGIN.length); // e.g. /base1/4.png
  return `${base}${path}`;
}

/**
 * Extract the relative path from a pokemontcg.io image URL.
 * Used by the download script to determine the local file path.
 *
 * "https://images.pokemontcg.io/base1/4.png" → "base1/4.png"
 */
export function imageRelativePath(url: string): string | null {
  if (!url.startsWith(POKEMON_TCG_IMAGE_ORIGIN)) return null;
  return url.slice(POKEMON_TCG_IMAGE_ORIGIN.length + 1); // strip leading /
}
