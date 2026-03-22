const SEARCH_CACHE_PREFIX = 'search_cache:';
const RECENT_KEY = 'recent_searches';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_RECENT = 6;

export function getCachedSearch(query) {
  if (!query?.trim()) return null;
  try {
    const key = `${SEARCH_CACHE_PREFIX}${query.trim()}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function setSearchCache(query, data) {
  if (!query?.trim()) return;
  try {
    const key = `${SEARCH_CACHE_PREFIX}${query.trim()}`;
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // ignore
  }
}

export function getRecentSearches() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query) {
  if (!query?.trim()) return;
  try {
    const recent = getRecentSearches().filter((q) => q !== query.trim());
    recent.unshift(query.trim());
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    // ignore
  }
}

const AI_CACHE_PREFIX = 'ai_cache:';

export function getAICache(videoId) {
  if (!videoId) return null;
  try {
    const raw = localStorage.getItem(`${AI_CACHE_PREFIX}${videoId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAICache(videoId, data) {
  if (!videoId) return;
  try {
    localStorage.setItem(`${AI_CACHE_PREFIX}${videoId}`, JSON.stringify(data));
  } catch {
    // ignore
  }
}
