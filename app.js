// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-firestore.js";

// --- Firebase Config ---
const firebaseConfig = {
    apiKey: "AIzaSyCRtzONV0M1syCLTF6H5__cGEBgJxM13sM",
    authDomain: "adminpanel-93879.firebaseapp.com",
    projectId: "adminpanel-93879",
    storageBucket: "adminpanel-93879.appspot.com",
    messagingSenderId: "854889610123",
    appId: "1:854889610123:web:4522c7fc685e9864014d8e"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- SHARED UTILITY FUNCTIONS ---
export function getWeekId(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-${String(weekNo).padStart(2, '0')}`;
}

export function getWeekDateRange(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diffToMonday));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const mondayUTC = new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0, 0));
    const sundayUTC = new Date(Date.UTC(sunday.getFullYear(), sunday.getMonth(), sunday.getDate(), 23, 59, 59, 999));

    const options = { month: 'short', day: 'numeric' };
    return {
        startDate: mondayUTC,
        endDate: sundayUTC,
        startString: monday.toLocaleDateString('en-US', options),
        endString: sunday.toLocaleDateString('en-US', options)
    };
}

// --- Available Sidebar Items ---
export const allSidebarItems = [
    { id: 'dashboard', href: 'member_dashboard.html', icon: 'fa-tachometer-alt', text: 'Dashboard' },
    { id: 'portfolio', href: 'portfolio.html', icon: 'fa-wallet', text: 'Portfolio' },
    { id: 'articles', href: 'articles.html', icon: 'fa-book-reader', text: 'Articles' },
    { id: 'analysis', href: 'analysis.html', icon: 'fa-image', text: 'Analysis' },
    {
        id: 'planning',
        icon: 'fa-clipboard-list',
        text: 'Plan & Journal',
        subItems: [
            { id: 'checklist', href: 'weekly_checklist.html', icon: 'fa-clipboard-check', text: 'Weekly Checklist' },
            { id: 'journal', href: 'trading_journal.html', icon: 'fa-book', text: 'Trading Journal' },
            { id: 'monthlyReview', href: 'monthly_review.html', icon: 'fa-calendar-check', text: 'Monthly Review' }
        ]
    },
    { id: 'results', href: 'real_results.html', icon: 'fa-chart-line', text: 'Real-World Results' },
    {
        id: 'marketData',
        icon: 'fa-chart-bar',
        text: 'Market Data',
        subItems: [
            { id: 'screener', href: 'market_screener.html', icon: 'fa-search-dollar', text: 'Market Screener' },
            { id: 'news', href: 'news.html', icon: 'fa-newspaper', text: 'Live News Feed' },
            { id: 'calendar', href: 'economic_calendar.html', icon: 'fa-calendar-alt', text: 'Economic Calendar' }
        ]
    },
    { id: 'tools', href: 'tools_calculators.html', icon: 'fa-tools', text: 'Tools' },
    { id: 'snake', href: 'snake_game.html', icon: 'fa-gamepad', text: 'Snake Game' },
    { id: 'settings', href: 'settings.html', icon: 'fa-user-cog', text: 'Settings' },
];

// User preferences
export let userPreferences = {
    theme: localStorage.getItem('finex_theme') || 'dark',
    sidebarItems: {},
    lockedItems: {}
};

// Apply initial theme state
if (typeof window !== 'undefined') {
    const savedTheme = localStorage.getItem('finex_theme');
    if (savedTheme === 'dark') document.documentElement.classList.add('dark');
    else if (savedTheme === 'light') document.documentElement.classList.remove('dark');
}

// --- Main App Initialization ---
export async function initializeAppCore(pageSpecificInit) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {

            // Hide loader, show app
            const appLoader = document.getElementById('app-loader');
            if (appLoader) appLoader.style.display = 'none';

            const appWrapper = document.getElementById('app-wrapper');
            if (appWrapper) appWrapper.style.display = 'block';

            applyTheme(userPreferences.theme);

            const userDocRef = doc(db, 'users', user.uid);
            let userProfile = {
                email: user.email,
                displayName: user.email.split('@')[0]
            };

            try {
                // Load layout files + preferences simultaneously
                const componentsPromise = loadCommonComponents();
                const preferencesPromise = loadPreferences(
                    doc(db, "siteSettings", "sidebarDefaults"),
                    doc(db, `users/${user.uid}/admin_settings`, 'sidebar'),
                    doc(db, `users/${user.uid}/preferences`, 'settings')
                );
                const profilePromise = getDoc(userDocRef);

                // Wait only for UI + preferences
                await Promise.all([componentsPromise, preferencesPromise]);

                applyTheme(userPreferences.theme);
                renderSidebar();
                attachCoreEventListeners();

                const userDocSnap = await profilePromise;
                if (userDocSnap.exists()) {
                    userProfile.displayName = userDocSnap.data().displayName || userProfile.displayName;
                }

                const userEmailSpan = document.getElementById('user-email');
                if (userEmailSpan) userEmailSpan.textContent = userProfile.email;

                if (pageSpecificInit && typeof pageSpecificInit === 'function') {
                    pageSpecificInit(user, db, userProfile);
                }

            } catch (error) {
                console.error("Failed to initialize app components:", error);
                const mainContent = document.querySelector('main');
                if (mainContent) {
                    mainContent.innerHTML = `
                    <p style="color: red; text-align: center; padding: 20px;">
                        Error: Could not load page components. ${error.message}
                    </p>`;
                }
            }

        } else {
            window.location.replace(new URL('login.html', window.location.href).href);
        }
    });
}

// Load layout components
async function loadCommonComponents() {
    const headerPlaceholder = document.getElementById('header-placeholder');
    const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
    if (!headerPlaceholder && !sidebarPlaceholder) return;

    try {
        const [headerRes, sidebarRes] = await Promise.all([
   	fetch('/_header.html'),
   	fetch('/_sidebar.html')
        ]);

        if (headerRes.ok) {
            headerPlaceholder.innerHTML = await headerRes.text();
        } else {
            headerPlaceholder.innerHTML = `<p style="color:red;text-align:center;">Error: Could not load header.</p>`;
        }

        if (sidebarRes.ok) {
            sidebarPlaceholder.innerHTML = await sidebarRes.text();
        } else {
            sidebarPlaceholder.innerHTML = `<p style="color:red;text-align:center;">Error: Could not load sidebar.</p>`;
        }

    } catch (error) {
        console.error("Error loading common components:", error);
        if (headerPlaceholder) headerPlaceholder.innerHTML = `<p style="color:red;text-align:center;">Error loading header.</p>`;
        if (sidebarPlaceholder) sidebarPlaceholder.innerHTML = `<p style="color:red;text-align:center;">Error loading sidebar.</p>`;
    }
}

// Load preferences in correct hierarchy
async function loadPreferences(globalRef, adminRef, userRef) {
    try {
        const [globalSnap, adminSnap, userSnap] = await Promise.all([
            getDoc(globalRef),
            getDoc(adminRef),
            getDoc(userRef)
        ]);

        const globalPrefs = globalSnap.exists() ? globalSnap.data().sidebarItems || {} : {};
        const adminPrefs = adminSnap.exists() ? adminSnap.data() : {};
        const userPrefsDoc = userSnap.exists() ? userSnap.data() : {};
        const userSidebarPrefs = userPrefsDoc.sidebarItems || {};

        userPreferences.theme = userPrefsDoc.theme || localStorage.getItem('finex_theme') || 'dark';

        const finalSidebar = {};
        const lockedItems = {};

        const processItem = (id) => {
            let isVisible = true;
            let isLocked = false;

            // User prefs
            if (userSidebarPrefs[id] !== undefined) isVisible = userSidebarPrefs[id];

            // Admin overrides user
            if (adminPrefs[id] !== undefined) {
                isVisible = adminPrefs[id];
                isLocked = true;
            }

            // Global disables everything
            if (globalPrefs[id] === false) {
                isVisible = false;
                isLocked = true;
            }

            if (isLocked) lockedItems[id] = true;
            return isVisible;
        };

        allSidebarItems.forEach(item => {
            finalSidebar[item.id] = processItem(item.id);
            if (item.subItems) {
                item.subItems.forEach(sub => {
                    finalSidebar[sub.id] = processItem(sub.id);
                });
            }
        });

        userPreferences.sidebarItems = finalSidebar;
        userPreferences.lockedItems = lockedItems;

    } catch (error) {
        console.error("Error loading preferences:", error);
        userPreferences.theme = localStorage.getItem('finex_theme') || 'dark';
    }
}

// Apply theme
export function applyTheme(theme) {
    if (typeof window !== 'undefined') localStorage.setItem('finex_theme', theme);
    userPreferences.theme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) themeToggle.checked = theme === 'dark';
}

// Render sidebar
export function renderSidebar() {
    const sidebarNav = document.getElementById('sidebar-nav');
    const pageTitleEl = document.getElementById('page-title');

    if (!sidebarNav) return;

    const currentPage = window.location.pathname.split('/').pop() || 'member_dashboard.html';
    let currentPageTitle = "Dashboard";

    sidebarNav.innerHTML = '';

    allSidebarItems.forEach(item => {
        if (!userPreferences.sidebarItems[item.id]) return;

        if (item.subItems && Array.isArray(item.subItems)) {
            const visibleSubItems = item.subItems.filter(sub => userPreferences.sidebarItems[sub.id]);
            if (visibleSubItems.length === 0) return;

            const dropdownContainer = document.createElement('div');
            let parentIsActive = false;

            const toggleButton = document.createElement('button');
            toggleButton.className = 'sidebar-link w-full flex items-center justify-between gap-4 p-3 rounded-lg text-left';
            toggleButton.type = 'button';
            toggleButton.dataset.toggle = item.id;

            visibleSubItems.forEach(subItem => {
                if (subItem.href === currentPage) {
                    parentIsActive = true;
                    currentPageTitle = subItem.text;
                }
            });

            if (parentIsActive) toggleButton.classList.add('active-parent');

            toggleButton.innerHTML = `
                <span class="flex items-center gap-4">
                    <i class="fas ${item.icon} fa-fw w-6"></i>
                    <span>${item.text}</span>
                </span>
                <i class="fas fa-chevron-down text-xs transition-transform duration-200 chevron-icon"></i>
            `;

            dropdownContainer.appendChild(toggleButton);

            const subMenu = document.createElement('div');
            subMenu.id = `submenu-${item.id}`;
            subMenu.className = 'pl-6 pt-1 space-y-1 overflow-hidden max-h-0 transition-max-height duration-300 ease-in-out sidebar-submenu';

            visibleSubItems.forEach(subItem => {
                const link = document.createElement('a');
                link.href = subItem.href;
                link.className = 'sidebar-link flex items-center gap-3 py-2 px-3 rounded-lg text-sm';

                if (subItem.href === currentPage) link.classList.add('active');

                link.innerHTML = `<i class="fas ${subItem.icon} fa-fw w-5"></i> <span>${subItem.text}</span>`;
                subMenu.appendChild(link);
            });

            dropdownContainer.appendChild(subMenu);
            sidebarNav.appendChild(dropdownContainer);

        } else {
            const link = document.createElement('a');
            link.href = item.href;
            link.className = 'sidebar-link flex items-center gap-4 p-3 rounded-lg';

            if (item.href === currentPage) {
                link.classList.add('active');
                currentPageTitle = item.text;
            }

            link.innerHTML = `<i class="fas ${item.icon} fa-fw w-6"></i><span>${item.text}</span>`;
            sidebarNav.appendChild(link);
        }
    });

    if (pageTitleEl) {
        pageTitleEl.textContent = currentPageTitle === "Dashboard" ? "Finex" : currentPageTitle;
    }
}
function openSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar || !overlay) return;
  sidebar.classList.remove('-translate-x-full');
  overlay.classList.remove('hidden');
  requestAnimationFrame(() => overlay.classList.remove('opacity-0'));
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar || !overlay) return;
  sidebar.classList.add('-translate-x-full');
  overlay.classList.add('opacity-0');
  setTimeout(() => overlay.classList.add('hidden'), 300);
}

/* Wire once after the header + sidebar HTML are injected */
function wireSidebarOnce() {
  const sidebar  = document.getElementById('sidebar');
  if (!sidebar || sidebar.dataset.wired === '1') return; // idempotent

  const openBtn  = document.getElementById('open-sidebar-btn');
  const closeBtn = document.getElementById('close-sidebar-btn');
  const overlay  = document.getElementById('sidebar-overlay');

  if (openBtn)  openBtn.addEventListener('click', (e) => { e.preventDefault(); openSidebar(); });
  if (closeBtn) closeBtn.addEventListener('click', (e) => { e.preventDefault(); closeSidebar(); });
  if (overlay)  overlay.addEventListener('click', (e) => { e.preventDefault(); closeSidebar(); });

  sidebar.dataset.wired = '1';
}

// Event listeners
function attachCoreEventListeners() {
    document.body.addEventListener('click', (e) => {

        const openBtn = e.target.closest('#open-sidebar-btn');
        const closeBtn = e.target.closest('#close-sidebar-btn');
        const overlay = e.target.closest('#sidebar-overlay');
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');

        if (openBtn && sidebar && sidebarOverlay) {
            sidebar.classList.remove('-translate-x-full');
            sidebarOverlay.classList.remove('hidden');
            setTimeout(() => sidebarOverlay.classList.remove('opacity-0'), 10);
            return;
        }

        if ((closeBtn || overlay) && sidebar && sidebarOverlay) {
            sidebar.classList.add('-translate-x-full');
            sidebarOverlay.classList.add('opacity-0');
            setTimeout(() => sidebarOverlay.classList.add('hidden'), 300);
            return;
        }

        const logoutBtn = e.target.closest('#logout-btn');
        if (logoutBtn) {
            e.preventDefault();
            signOut(auth)
                .then(() => {
                    window.location.href = 'index.html';
                })
                .catch((error) => {
                    console.error('Sign out error', error);
                });
            return;
        }

        const sidebarNav = document.getElementById('sidebar-nav');
        if (sidebarNav && sidebarNav.contains(e.target)) {
            const link = e.target.closest('a');
            const toggle = e.target.closest('button[data-toggle]');

            if (link && !link.closest('.sidebar-submenu')) {
                if (window.innerWidth < 1024) closeSidebar();
            } else if (toggle) {
                const subMenuId = `submenu-${toggle.dataset.toggle}`;
                const subMenu = document.getElementById(subMenuId);
                const chevron = toggle.querySelector('.chevron-icon');

                if (subMenu) {
                    if (subMenu.style.maxHeight && subMenu.style.maxHeight !== '0px') {
                        subMenu.style.maxHeight = '0px';
                        toggle.classList.remove('active-parent');
                        if (chevron) chevron.classList.remove('rotate-180');
                    } else {
                        subMenu.style.maxHeight = subMenu.scrollHeight + "px";
                        toggle.classList.add('active-parent');
                        if (chevron) chevron.classList.add('rotate-180');
                    }
                }

            } else if (link && link.closest('.sidebar-submenu')) {
                if (window.innerWidth < 1024) closeSidebar();
            }
        }
    });
}
