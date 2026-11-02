// Turns user Text into a safe regex:
// "a.b(" becomes "a\.b\(" so it is matched literally.

export const escapeRegex = (text) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
