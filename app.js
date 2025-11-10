// app.js — Finex core (ready to replace)
// ES Module. Exports initializeAppCore() and applies premium theme across pages
// No breaking changes: IDs (#theme-toggle, #open-sidebar-btn, #close-sidebar-btn, #sidebar, #sidebar-overlay, #sidebar-nav, #logout-btn)

/* =============================
   THEME
============================= */
const THEME_KEY = 'finex_theme';
export function applyTheme(mode) {
  const root = document.documentElement;
  if (mode === 'light') root.classList.remove('dark');
  else root.classList.add('dark');
  try { localStorage.setItem(THEME_KEY, mode === 'light' ? 'light' : 'dark'); } catch {}
}
function loadInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light') applyTheme('light'); else applyTheme('dark');
  } catch { applyTheme('dark'); }
}

/* =============================
   PARTIALS (HEADER / SIDEBAR)
============================= */
async function injectPartial(targetSelector, url) {
  const el = document.querySelector(targetSelector);
  if (!el) return;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch ' + url);
    el.outerHTML = await res.text();
  } catch (e) {
    console.warn('Partial injection failed:', url, e);
  }
}

// Sidebar links config (adjust routes as needed)
const NAV_ITEMS = [
  { href: 'member_dashboard.html', icon: 'fa-gauge', label: 'Dashboard' },
  { href: 'journal.html',           icon: 'fa-book',  label: 'Trade Journal' },
  { href: 'articles.html',          icon: 'fa-book-open', label: 'Guides' },
  { href: 'analysis.html',          icon: 'fa-chart-line', label: 'Analysis' },
  { href: 'snake_game.html',        icon: 'fa-gamepad', label: 'Break • Snake' },
];

function isActive(href) {
  const url = new URL(href, location.href);
  return location.pathname.endsWith(url.pathname);
}

function renderSidebar() {
  const nav = document.getElementById('sidebar-nav');
  if (!nav) return;
  nav.innerHTML = '';
  NAV_ITEMS.forEach(item => {
    const a = document.createElement('a');
    a.href = item.href;
    a.className = 'sidebar-link flex items-center gap-3 px-3 py-2';
    if (isActive(item.href)) a.classList.add('active');
    a.innerHTML = `
      <i class="fas ${item.icon} w-5 text-center"></i>
      <span>${item.label}</span>
    `;
    nav.appendChild(a);
  });
}

/* =============================
   EVENT LISTENERS
============================= */
function attachCoreEventListeners() {
  document.body.addEventListener('click', (e) => {
    // Theme toggle (header button)
    const tbtn = e.target.closest('#theme-toggle');
    if (tbtn) {
      const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
      applyTheme(next);
      return;
    }

    // Sidebar open/close
    const openBtn = e.target.closest('#open-sidebar-btn');
    const closeBtn = e.target.closest('#close-sidebar-btn');
    const overlay  = e.target.closest('#sidebar-overlay');
    if (openBtn) { openSidebar(); return; }
    if (closeBtn || overlay) { closeSidebar(); return; }
  });

  // Close sidebar on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSidebar();
  });
}

function openSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  if (!sb || !ov) return;
  sb.classList.remove('-translate-x-full');
  ov.classList.remove('hidden');
  requestAnimationFrame(() => { ov.classList.remove('opacity-0'); });
}
function closeSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  if (!sb || !ov) return;
  sb.classList.add('-translate-x-full');
  ov.classList.add('opacity-0');
  ov.addEventListener('transitionend', () => ov.classList.add('hidden'), { once: true });
}

/* =============================
   USER INFO HOOKS (Optional)
============================= */
function setHeaderUser(userProfile) {
  const emailEl = document.getElementById('user-email');
  if (emailEl && userProfile?.email) emailEl.textContent = userProfile.email;
  const nameEl = document.getElementById('member-name');
  if (nameEl && userProfile?.displayName) {
    const n = userProfile.displayName;
    nameEl.textContent = n.charAt(0).toUpperCase() + n.slice(1);
  }
}

/* =============================
   FIREBASE (kept minimal)
============================= */
// If you need to expose db/auth initialized elsewhere, you can assign here.
export let db = undefined; // kept for compatibility with pages that import { db }

/* =============================
   CORE INITIALIZER (EXPORT)
============================= */
export async function initializeAppCore(pageInitCallback) {
  loadInitialTheme();

  // Inject header & sidebar (paths assume same folder; adjust if your partials live elsewhere)
  await Promise.all([
    injectPartial('#header-placeholder', '/_header.html'),
    injectPartial('#sidebar-placeholder', '/_sidebar.html'),
  ]);

  // After injection, render sidebar links and attach listeners
  renderSidebar();
  attachCoreEventListeners();

  // Premium background helpers (opt-in via CSS class from page)
  document.body.classList.add('premium-bg');

  // Allow the hosting page to finish its own setup
  try { if (typeof pageInitCallback === 'function') pageInitCallback(null, db, window.__FINEX_USER__); } catch (e) { console.warn(e); }
}

// Utility to set page title from pages
export function setPageTitle(text){
  const el = document.getElementById('page-title');
  if (el && text) el.textContent = text;
}
