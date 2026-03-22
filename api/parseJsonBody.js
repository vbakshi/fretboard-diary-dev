/**
 * Vercel/Node may deliver JSON POST bodies as objects, strings, or Buffers.
 */

export function isNodeBuffer(v) {
  return typeof globalThis.Buffer !== 'undefined' && globalThis.Buffer.isBuffer(v);
}

export function parseJsonBody(raw) {
  if (raw == null) return {};
  if (isNodeBuffer(raw)) {
    try {
      return JSON.parse(raw.toString('utf8') || '{}');
    } catch {
      return {};
    }
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw || '{}');
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object') {
    return raw;
  }
  return {};
}
