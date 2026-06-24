import { getSession, authedFetch } from './api.js';
import {
  escapeHtml, STATUS_META, CLOSED_STATUSES,
  formatDate, sortRequests, renderTimeline,
} from './utils.js';

const statusDiv  = document.getElementById('mdash-status');
const contentDiv = document.getElementById('mdash-content');
const cards      = document.getElementById('mdash-cards');
const emptyMsg   = document.getElementById('mdash-empty');
const session    = getSession();

// ─── In-memory state ──────────────────────────────────────────────────────────

let allRequests    = [];
const timelineCache  = new Map();  // Map avoids prototype-pollution risk
let lastLoadedAt     = 0;          // throttle visibilitychange reloads
const pendingAction  = {};  // reqId → action string, for the two-step confirm flow
const profileCache   = {};  // menteeId → profile object

// ─── Card rendering ───────────────────────────────────────────────────────────

const LEVEL_MAP = { beginner: 'מתחיל/ה', intermediate: 'בינוני/ת', advanced: 'מתקדם/ת' };

function actionButtons(req) {
  switch (req.status) {
    case 'pending':
      return `<div class="d-flex flex-wrap gap-2 mt-3">
        <button class="btn btn-sm btn-success"        data-id="${req.id}" data-action="approved">✓ אישור</button>
        <button class="btn btn-sm btn-danger"         data-id="${req.id}" data-action="rejected">✗ דחייה</button>
        <button class="btn btn-sm btn-info text-dark" data-id="${req.id}" data-action="needs_info">? דורש פרטים</button>
      </div>`;
    case 'approved':
      return `<div class="mt-3">
        <button class="btn btn-sm btn-outline-secondary" data-id="${req.id}" data-action="completed">סיום</button>
      </div>`;
    case 'needs_info':
      return `<p class="text-muted small mt-3 mb-0 fst-italic">ממתין לתגובת מנטי</p>`;
    default:
      return '';
  }
}

function renderCard(req) {
  const meta     = STATUS_META[req.status] ?? { label: req.status, color: 'light', dark: true };
  const badge    = `<span class="badge bg-${meta.color}${meta.dark ? ' text-dark' : ''}">${meta.label}</span>`;
  const isClosed = CLOSED_STATUSES.has(req.status);
  const dimStyle = isClosed ? 'opacity:0.65;' : '';

  const description = req.description
    ? `<p class="card-text small text-muted mt-2 mb-1">${escapeHtml(req.description)}</p>`
    : '';

  // Show the mentee's reply only when status is pending (just after resubmit) —
  // past replies are visible in the timeline history.
  const menteeReplyBlock = req.menteeReply && req.status === 'pending'
    ? `<div class="p-2 mt-2 rounded bg-light border-start border-3 border-primary small">
         <span class="fw-semibold">תגובת המנטי:</span> ${escapeHtml(req.menteeReply)}
       </div>`
    : '';

  const hasActions = req.status === 'pending' || req.status === 'approved';
  const actionArea = hasActions ? `
    <div id="action-area-${req.id}" class="card-footer bg-light py-3" hidden>
      <textarea id="response-${req.id}" class="form-control form-control-sm mb-2" rows="2"
        placeholder="הוסף הערה למנטי (לא חובה)"></textarea>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-primary confirm-action"          data-id="${req.id}">שלח</button>
        <button class="btn btn-sm btn-outline-secondary cancel-action" data-id="${req.id}">ביטול</button>
      </div>
    </div>` : '';

  return `
    <div class="col-md-6" id="req-${req.id}">
      <div class="card border-0 shadow-sm border-start border-4 border-${meta.color}"
           style="min-height:100%;${dimStyle}" dir="rtl">
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-center mb-3">
            ${badge}
            <small class="text-muted">${formatDate(req.createdAt)}</small>
          </div>
          <h6 class="card-title mb-1">${escapeHtml(req.topic)}</h6>
          <p class="text-muted small mb-1">מנטי: <strong>${escapeHtml(req.menteeName ?? '—')}</strong>
            <button class="btn btn-link btn-sm p-0 ms-2 toggle-mentee-profile"
              data-req-id="${req.id}" data-mentee-id="${req.menteeId}">פרטי פרופיל ▼</button>
          </p>
          <div id="mentee-profile-${req.id}" class="border rounded p-2 mb-2 bg-light small" hidden></div>
          ${description}
          ${menteeReplyBlock}
          <div class="mt-auto">
            ${actionButtons(req)}
            <button class="btn btn-link btn-sm p-0 mt-2 toggle-timeline" data-id="${req.id}">היסטוריה ▼</button>
          </div>
        </div>
        <div id="timeline-${req.id}" class="border-top" style="max-height:260px;overflow-y:auto;" hidden>
          <div id="timeline-body-${req.id}"></div>
        </div>
        ${actionArea}
      </div>
    </div>`;
}

