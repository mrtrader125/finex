import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-firestore.js";

// --- Firebase Config ---
const firebaseConfig = { apiKey: "AIzaSyCRtzONV0M1syCLTF6H5__cGEBgJxM13sM", authDomain: "adminpanel-93879.firebaseapp.com", projectId: "adminpanel-93879", storageBucket: "adminpanel-93879.appspot.com", messagingSenderId: "854889610123", appId: "1:854889610123:web:4522c7fc685e9864014d8e" };
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- Available Sidebar Items ---
export const allSidebarItems = [
    { id: 'dashboard', href: 'member_dashboard.html', icon: 'fa-tachometer-alt', text: 'Dashboard' },
    { id: 'portfolio', href: 'portfolio.html', icon: 'fa-wallet', text: 'Portfolio' },
    { id: 'articles', href: 'articles.html', icon: 'fa-book-reader', text: 'Articles' },
    { id: 'analysis', href: 'analysis.html', icon: 'fa-image', text: 'Analysis' },
    { id: 'checklist', href: 'weekly_checklist.html', icon: 'fa-clipboard-check', text: 'Weekly Checklist' },
    { id: 'results', href: 'real_results.html', icon: 'fa-chart-line', text: 'Real-World Results' },
    { id: 'screener', href: 'market_screener.html', icon: 'fa-search-dollar', text: 'Market Screener' },
    { id: 'news', href: 'news.html', icon: 'fa-newspaper', text: 'Live News Feed' },
    { id: 'calendar', href: 'economic_calendar.html', icon: 'fa-calendar-alt', text: 'Economic Calendar' },
    { id: 'journal', href: 'trading_journal.html', icon: 'fa-book', text: 'Trading Journal' },
    { id: 'tools', href: 'tools_calculators.html', icon: 'fa-tools', text: 'Tools' },
    { id: 'settings', href: 'settings.html', icon: 'fa-user-cog', text: 'Settings' },
];

let userPreferences = {
    theme: 'dark',
    sidebarItems: {}
};
allSidebarItems.forEach(item => userPreferences.sidebarItems[item.id] = true); // Default all to visible

// --- Main App Initialization ---
export async function initializeAppCore(pageSpecificInit) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // 1. Load common HTML components (header, sidebar)
            await loadCommonComponents();

            // 2. Load user preferences
            const settingsDocRef = doc(db, `users/${user.uid}/preferences`, 'settings');
            await loadPreferences(settingsDocRef);

            // 3. Apply theme
            applyTheme(userPreferences.theme);

            // 4. Render sidebar based on preferences
            renderSidebar();

            // 5. Attach core event listeners (sidebar toggle, logout)
            attachCoreEventListeners();

            // 6. Update user email in header
            const userEmailSpan = document.getElementById('user-email');
            if (userEmailSpan) userEmailSpan.textContent = user.email;

            // 7. Run page-specific logic
            if (pageSpecificInit && typeof pageSpecificInit === 'function') {
                pageSpecificInit(user, db);
            }
            
            // 8. Show the app
            document.getElementById('app-wrapper').style.display = 'block';

        } else {
            // No user, redirect to login
            window.location.replace(new URL('login.html', window.location.href).href);
        }
    });
}

// --- HTML Component Loader ---
async function loadCommonComponents() {
    const headerPlaceholder = document.getElementById('header-placeholder');
    const sidebarPlaceholder = document.getElementById('sidebar-placeholder');

    try {
        const [headerRes, sidebarRes] = await Promise.all([
            fetch('_header.html'),
            fetch('_sidebar.html')
        ]);
        
        if (headerPlaceholder) headerPlaceholder.innerHTML = await headerRes.text();
        if (sidebarPlaceholder) sidebarPlaceholder.innerHTML = await sidebarRes.text();

    } catch (error) {
        console.error("Error loading common components:", error);
    }
}

// --- Preference Management ---
async function loadPreferences(settingsDocRef) {
    try {
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
            const loadedPrefs = docSnap.data();
            userPreferences.theme = loadedPrefs.theme || 'dark';
            userPreferences.sidebarItems = { ...userPreferences.sidebarItems }; // Clone default
            if (loadedPrefs.sidebarItems && typeof loadedPrefs.sidebarItems === 'object') {
                for (const key in userPreferences.sidebarItems) {
                    if (loadedPrefs.sidebarItems.hasOwnProperty(key)) {
                        userPreferences.sidebarItems[key] = loadedPrefs.sidebarItems[key];
                    }
                }
            }
        } else {
            // Save defaults if no settings exist
            await setDoc(settingsDocRef, { ...userPreferences, lastUpdated: serverTimestamp() });
        }
    } catch (error) {
        console.error("Error loading preferences:", error);
    }
}

// --- Theme ---
export function applyTheme(theme) {
    if (theme === 'light') {
        document.documentElement.classList.remove('dark');
    } else {
        document.documentElement.classList.add('dark');
    }
    // For settings page toggle (if it exists)
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.checked = (theme === 'dark');
    }
}

// --- Sidebar Rendering ---
export function renderSidebar() {
    const sidebarNav = document.getElementById('sidebar-nav');
    if (!sidebarNav) return;

    const currentPage = window.location.pathname.split('/').pop();
    let pageTitle = "Dashboard"; // Default
    sidebarNav.innerHTML = ''; 

    allSidebarItems.forEach(item => {
        if (userPreferences.sidebarItems[item.id]) {
            const link = document.createElement('a');
            link.href = item.href;
            link.className = `sidebar-link flex items-center gap-4 p-3 rounded-lg`;
            
            if (item.href === currentPage) {
                link.classList.add('active');
                pageTitle = item.text; // Found the title for the current page
            }
            
            link.innerHTML = `<i class="fas ${item.icon} fa-fw w-6"></i><span>${item.text}</span>`;
            sidebarNav.appendChild(link);
        }
    });

    // Set the header title
    const pageTitleEl = document.getElementById('page-title');
    if (pageTitleEl) pageTitleEl.textContent = pageTitle;
}

// --- Core Event Listeners ---
function attachCoreEventListeners() {
    const openSidebarBtn = document.getElementById('open-sidebar-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebarNav = document.getElementById('sidebar-nav');
    const logoutBtn = document.getElementById('logout-btn');

    function openSidebar() { sidebar.classList.remove('-translate-x-full'); sidebarOverlay.classList.remove('hidden'); setTimeout(() => sidebarOverlay.classList.remove('opacity-0'), 10); }
    function closeSidebar() { sidebar.classList.add('-translate-x-full'); sidebarOverlay.classList.add('opacity-0'); setTimeout(() => sidebarOverlay.classList.add('hidden'), 300); }

    if (openSidebarBtn) openSidebarBtn.addEventListener('click', openSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
    if (sidebarNav) sidebarNav.addEventListener('click', (e) => { if (e.target.closest('a') && window.innerWidth < 1024) { closeSidebar(); } }); 
    if (logoutBtn) logoutBtn.addEventListener('click', (e) => { e.preventDefault(); signOut(auth).then(() => window.location.href = 'index.html'); });
}
