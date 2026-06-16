import { apiFetch, saveSession, getSession } from './api.js';
import { describeAuthError, showFormMessage } from './errors.js';
import { showToast } from './toast.js';

const choice = document.getElementById('login-choice');
const wrapper = document.getElementById('login-form-wrapper');
const form = document.getElementById('login-form');
const messageEl = document.getElementById('login-message');

// Already logged in — redirect immediately
const existing = getSession();
if (existing) {
  choice.hidden = true;
  window.location.href = existing.role === 'mentor'
    ? '/he/mentorship/mentor-dashboard/'
    : '/he/mentorship/dashboard/';
}

function showForm() {
  choice.classList.add('d-none');
  wrapper.classList.remove('d-none');
}

function showChoice() {
  wrapper.classList.add('d-none');
  choice.classList.remove('d-none');
  messageEl.classList.add('d-none');
  form.reset();
}

document.getElementById('choose-mentee').addEventListener('click', showForm);
document.getElementById('choose-mentor').addEventListener('click', showForm);
document.getElementById('back-from-login').addEventListener('click', showChoice);

async function handleLoginSubmit(event) {
  event.preventDefault();
  const submitBtn = form.querySelector('button[type="submit"]');
  const email = form.email.value.trim();
  const password = form.password.value;

  submitBtn.disabled = true;
  try {
    const { ok, data } = await apiFetch('/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    if (!ok) {
      showFormMessage(messageEl, describeAuthError(data.error), true);
      return;
    }

    saveSession(data);
    form.hidden = true;
    const dest = data.role === 'mentor'
      ? '/he/mentorship/mentor-dashboard/'
      : '/he/mentorship/dashboard/';
    showToast(`התחברת בהצלחה כ-${data.fullName ?? data.email}`, () => {
      window.location.href = dest;
    });
  } catch (err) {
    showFormMessage(messageEl, describeAuthError(err), true);
  } finally {
    submitBtn.disabled = false;
  }
}

form.addEventListener('submit', handleLoginSubmit);