// ─── Per-card event binding ───────────────────────────────────────────────────

function renderProfileRows(profile) {
  const rows = [
    ['שם מלא',      profile.fullName],
    ['אימייל',      profile.email],
    ['רמת ניסיון', profile.experienceLevel
      ? (LEVEL_MAP[profile.experienceLevel] ?? profile.experienceLevel) : null],
    ['תחומי עניין', profile.interests?.length ? profile.interests.join(', ') : null],
    ['מטרות',       profile.goals],
  ].filter(([, v]) => v);

  return rows.map(([label, value]) =>
    `<div class="row mb-1">
       <div class="col-4 text-muted fw-bold">${label}</div>
       <div class="col-8">${escapeHtml(String(value))}</div>
     </div>`
  ).join('');
}

function bindCard(col, req) {
  // ── Action buttons (approve / reject / needs_info / complete) ──
  col.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      pendingAction[req.id] = btn.dataset.action;
      // Close any other open action areas first
      document.querySelectorAll('[id^="action-area-"]').forEach(el => { el.hidden = true; });
      const area = document.getElementById(`action-area-${req.id}`);
      if (area) area.hidden = false;
    });
  });

  col.querySelector('.cancel-action')?.addEventListener('click', () => {
    const area = document.getElementById(`action-area-${req.id}`);
    if (area) area.hidden = true;
    delete pendingAction[req.id];
  });

  col.querySelector('.confirm-action')?.addEventListener('click', async (e) => {
    const btn          = e.currentTarget;
    const action       = pendingAction[req.id];
    const responseEl   = document.getElementById(`response-${req.id}`);
    const mentorResponse = responseEl?.value.trim() || null;

    // Require response text for rejection or info requests
    if (!mentorResponse && (action === 'rejected' || action === 'needs_info')) {
      responseEl.classList.add('is-invalid');
      responseEl.placeholder = action === 'rejected'
        ? 'חובה לציין סיבת הדחייה'
        : 'חובה לציין מה נדרש מהמנטי';
      responseEl.focus();
      return;
    }
    responseEl?.classList.remove('is-invalid');
    btn.disabled = true;

    const { ok, data } = await authedFetch(`/requests/${req.id}`, {
      method: 'PATCH',
      body: { status: action, mentorResponse },
    });

    if (ok) {
      delete pendingAction[req.id];
      updateCard(data);
    } else {
      btn.disabled = false;
      statusDiv.innerHTML = '<div class="alert alert-danger">שגיאה בעדכון הבקשה. אנא נסה/י שוב.</div>';
    }
  });

  // ── Mentee profile toggle ──
  const profileBtn = col.querySelector('.toggle-mentee-profile');
  if (profileBtn) {
    profileBtn.addEventListener('click', async () => {
      const panel = document.getElementById(`mentee-profile-${req.id}`);

      if (!panel.hidden) {
        panel.hidden = true;
        profileBtn.textContent = 'פרטי פרופיל ▼';
        return;
      }

      if (profileCache[req.menteeId]) {
        panel.innerHTML = renderProfileRows(profileCache[req.menteeId]);
        panel.hidden = false;
        profileBtn.textContent = 'פרטי פרופיל ▲';
        return;
      }

      profileBtn.textContent = 'טוען...';
      const { ok, data } = await authedFetch(`/mentees/${req.menteeId}`);
      if (ok) {
        profileCache[req.menteeId] = data;
        panel.innerHTML = renderProfileRows(data);
      } else {
        panel.innerHTML = '<span class="text-danger">לא ניתן לטעון את הפרופיל.</span>';
      }
      panel.hidden = false;
      profileBtn.textContent = 'פרטי פרופיל ▲';
    });
  }

  // ── Timeline toggle ──
  col.querySelector('.toggle-timeline')?.addEventListener('click', async (e) => {
    const btn   = e.currentTarget;
    const panel = document.getElementById(`timeline-${req.id}`);
    const body  = document.getElementById(`timeline-body-${req.id}`);

    if (!panel.hidden) {
      panel.hidden = true;
      btn.textContent = 'היסטוריה ▼';
      return;
    }

    btn.textContent = 'טוען...';

    if (!timelineCache.has(req.id)) {
      const { ok, data } = await authedFetch(`/requests/${req.id}/timeline`);
      timelineCache.set(req.id, ok ? data : []);
    }

    body.innerHTML = renderTimeline(timelineCache.get(req.id), session.role);
    panel.hidden = false;
    btn.textContent = 'היסטוריה ▲';
  });
}

