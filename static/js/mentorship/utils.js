/**
 * Shared utilities for mentorship dashboard modules.
 * Import from here rather than duplicating across dashboard files.
 */

// ─── XSS protection ──────────────────────────────────────────────────────────

export function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ─── Status metadata ──────────────────────────────────────────────────────────

// priority: lower = shown first on dashboards (active statuses before closed ones)
export const STATUS_META = {
  needs_info: { label: 'דורש פרטים נוספים', color: 'info',      dark: true,  priority: 1 },
  pending:    { label: 'בהמתנה',             color: 'warning',   dark: true,  priority: 2 },
  approved:   { label: 'אושרה',              color: 'success',   dark: false, priority: 3 },
  rejected:   { label: 'נדחתה',              color: 'danger',    dark: false, priority: 4 },
  completed:  { label: 'הושלמה',             color: 'secondary', dark: true,  priority: 5 },
  canceled:   { label: 'בוטלה',              color: 'secondary', dark: true,  priority: 6 },
};

export const STATUS_LABELS = Object.fromEntries(
  Object.entries(STATUS_META).map(([k, v]) => [k, v.label])
);

export const CLOSED_STATUSES = new Set(['completed', 'rejected', 'canceled']);

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function formatDate(ts) {
  if (!ts) return '—';
  return new Date((ts._seconds ?? ts.seconds ?? 0) * 1000).toLocaleDateString('he-IL');
}

export function formatDateTime(ts) {
  if (!ts) return '—';
  return new Date((ts._seconds ?? ts.seconds ?? 0) * 1000)
    .toLocaleString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

/** Active requests first, then closed; within same priority group, newest first. */
export function sortRequests(requests) {
  return [...requests].sort((a, b) => {
    const pa = STATUS_META[a.status]?.priority ?? 99;
    const pb = STATUS_META[b.status]?.priority ?? 99;
    if (pa !== pb) return pa - pb;
    return (b.createdAt?._seconds ?? 0) - (a.createdAt?._seconds ?? 0);
  });
}

// ─── Timeline renderer ────────────────────────────────────────────────────────

/**
 * @param {Array}  events      — timeline event objects from GET /requests/:id/timeline
 * @param {string} viewerRole  — "mentor" | "mentee"; own events labelled "אני"
 */
export function renderTimeline(events, viewerRole) {
  if (!events.length) {
    return '<p class="text-muted small text-center py-2 mb-0">אין היסטוריה עדיין.</p>';
  }

  return events.map((ev, i) => {
    const isOwn    = ev.authorRole === viewerRole;
    const label    = isOwn ? 'אני' : ev.authorRole === 'mentor' ? 'מנטור/ית' : 'מנטי';
    const badgeCls = isOwn
      ? 'bg-light text-dark border'
      : 'bg-primary';
    const borderTop = i > 0 ? 'border-top' : '';

    const statusLine = ev.fromStatus
      ? `<span class="text-muted">מ-${STATUS_LABELS[ev.fromStatus] ?? ev.fromStatus} ל-${STATUS_LABELS[ev.toStatus] ?? ev.toStatus}</span>`
      : '<span class="text-muted">בקשה נשלחה</span>';

    const content = ev.content
      ? `<p class="mb-0 mt-1">${escapeHtml(ev.content)}</p>`
      : '';

    return `
      <div class="px-3 py-2 ${borderTop}" dir="rtl">
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span class="badge ${badgeCls}">${label}</span>
          <small class="text-muted">${formatDateTime(ev.createdAt)}</small>
        </div>
        <div class="small">${statusLine}${content}</div>
      </div>`;
  }).join('');
}
