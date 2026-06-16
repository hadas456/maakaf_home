import { getSession, authedFetch } from './api.js';
import { getErrorMessage } from './errors.js';

const statusDiv = document.getElementById('req-status');
const formDiv = document.getElementById('req-form');
const mentorInput = document.getElementById('req-mentor-name');
const topicInput = document.getElementById('req-topic');
const descInput = document.getElementById('req-description');
const submitBtn = document.getElementById('req-submit');

function showStatus(html, type = 'info') {
  statusDiv.innerHTML = `<div class="alert alert-${type}" role="alert">${html}</div>`;
}

const params = new URLSearchParams(window.location.search);
const mentorId = params.get('mentorId');
const mentorName = params.get('mentorName');

const session = getSession();

if (!session) {
  formDiv.hidden = true;
  showStatus('יש להתחבר תחילה כדי לשלוח בקשת מנטורינג. <a href="/he/mentorship/login/">כניסה למערכת</a>', 'warning');
} else if (session.role !== 'mentee') {
  formDiv.hidden = true;
  showStatus('רק מנטים רשומים יכולים לשלוח בקשות מנטורינג.', 'warning');
} else if (!mentorId) {
  formDiv.hidden = true;
  showStatus('לא נבחר מנטור. <a href="/he/mentorship/">חזרה לספריית המנטורים</a>', 'warning');
} else {
  mentorInput.value = mentorName || mentorId;
}

submitBtn.addEventListener('click', async () => {
  const topic = topicInput.value.trim();
  if (!topic) {
    showStatus('יש למלא נושא לבקשה.', 'warning');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'שולח...';

  const { ok, data } = await authedFetch('/requests', {
    method: 'POST',
    body: { mentorId, topic, description: descInput.value.trim() || null },
  });

  if (ok) {
    formDiv.hidden = true;
    showStatus(
      `הבקשה נשלחה בהצלחה! תוכל/י לעקוב אחר הסטטוס ב<a href="/he/mentorship/dashboard/">דשבורד שלי</a>.`,
      'success'
    );
  } else {
    const msg = getErrorMessage(data?.error?.code) || 'שגיאה בשליחת הבקשה. אנא נסה/י שוב.';
    showStatus(msg, 'danger');
    submitBtn.disabled = false;
    submitBtn.textContent = 'שליחת בקשה';
  }
});
