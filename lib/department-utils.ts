/**
 * Normalize free-text department names so near-duplicates combine
 * (e.g. "Power Plant", "Powerplant", "power plant" → same key).
 */

export function departmentMergeKey(name: string): string {
  return String(name || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/** Collapse whitespace; keep short ALL-CAPS acronyms; otherwise title-case words. */
export function formatDepartmentLabel(raw: string): string {
  const trimmed = String(raw || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!trimmed) return "Unknown";

  if (/^[A-Z0-9][A-Z0-9&/._-]{1,10}$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed
    .split(" ")
    .map((word) => {
      if (/^[A-Z]{2,}$/.test(word)) return word;
      if (/^[A-Z]{2,}[a-z]?$/.test(word) && word === word.toUpperCase()) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Pick the best display label from raw variants that share a merge key.
 * Prefers higher frequency, then spaced / longer readable forms.
 */
export function pickDepartmentLabel(variants: string[]): string {
  if (!variants.length) return "Unknown";

  const counts = new Map<string, number>();
  for (const v of variants) {
    const key = v.trim().replace(/\s+/g, " ");
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const ranked = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    const aSpaces = (a[0].match(/\s/g) || []).length;
    const bSpaces = (b[0].match(/\s/g) || []).length;
    if (bSpaces !== aSpaces) return bSpaces - aSpaces;
    return b[0].length - a[0].length;
  });

  return formatDepartmentLabel(ranked[0]?.[0] || variants[0]);
}
