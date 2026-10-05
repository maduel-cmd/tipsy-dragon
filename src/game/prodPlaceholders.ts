/**
 * Production placeholder policy — emoji / generic SVG only allowed in DEV
 * when a real sprite is missing. Prod must never show emoji next to photoreal food.
 */

/** True when Vite / Node marks this as a production build. */
export function isProdBuild(): boolean {
  try {
    // Vite client
    if (typeof import.meta !== "undefined" && import.meta.env?.PROD === true) return true;
  } catch {
    /* ignore */
  }
  return process.env.NODE_ENV === "production";
}

/** True when DEV fallbacks (emoji + red banner) are allowed. */
export function allowEmojiFallback(): boolean {
  return !isProdBuild();
}
