/**
 * Extra Supabase HTTP logging (response bodies on 4xx/5xx). Opt-in only.
 * Enable with: VITE_AUTH_DEBUG=true, or ?authDebug=1 (persists in sessionStorage until cleared).
 */
export function isAuthHttpDebugEnabled() {
  if (import.meta.env.VITE_AUTH_DEBUG === 'true') return true;
  if (typeof window === 'undefined') return false;
  try {
    if (new URLSearchParams(window.location.search).get('authDebug') === '1') {
      sessionStorage.setItem('AUTH_HTTP_DEBUG', '1');
      return true;
    }
  } catch {
    /* ignore */
  }
  try {
    return sessionStorage.getItem('AUTH_HTTP_DEBUG') === '1';
  } catch {
    return false;
  }
}

/** Read OAuth / magic-link error text from current URL (query or hash). */
export function getOAuthErrorFromLocation() {
  if (typeof window === 'undefined') return null;
  try {
    const q = new URLSearchParams(window.location.search);
    const qDesc = q.get('error_description');
    if (qDesc) return decodeURIComponent(qDesc.replace(/\+/g, ' '));
    const qErr = q.get('error');
    if (qErr) return decodeURIComponent(qErr.replace(/\+/g, ' '));

    const rawHash = window.location.hash?.replace(/^#/, '') ?? '';
    if (!rawHash) return null;
    const hp = new URLSearchParams(rawHash);
    const hDesc = hp.get('error_description');
    if (hDesc) return decodeURIComponent(hDesc.replace(/\+/g, ' '));
    const hErr = hp.get('error');
    if (hErr) return decodeURIComponent(hErr.replace(/\+/g, ' '));
  } catch {
    /* ignore */
  }
  return null;
}

/** Log OAuth return errors — always runs (not gated on DEV) so you can see it in any build. */
export function logOAuthReturnErrorsToConsole() {
  if (typeof window === 'undefined') return;
  try {
    const q = new URLSearchParams(window.location.search);
    const qErr = q.get('error');
    const qDesc = q.get('error_description');
    if (qErr || qDesc) {
      console.warn('[Fretboard Diary auth]', 'OAuth returned an error in the URL query:', {
        error: qErr,
        error_description: qDesc
          ? decodeURIComponent(qDesc.replace(/\+/g, ' '))
          : null,
        fullSearch: window.location.search,
      });
    }
    const rawHash = window.location.hash?.replace(/^#/, '') ?? '';
    if (rawHash) {
      const hp = new URLSearchParams(rawHash);
      const hErr = hp.get('error');
      const hDesc = hp.get('error_description');
      if (hErr || hDesc) {
        console.warn('[Fretboard Diary auth]', 'OAuth returned an error in the URL hash:', {
          error: hErr,
          error_description: hDesc
            ? decodeURIComponent(hDesc.replace(/\+/g, ' '))
            : null,
          hashPreview: rawHash.slice(0, 300),
        });
      }
    }
  } catch (e) {
    console.warn('[Fretboard Diary auth]', 'Could not parse URL for OAuth errors', e);
  }
}
