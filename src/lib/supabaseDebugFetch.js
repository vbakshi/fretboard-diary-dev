import { isAuthHttpDebugEnabled } from '../utils/authDebug';

/**
 * Wraps fetch so failed Supabase API responses log response bodies (when debug is on).
 * HTTP 400 bodies often contain JSON with `message`, `hint`, or `code`.
 */
export function createSupabaseDebugFetch() {
  return async (input, init) => {
    const res = await globalThis.fetch(input, init);
    if (res.ok) return res;
    if (!isAuthHttpDebugEnabled()) return res;

    let body = '';
    try {
      body = (await res.clone().text()).slice(0, 2000);
    } catch {
      /* ignore */
    }

    const requestUrl = typeof input === 'string' ? input : input?.url ?? String(input);
    const method = init?.method || 'GET';
    console.warn('[Fretboard Diary / Supabase HTTP]', res.status, res.statusText, {
      method,
      requestUrl,
      bodyPreview: body || '(empty body)',
    });
    return res;
  };
}
