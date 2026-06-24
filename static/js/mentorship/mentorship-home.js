import { getSession } from './api.js';

const session = getSession();

if (session) {
  document.getElementById('cta-guest').hidden = true;
}
