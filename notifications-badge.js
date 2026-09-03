// Shared across member pages: adds a live unread-count badge next to the
// "Notifications" sidebar link, if present on the page. Subscribes to
// realtime changes so the count updates instantly — no refresh needed.

import { supabase } from './supabase-client.js';

function findNotificationsLink() {
  return Array.from(document.querySelectorAll('.dashboard-sidebar nav a'))
    .find(a => a.textContent.trim() === 'Notifications');
}

async function updateBadge(profileId) {
  const link = findNotificationsLink();
  if (!link) return;

  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)
    .eq('is_read', false);

  let badge = link.querySelector('.unread-count-badge');
  if (count && count > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'unread-count-badge';
      badge.style.cssText = 'background:var(--color-primary);color:#fff;font-size:0.7rem;padding:2px 7px;border-radius:999px;margin-left:8px;';
      link.appendChild(badge);
    }
    badge.textContent = count > 9 ? '9+' : String(count);
  } else if (badge) {
    badge.remove();
  }
}

export async function renderUnreadBadge(profileId) {
  await updateBadge(profileId);

  // Live updates: any insert/update/delete affecting this member's
  // notifications re-checks the count immediately.
  supabase
    .channel('notifications-badge-' + profileId)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'notifications',
      filter: `profile_id=eq.${profileId}`,
    }, () => updateBadge(profileId))
    .subscribe();
}
