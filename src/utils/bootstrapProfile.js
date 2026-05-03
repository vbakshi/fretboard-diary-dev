/**
 * Mirrors supabase/schema.sql handle_new_user() so OAuth users get a row
 * even if the DB trigger was missing when they first signed up.
 */
export function buildProfileRowFromAuthUser(user) {
  if (!user?.id) return null;
  const meta = user.user_metadata || {};
  const email = (user.email || '').trim();
  let base =
    (typeof meta.preferred_username === 'string' && meta.preferred_username.trim()) ||
    (email && email.split('@')[0]) ||
    'user';
  base = base.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  if (!base) base = 'user';
  const idCompact = user.id.replace(/-/g, '');
  const username = `${base}_${idCompact.slice(0, 12)}`;

  const fullName = (meta.full_name || meta.name || '').trim();
  const avatarRaw = (meta.avatar_url || meta.picture || '').trim();

  return {
    id: user.id,
    username,
    display_name: fullName || null,
    avatar_url: avatarRaw || null,
  };
}
