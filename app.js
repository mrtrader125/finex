import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-firestore.js";

// --- Firebase Config ---
const firebaseConfig = { apiKey: "AIzaSyCRtzONV0M1syCLTF6H5__cGEBgJxM13sM", authDomain: "adminpanel-93879.firebaseapp.com", projectId: "adminpanel-93879", storageBucket: "adminpanel-93879.appspot.com", messagingSenderId: "854889610123", appId: "1:854889610123:web:4522c7fc685e9864014d8e" };
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- NEW SHARED UTILITY FUNCTIONS ---

/**
 * Calculates the ISO week number string (e.g., "2025-43") for a given date.
 * @param {Date} date The date to get the week ID for.
 * @returns {string} The week ID string.
 */
export function getWeekId(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-${String(weekNo).padStart(2, '0')}`;
}

/**
 * Gets the UTC start (Monday 00:00:00) and end (Sunday 23:59:59) dates for a given date's week.
 * @param {Date} date The date to get the week range for.
 * @returns {{startDate: Date, endDate: Date}} An object with the start and end Date objects.
 */
export function getWeekDateRange(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7; // sunday = 7
    // Set d to Monday of the current week
    d.setUTCDate(d.getUTCDate() - dayNum + 1);
    d.setUTCHours(0, 0, 0, 0);
    const startDate = new Date(d);
    // Set d to Sunday of the current week
    d.setUTCDate(d.getUTCDate() + 6);
    d.setUTCHours(23, 59, 59, 999);
    const endDate = new Date(d);
    return { startDate, endDate };
}

// --- END NEW FUNCTIONS ---


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
    theme: 'dark', // Default theme
    sidebarItems: {} // Default visibility (all true)
};
allSidebarItems.forEach(item => userPreferences.sidebarItems[item.id] = true); // Initialize defaults

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
            renderSidebar(); // This function now also sets the page title

            // 5. Attach core event listeners (sidebar toggle, logout) AFTER components load
            attachCoreEventListeners();

            // 6. Update user email in header
            const userEmailSpan = document.getElementById('user-email');
            if (userEmailSpan) userEmailSpan.textContent = user.email;

            // 7. Run page-specific logic (passed in from the specific page's script)
            if (pageSpecificInit && typeof pageSpecificInit === 'function') {
                pageSpecificInit(user, db); // Pass user and db if needed
            }
            
            // 8. Show the main app content
            const appWrapper = document.getElementById('app-wrapper');
            if (appWrapper) appWrapper.style.display = 'block';

        } else {
            // No user, redirect to login page
            window.location.replace(new URL('login.html', window.location.href).href);
        }
    });
}

// --- HTML Component Loader ---
async function loadCommonComponents() {
    // Find the placeholder elements in the current page
    const headerPlaceholder = document.getElementById('header-placeholder');
    const sidebarPlaceholder = document.getElementById('sidebar-placeholder');

    try {
        // Fetch the HTML content of the header and sidebar templates
        const [headerRes, sidebarRes] = await Promise.all([
            fetch('_header.html'), // Assuming _header.html is in the same directory
            fetch('_sidebar.html')  // Assuming _sidebar.html is in the same directory
        ]);
        
        // Check if fetches were successful
        if (!headerRes.ok) throw new Error(`Failed to load _header.html: ${headerRes.statusText}`);
        if (!sidebarRes.ok) throw new Error(`Failed to load _sidebar.html: ${sidebarRes.statusText}`);

        // Insert the HTML content into the placeholders
        if (headerPlaceholder) headerPlaceholder.innerHTML = await headerRes.text();
        if (sidebarPlaceholder) sidebarPlaceholder.innerHTML = await sidebarRes.text();

    } catch (error) {
        console.error("Error loading common components:", error);
        // Optionally display an error message to the user on the page
        if (headerPlaceholder) headerPlaceholder.innerHTML = "<p class='text-red-500 text-center'>Error loading header.</p>";
        if (sidebarPlaceholder) sidebarPlaceholder.innerHTML = "<p class='text-red-500 text-center'>Error loading sidebar.</p>";
    }
}

// --- Preference Management ---
async function loadPreferences(settingsDocRef) {
    try {
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
            const loadedPrefs = docSnap.data();
            // Load theme, defaulting to 'dark' if not found
            userPreferences.theme = loadedPrefs.theme || 'dark';
            
            // Load sidebar item visibility, merging with defaults
            userPreferences.sidebarItems = { /* Default visibility */ };
            allSidebarItems.forEach(item => userPreferences.sidebarItems[item.id] = true); // Start with all true
            
            if (loadedPrefs.sidebarItems && typeof loadedPrefs.sidebarItems === 'object') {
                 // Update visibility based on saved preferences
                 for (const key in userPreferences.sidebarItems) {
                     if (loadedPrefs.sidebarItems.hasOwnProperty(key)) {
                         // Only update if the key exists in the saved preferences
                         userPreferences.sidebarItems[key] = loadedPrefs.sidebarItems[key];
                     }
                 }
            }
            // If sidebarItems was missing entirely, the defaults remain.
        } else {
            // No settings document found, save the default preferences
            console.log("No user preferences found, saving defaults.");
            await setDoc(settingsDocRef, { ...userPreferences, lastUpdated: serverTimestamp() });
        }
    } catch (error) {
        console.error("Error loading preferences:", error);
        // Fallback to defaults in case of error
        userPreferences.theme = 'dark';
        userPreferences.sidebarItems = {};
        allSidebarItems.forEach(item => userPreferences.sidebarItems[item.id] = true);
    }
}

// --- Theme Application ---
export function applyTheme(theme) {
    if (theme === 'light') {
        document.documentElement.classList.remove('dark');
    } else {
        document.documentElement.classList.add('dark'); // Add dark class if not light
    }
    // Update the toggle on the settings page if it exists
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.checked = (theme === 'dark');
    }
}

// --- Sidebar Rendering & Page Title Setting ---
export function renderSidebar() {
    const sidebarNav = document.getElementById('sidebar-nav');
    const pageTitleEl = document.getElementById('page-title'); // Get page title element
    if (!sidebarNav) return; // Exit if sidebar nav area doesn't exist

    const currentPage = window.location.pathname.split('/').pop() || 'member_dashboard.html'; // Default to dashboard if root path
    let currentPageTitle = "Dashboard"; // Default page title
    sidebarNav.innerHTML = ''; // Clear existing links

    allSidebarItems.forEach(item => {
        // Render the link only if its visibility preference is true
        if (userPreferences.sidebarItems[item.id]) {
            const link = document.createElement('a');
            link.href = item.href;
            // Use the static dark theme class for links
            link.className = `sidebar-link flex items-center gap-4 p-3 rounded-lg`; 
            
            // Check if this link corresponds to the current page
            if (item.href === currentPage) {
                link.classList.add('active'); // Highlight the active link
                currentPageTitle = item.text; // Update the page title
            }
            
            link.innerHTML = `<i class="fas ${item.icon} fa-fw w-6"></i><span>${item.text}</span>`;
            sidebarNav.appendChild(link);
        }
    });

    // Set the dynamically determined page title in the header
    if (pageTitleEl) {
        pageTitleEl.textContent = currentPageTitle;
    } else {
        console.warn("Element with ID 'page-title' not found in the header.");
    }
}

// --- Core Event Listeners Attachment ---
function attachCoreEventListeners() {
    // Ensure elements exist before attaching listeners
    const openSidebarBtn = document.getElementById('open-sidebar-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebarNav = document.getElementById('sidebar-nav');
    const logoutBtn = document.getElementById('logout-btn');

    // Sidebar toggle functions
    function openSidebar() { 
        if(sidebar) sidebar.classList.remove('-translate-x-full'); 
        if(sidebarOverlay) {
            sidebarOverlay.classList.remove('hidden'); 
            // Delay opacity transition slightly to ensure element is visible
            setTimeout(() => sidebarOverlay.classList.remove('opacity-0'), 10); 
        }
    }
    function closeSidebar() { 
        if(sidebar) sidebar.classList.add('-translate-x-full'); 
        if(sidebarOverlay) {
            sidebarOverlay.classList.add('opacity-0'); 
            // Hide after transition ends
            setTimeout(() => sidebarOverlay.classList.add('hidden'), 300); 
        }
    }

    // Attach listeners only if elements exist
    if (openSidebarBtn) openSidebarBtn.addEventListener('click', openSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
    // Close sidebar on link click on smaller screens
    if (sidebarNav) sidebarNav.addEventListener('click', (e) => { 
        if (e.target.closest('a') && window.innerWidth < 1024) { 
            closeSidebar(); 
        } 
    }); 
    // Logout functionality
    if (logoutBtn) logoutBtn.addEventListener('click', (e) => { 
        e.preventDefault(); 
        signOut(auth).then(() => {
            console.log('User signed out, redirecting to index.html');
            window.location.href = 'index.html'; // Redirect to public home after logout
        }).catch((error) => {
            console.error('Sign out error', error);
        }); 
    });
}
