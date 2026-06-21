export function showToast(message, then, delay = 1500) {
  const el = document.createElement('div');
  el.dir = 'rtl';
  el.style.cssText = `
    position: fixed;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    min-width: 280px;
    text-align: center;
    animation: fadeInOut ${delay}ms ease forwards;
  `;
  el.innerHTML = `<div class="alert alert-success shadow-sm mb-0">${message}</div>`;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeInOut {
      0%   { opacity: 0; transform: translateX(-50%) translateY(-10px); }
      15%  { opacity: 1; transform: translateX(-50%) translateY(0); }
      80%  { opacity: 1; }
      100% { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(el);
  setTimeout(() => { document.body.removeChild(el); then(); }, delay);
}
