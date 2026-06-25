import { getSession, authedFetch } from './api.js';
import {
  escapeHtml, STATUS_META, CLOSED_STATUSES,
  formatDate, sortRequests, renderTimeline,
} from './utils.js';

const statusDiv  = document.getElementById('dash-status');
const contentDiv = document.getElementById('dash-content');
const cards      = document.getElementById('dash-cards');
const emptyMsg   = document.getElementById('dash-empty');
const session    = getSession();

// ─── In-memory state ──────────────────────────────────────────────────────────

let allRequests     = [];          // kept in sync so updateCard can work without a full reload
const timelineCache = new Map();   // Map avoids prototype-pollution risk; cleared per-request on PATCH
let lastLoadedAt    = 0;           // throttle visibilitychange reloads

// ─── Card rendering ───────────────────────────────────────────────────────────

function renderCard(req) {
  const meta    = STATUS_META[req.status] ?? { label: req.status, color: 'light', dark: true };
  const badge   = `<span class="badge bg-${meta.color}${meta.dark ? ' text-dark' : ''}">${meta.label}</span>`;
  const isClosed = CLOSED_STATUSES.has(req.status);
  const dimStyle = isClosed ? 'opacity:0.65;' : '';

  // Only show the mentor's response when the request is still active
  const responseBlock = req.mentorResponse && !isClosed
    ? `<div class="p-2 mt-3 rounded bg-light border-start border-3 border-${meta.color} small">
         <span class="fw-semibold">תגובת המנטור:</span> ${escapeHtml(req.mentorResponse)}
       </div>`
    : '';

  // Cancel: only while pending
  const cancelBtn = req.status === 'pending'
    ? `<button class="btn btn-sm btn-outline-danger mt-3 cancel-btn" data-id="${req.id}">ביטול הבקשה</button>`
    : '';

  // Mark complete: only while approved
  const completeBtn = req.status === 'approved'
    ? `<button class="btn btn-sm btn-outline-secondary mt-3 complete-btn" data-id="${req.id}">סימון כהושלם</button>`
    : '';

  // Reply to needs_info
  const resubmitArea = req.status === 'needs_info'
    ? `<div class="mt-3 pt-2 border-top">
        <label class="form-label small fw-semibold mb-1">תשובה למנטור/ית <span class="text-muted fw-normal">(לא חובה)</span></label>
        <textarea id="reply-${req.id}" class="form-control form-control-sm mb-2" rows="3"
          placeholder="הוסף/י פרטים נוספים שיעזרו למנטור/ית להשיב לך..."></textarea>
        <button class="btn btn-sm btn-primary resubmit-btn" data-id="${req.id}">שלח/י תגובה</button>
      </div>`
    : '';

  return `
    <div class="col-md-6" id="req-${req.id}">
      <div class="card border-0 shadow-sm border-start border-4 border-${meta.color}"
           style="${dimStyle}" dir="rtl">
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-center mb-3">
            ${badge}
            <small class="text-muted">${formatDate(req.createdAt)}</small>
          </div>
          <h6 class="card-title mb-1">${escapeHtml(req.topic)}</h6>
          <p class="text-muted small mb-0">מנטור: <strong>${escapeHtml(req.mentorName ?? '—')}</strong></p>
          <div class="mt-auto">
            ${responseBlock}
            ${resubmitArea}
            ${cancelBtn}
            ${completeBtn}
            <button class="btn btn-link btn-sm p-0 mt-2 toggle-timeline" data-id="${req.id}">היסטוריה ▼</button>
          </div>
        </div>
        <div id="timeline-${req.id}" class="border-top" style="max-height:260px;overflow-y:auto;" hidden>
          <div id="timeline-body-${req.id}"></div>
        </div>
      </div>
    </div>`;
}

// ─── Per-card event binding ───────────────────────────────────────────────────

function bindCard(col, req) {
  col.querySelector('.resubmit-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const replyEl = document.getElementById(`reply-${req.id}`);
    const menteeReply = replyEl?.value.trim() || null;
    btn.disabled = true;
    const { ok, data } = await authedFetch(`/requests/${req.id}`, {
      method: 'PATCH',
      body: { status: 'pending', menteeReply },
    });
    if (ok) {
      updateCard(data);
    } else {
      btn.disabled = false;
      statusDiv.innerHTML = '<div class="alert alert-danger">שגיאה בשליחה. אנא נסה/י שוב.</div>';
    }
  });

  col.querySelector('.cancel-btn')?.addEventListener('click', async () => {
    if (!confirm('האם לבטל את הבקשה?')) return;
    const btn = col.querySelector('.cancel-btn');
    btn.disabled = true;
    const { ok, data } = await authedFetch(`/requests/${req.id}`, {
      method: 'PATCH',
      body: { status: 'canceled' },
    });
    if (ok) {
      updateCard(data);
    } else {
      btn.disabled = false;
    }
  });

  col.querySelector('.complete-btn')?.addEventListener('click', async () => {
    const btn = col.querySelector('.complete-btn');
    btn.disabled = true;
    const { ok, data } = await authedFetch(`/requests/${req.id}`, {
      method: 'PATCH',
      body: { status: 'completed' },
    });
    if (ok) {
      updateCard(data);
    } else {
      btn.disabled = false;
    }
  });

  col.querySelector('.toggle-timeline')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
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
  // Remember whether the history panel was open so we can restore it after the re-render
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

  // Re-open the history panel and fetch fresh events if it was visible before
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

  allRequests = sortRequests(data.filter(r => r.menteeId === session.uid));

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

  // Scroll to hash anchor if navigated from a notification deep-link
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
} else if (session.role !== 'mentee') {
  contentDiv.hidden = true;
  statusDiv.innerHTML = '<div class="alert alert-warning">דשבורד זה מיועד למנטים בלבד.</div>';
} else {
  load();
  // Refresh when the notification poller detects new incoming notifications
  window.addEventListener('mentorship:new-notifications', () => load());

  // Refresh cards when user returns to the tab, throttled to once per 60 s
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - lastLoadedAt >= 60_000) load();
  });
}
