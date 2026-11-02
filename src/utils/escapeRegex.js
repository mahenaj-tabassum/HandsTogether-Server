// Escape special regex characters in the given text
// so they are treated as normal characters instead of regex patterns.
// "a.b(" becomes "a\.b\") so it is matched literally.

export const escapeRegex = (text) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
