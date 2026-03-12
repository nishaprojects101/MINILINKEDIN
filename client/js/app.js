// ── API base URL ───────────────────────────────────────────────────
const API = '';

// ── Current user state ─────────────────────────────────────────────
let currentUser = null;

function setCurrentUser(user) {
  currentUser = user;
  localStorage.setItem('minilinkedin_user', JSON.stringify(user));
}

function getCurrentUser() {
  if (currentUser) return currentUser;
  const stored = localStorage.getItem('minilinkedin_user');
  if (stored) {
    currentUser = JSON.parse(stored);
    return currentUser;
  }
  return null;
}

function clearCurrentUser() {
  currentUser = null;
  localStorage.removeItem('minilinkedin_user');
}

// ── Helper: default avatar ─────────────────────────────────────────
function avatarUrl(img, name) {
  if (img) return img;
  const initials = (name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=0a66c2&color=fff&size=128`;
}

// ── Helper: time ago ───────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff/86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ── Helper: escape HTML ────────────────────────────────────────────
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
