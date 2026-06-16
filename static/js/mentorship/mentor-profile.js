import { apiFetch } from './api.js';

const statusDiv = document.getElementById('mentor-status');
const profileDiv = document.getElementById('mentor-profile');

function showError(msg) {
  statusDiv.innerHTML = `<div class="alert alert-warning">${msg}</div>`;
}

const mentorId = new URLSearchParams(window.location.search).get('mentorId');

if (!mentorId) {
  showError('לא נבחר מנטור. <a href="/he/mentorship/">חזרה לספרייה</a>');
} else {
  (async () => {
    const { ok, data } = await apiFetch(`/mentors/${mentorId}`);

    if (!ok) {
      showError('המנטור לא נמצא. <a href="/he/mentorship/">חזרה לספרייה</a>');
      return;
    }

    document.title = `${data.fullName} | מנטורינג מעקף`;
    document.getElementById('mentor-name').textContent = data.fullName;

    const parts = [data.currentRole, data.company ? `@ ${data.company}` : null].filter(Boolean);
    document.getElementById('mentor-subtitle').textContent = parts.join(' ');

    document.getElementById('mentor-expertise').innerHTML = (data.expertise || [])
      .map(e => `<span class="badge bg-primary me-1">${e}</span>`)
      .join('');

    const available = data.availability !== 'unavailable';
    document.getElementById('mentor-avail-badge').innerHTML = available
      ? '<span class="badge bg-success">פנוי/ה למנטורינג</span>'
      : '<span class="badge bg-secondary">עומס מלא כרגע</span>';

    if (data.yearsExperience) {
      document.getElementById('mentor-years').textContent = `${data.yearsExperience} שנות ניסיון`;
    }

    const btn = document.getElementById('mentor-request-btn');
    if (available) {
      btn.href = `/he/mentorship/request/?mentorId=${mentorId}&mentorName=${encodeURIComponent(data.fullName)}`;
    } else {
      btn.classList.replace('btn-primary', 'btn-secondary');
      btn.setAttribute('disabled', 'disabled');
      btn.removeAttribute('href');
      btn.textContent = 'לא פנוי/ה כרגע';
    }

    profileDiv.hidden = false;
  })();
}
