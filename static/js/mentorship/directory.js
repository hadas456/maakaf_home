import { apiFetch } from './api.js';

const grid = document.getElementById('mentor-grid');
const searchInput = document.getElementById('dir-search');
const topicSelect = document.getElementById('dir-topic');
const availSelect = document.getElementById('dir-avail');

let allMentors = [];

function renderCard(mentor) {
  const available = mentor.availability !== 'unavailable';
  const parts = [mentor.currentRole, mentor.company ? `@ ${mentor.company}` : null].filter(Boolean);
  const subtitle = parts.length ? `<h6 class="card-subtitle mb-2 text-muted">${parts.join(' ')}</h6>` : '';
  const badges = (mentor.expertise || []).map(e => `<span class="badge bg-primary">${e}</span>`).join(' ');
  const availBadge = available
    ? '<span class="badge bg-success">פנוי/ה למנטורינג</span>'
    : '<span class="badge bg-secondary">עומס מלא כרגע</span>';
  const profileUrl = `/he/mentorship/directory/mentor/?mentorId=${mentor.id}`;
  const requestBtn = available
    ? `<a href="/he/mentorship/request/?mentorId=${mentor.id}&mentorName=${encodeURIComponent(mentor.fullName)}" class="btn btn-primary btn-sm me-1">שלח/י בקשה</a>`
    : `<button class="btn btn-secondary btn-sm me-1" disabled>לא פנוי/ה כרגע</button>`;
  const btn = `<div class="d-flex flex-wrap gap-2 mt-2">${requestBtn}<a href="${profileUrl}" class="btn btn-outline-secondary btn-sm">לפרופיל המלא</a></div>`;

  return `
    <div class="col-md-4 mb-4">
      <div class="card h-100">
        <div class="card-body">
          <h5 class="card-title">${mentor.fullName}</h5>
          ${subtitle}
          <p class="card-text">${badges}</p>
          <p class="card-text">${availBadge}</p>
          ${btn}
        </div>
      </div>
    </div>`;
}

function applyFilters() {
  const text = searchInput.value.trim().toLowerCase();
  const topic = topicSelect.value;
  const avail = availSelect.value;

  const filtered = allMentors.filter(m => {
    if (avail === 'available' && m.availability === 'unavailable') return false;
    if (avail === 'unavailable' && m.availability !== 'unavailable') return false;
    if (topic) {
      const hasTopicMatch = (m.expertise || []).some(e => e.toLowerCase().includes(topic.toLowerCase()));
      if (!hasTopicMatch) return false;
    }
    if (text) {
      const haystack = [m.fullName, m.currentRole, m.company, ...(m.expertise || [])]
        .filter(Boolean).join(' ').toLowerCase();
      if (!haystack.includes(text)) return false;
    }
    return true;
  });

  grid.innerHTML = filtered.length
    ? filtered.map(renderCard).join('')
    : '<p class="text-muted mt-3">לא נמצאו מנטורים התואמים את החיפוש.</p>';
}

function populateTopics() {
  const seen = new Set();
  allMentors.forEach(m => (m.expertise || []).forEach(e => seen.add(e)));
  const sorted = [...seen].sort((a, b) => a.localeCompare(b, 'he'));
  sorted.forEach(e => {
    const opt = document.createElement('option');
    opt.value = e;
    opt.textContent = e;
    topicSelect.appendChild(opt);
  });
}

async function init() {
  grid.innerHTML = '<p class="text-muted mt-3">טוען מנטורים...</p>';
  const { ok, data } = await apiFetch('/mentors');
  if (!ok) {
    grid.innerHTML = '<p class="text-danger mt-3">שגיאה בטעינת המנטורים. אנא נסה/י שוב מאוחר יותר.</p>';
    return;
  }
  allMentors = data;
  populateTopics();
  applyFilters();
}

searchInput.addEventListener('input', applyFilters);
topicSelect.addEventListener('change', applyFilters);
availSelect.addEventListener('change', applyFilters);

init();
