function getKey(townSlug: string) {
  return `tc_recently_viewed_${townSlug}`;
}

export function loadRecentlyViewed(townSlug: string): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(getKey(townSlug));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveRecentlyViewed(townSlug: string, ids: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(getKey(townSlug), JSON.stringify(ids.slice(0, 12)));
}

export function trackProductView(townSlug: string, productId: string) {
  const existing = loadRecentlyViewed(townSlug);

  const next = [productId, ...existing.filter((id) => id !== productId)];

  saveRecentlyViewed(townSlug, next);
}