// ─── Partial card update (no full reload) ────────────────────────────────────

function updateCard(req) {
  const wasTimelineOpen = document.getElementById(`timeline-${req.id}`)?.hidden === false;

  const idx = allRequests.findIndex(r => r.id === req.id);
  if (idx >= 0) allRequests[idx] = req;

  timelineCache.delete(req.id);

  const oldCol = document.getElementById(`req-${req.id}`);
  if (!oldCol) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = renderCard(req);
  const newCol = tmp.firstElementChild;
  oldCol.replaceWith(newCol);
  bindCard(newCol, req);

  if (wasTimelineOpen) {
    newCol.querySelector('.toggle-timeline')?.click();
  }
}

// ─── Full load ────────────────────────────────────────────────────────────────

async function load() {
  statusDiv.innerHTML = '';
  cards.innerHTML = '<p class="text-muted">טוען...</p>';

  const { ok, data } = await authedFetch('/requests');
  if (!ok) {
    cards.innerHTML = '<p class="text-danger">שגיאה בטעינת הבקשות.</p>';
    return;
  }

  allRequests = sortRequests(data.filter(r => r.mentorId === session.uid));

  if (allRequests.length === 0) {
    cards.innerHTML = '';
    emptyMsg.hidden = false;
    return;
  }

  lastLoadedAt = Date.now();
  emptyMsg.hidden = true;
  cards.innerHTML = allRequests.map(renderCard).join('');
  allRequests.forEach(req => {
    const col = document.getElementById(`req-${req.id}`);
    if (col) bindCard(col, req);
  });

  const hash = window.location.hash;
  if (hash) {
    const target = document.querySelector(hash);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────

if (!session) {
  contentDiv.hidden = true;
  statusDiv.innerHTML = '<div class="alert alert-warning">יש להתחבר תחילה. <a href="/he/mentorship/login/">כניסה למערכת</a></div>';
} else if (session.role !== 'mentor') {
  contentDiv.hidden = true;
  statusDiv.innerHTML = '<div class="alert alert-warning">דשבורד זה מיועד למנטורים בלבד.</div>';
} else {
  load();
  // Refresh when the notification poller detects new incoming notifications
  window.addEventListener('mentorship:new-notifications', () => load());

  // Refresh cards when user returns to the tab, throttled to once per 60 s
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - lastLoadedAt >= 60_000) load();
  });
}
