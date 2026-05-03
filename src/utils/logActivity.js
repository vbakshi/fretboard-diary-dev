import { supabase } from '../lib/supabase';

/**
 * @param {string} action
 * @param {string} [targetType]
 * @param {string | null} [targetId]
 * @param {Record<string, unknown>} [metadata]
 */
export async function logActivity(action, targetType, targetId, metadata = {}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('activity_log').insert({
    user_id: user.id,
    action,
    target_type: targetType ?? null,
    target_id: targetId ?? null,
    metadata,
  });
}
