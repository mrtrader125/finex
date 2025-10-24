// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-firestore.js";

// --- Firebase Config ---
const firebaseConfig = { apiKey: "AIzaSyCRtzONV0M1syCLTF6H5__cGEBgJxM13sM", authDomain: "adminpanel-93879.firebaseapp.com", projectId: "adminpanel-93879", storageBucket: "adminpanel-93879.appspot.com", messagingSenderId: "854889610123", appId: "1:854889610123:web:4522c7fc685e9864014d8e" };
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- Available Sidebar Items (Updated Structure) ---
export const allSidebarItems = [
    { id: 'dashboard', href: 'member_dashboard.html', icon: 'fa-tachometer-alt', text: 'Dashboard' },
    { id: 'portfolio', href: 'portfolio.html', icon: 'fa-wallet', text: 'Portfolio' },
    { id: 'articles', href: 'articles.html', icon: 'fa-book-reader', text: 'Articles' },
    { id: 'analysis', href: 'analysis.html', icon: 'fa-image', text: 'Analysis' },
    // Combined Planning & Journaling Dropdown
    {
        id: 'planning', // ID for the dropdown parent
        icon: 'fa-clipboard-list', // Example parent icon
        text: 'Plan & Journal',
        subItems: [
            { id: 'checklist', href: 'weekly_checklist.html', icon: 'fa-clipboard-check', text: 'Weekly Checklist' },
            { id: 'journal', href: 'trading_journal.html', icon: 'fa-book', text: 'Trading Journal' }
        ]
    },
    { id: 'results', href: 'real_results.html', icon: 'fa-chart-line', text: 'Real-World Results' },
    { id: 'screener', href: 'market_screener.html', icon: 'fa-search-dollar', text: 'Market Screener' },
    { id: 'news', href: 'news.html', icon: 'fa-newspaper', text: 'Live News Feed' },
    { id: 'calendar', href: 'economic_calendar.html', icon: 'fa-calendar-alt', text: 'Economic Calendar' },
    { id: 'tools', href: 'tools_calculators.html', icon: 'fa-tools', text: 'Tools' },
    { id: 'settings', href: 'settings.html', icon: 'fa-user-cog', text: 'Settings' },
];

let userPreferences = {
    theme: 'dark',
    sidebarItems: {}
};
// Initialize default visibility - now handles subItems correctly if needed
function initializeDefaultVisibility(items) {
    items.forEach(item => {
        userPreferences.sidebarItems[item.id] = true; // Parent/Standard item visible by default
        if (item.subItems && Array.isArray(item.subItems)) {
            // Ensure sub-items have visibility tracked if needed, default to true
             item.subItems.forEach(subItem => {
                 // Use sub-item ID for tracking, default to true
                 userPreferences.sidebarItems[subItem.id] = true;
             });
            // Note: We currently only control visibility of top-level items in settings.
            // If you want to control sub-item visibility, the settings page needs updating.
        }
    });
}
initializeDefaultVisibility(allSidebarItems);


// --- Main App Initialization ---
export async function initializeAppCore(pageSpecificInit) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await loadCommonComponents();
            const settingsDocRef = doc(db, `users/${user.uid}/preferences`, 'settings');
            await loadPreferences(settingsDocRef);
            applyTheme(userPreferences.theme);
            renderSidebar();
            attachCoreEventListeners(); // Ensure this is called AFTER components are loaded
            const userEmailSpan = document.getElementById('user-email');
            if (userEmailSpan) userEmailSpan.textContent = user.email;
            if (pageSpecificInit && typeof pageSpecificInit === 'function') {
                pageSpecificInit(user, db);
            }
            const appWrapper = document.getElementById('app-wrapper');
            if (appWrapper) appWrapper.style.display = 'block';
        } else {
            window.location.replace(new URL('login.html', window.location.href).href);
        }
    });
}

// --- HTML Component Loader --- (No changes needed)
async function loadCommonComponents() {
    const headerPlaceholder = document.getElementById('header-placeholder');
    const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
    try {
        const [headerRes, sidebarRes] = await Promise.all([ fetch('_header.html'), fetch('_sidebar.html') ]);
        if (!headerRes.ok) throw new Error(`Failed to load _header.html: ${headerRes.statusText}`);
        if (!sidebarRes.ok) throw new Error(`Failed to load _sidebar.html: ${sidebarRes.statusText}`);
        if (headerPlaceholder) headerPlaceholder.innerHTML = await headerRes.text();
        if (sidebarPlaceholder) sidebarPlaceholder.innerHTML = await sidebarRes.text();
    } catch (error) {
        console.error("Error loading common components:", error);
        if (headerPlaceholder) headerPlaceholder.innerHTML = "<p class='text-red-500 text-center'>Error loading header.</p>";
        if (sidebarPlaceholder) sidebarPlaceholder.innerHTML = "<p class='text-red-500 text-center'>Error loading sidebar.</p>";
    }
}

// --- Preference Management --- (Handles sidebarItems structure, no change needed here for dropdown logic itself)
async function loadPreferences(settingsDocRef) {
     try {
        const docSnap = await getDoc(settingsDocRef);
        // Reset local prefs to defaults before loading
        userPreferences = { theme: 'dark', sidebarItems: {} };
        initializeDefaultVisibility(allSidebarItems); // Re-init defaults

        if (docSnap.exists()) {
            const loadedPrefs = docSnap.data();
            userPreferences.theme = loadedPrefs.theme || 'dark';
            // Merge sidebar item visibility
            if (loadedPrefs.sidebarItems && typeof loadedPrefs.sidebarItems === 'object') {
                 for (const key in userPreferences.sidebarItems) {
                     // Only update if the key exists in saved preferences AND the default structure
                     if (loadedPrefs.sidebarItems.hasOwnProperty(key)) {
                         userPreferences.sidebarItems[key] = loadedPrefs.sidebarItems[key];
                     }
                 }
            }
        } else {
            await setDoc(settingsDocRef, { ...userPreferences, lastUpdated: serverTimestamp() });
        }
    } catch (error) {
        console.error("Error loading preferences:", error);
         // Fallback hard to defaults on error
         userPreferences = { theme: 'dark', sidebarItems: {} };
         initializeDefaultVisibility(allSidebarItems);
    }
}


// --- Theme Application --- (No changes needed)
export function applyTheme(theme) {
    if (theme === 'light') { document.documentElement.classList.remove('dark'); }
    else { document.documentElement.classList.add('dark'); }
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) { themeToggle.checked = (theme === 'dark'); }
}

// --- Sidebar Rendering & Page Title Setting (UPDATED for Dropdown) ---
export function renderSidebar() {
    const sidebarNav = document.getElementById('sidebar-nav');
    const pageTitleEl = document.getElementById('page-title');
    if (!sidebarNav) { console.error("Sidebar nav element not found!"); return; }

    const currentPage = window.location.pathname.split('/').pop() || 'member_dashboard.html';
    let currentPageTitle = "Dashboard"; // Default title
    let isSubItemActive = false; // Flag to check if current page is within a dropdown
    sidebarNav.innerHTML = ''; // Clear previous links

    allSidebarItems.forEach(item => {
        // Skip rendering if item is marked as hidden in preferences
        if (!userPreferences.sidebarItems[item.id]) {
            return;
        }

        // Check if item has sub-items (Dropdown case)
        if (item.subItems && Array.isArray(item.subItems)) {
            const dropdownContainer = document.createElement('div');
            let parentIsActive = false; // Check if any sub-item is active

            // Create Toggle Button
            const toggleButton = document.createElement('button');
            toggleButton.className = 'sidebar-link w-full flex items-center justify-between gap-4 p-3 rounded-lg text-left'; // Adjusted classes for button
            toggleButton.setAttribute('type', 'button');
            toggleButton.dataset.toggle = item.id; // ID to target submenu

            // Check if any sub-item is the current page
            item.subItems.forEach(subItem => {
                if (subItem.href === currentPage) {
                    parentIsActive = true;
                    isSubItemActive = true; // Mark that the active page is a sub-item
                    currentPageTitle = subItem.text; // Use sub-item text for page title
                }
            });

            if (parentIsActive) {
                toggleButton.classList.add('active-parent'); // Add class for styling active parent
            }

            toggleButton.innerHTML = `
                <span class="flex items-center gap-4">
                    <i class="fas ${item.icon} fa-fw w-6"></i>
                    <span>${item.text}</span>
                </span>
                <i class="fas fa-chevron-down text-xs transition-transform duration-200"></i>
            `;
            dropdownContainer.appendChild(toggleButton);

            // Create Submenu Div (Hidden initially)
            const subMenu = document.createElement('div');
            subMenu.id = `submenu-${item.id}`;
            // Use Tailwind classes for styling and hidden state
            subMenu.className = 'pl-6 pt-1 space-y-1 overflow-hidden max-h-0 transition-max-height duration-300 ease-in-out'; 
            // Start collapsed (max-h-0). We'll toggle max-height with JS.

            // Add Submenu Links
            item.subItems.forEach(subItem => {
                // Only render sub-item if its preference allows (if sub-item control is implemented)
                // if (!userPreferences.sidebarItems[subItem.id]) return; 

                const link = document.createElement('a');
                link.href = subItem.href;
                link.className = `sidebar-link flex items-center gap-3 py-2 px-3 rounded-lg text-sm`; // Smaller text/padding
                if (subItem.href === currentPage) {
                    link.classList.add('active'); // Highlight active sub-link
                }
                link.innerHTML = `
                    <i class="fas ${subItem.icon} fa-fw w-5"></i> 
                    <span>${subItem.text}</span>
                `;
                subMenu.appendChild(link);
            });

            dropdownContainer.appendChild(subMenu);
            sidebarNav.appendChild(dropdownContainer);

        } else { // Standard Link Case
            const link = document.createElement('a');
            link.href = item.href;
            link.className = `sidebar-link flex items-center gap-4 p-3 rounded-lg`;
            if (item.href === currentPage && !isSubItemActive) { // Only active if not a sub-item page
                link.classList.add('active');
                currentPageTitle = item.text; // Set title for standard links
            }
            link.innerHTML = `<i class="fas ${item.icon} fa-fw w-6"></i><span>${item.text}</span>`;
            sidebarNav.appendChild(link);
        }
    });

    // Set the Page Title in the Header
    if (pageTitleEl) {
        pageTitleEl.textContent = currentPageTitle;
    } else {
        console.warn("Element with ID 'page-title' not found in the header.");
    }
}


// --- Core Event Listeners Attachment (UPDATED for Dropdown) ---
function attachCoreEventListeners() {
    const openSidebarBtn = document.getElementById('open-sidebar-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebarNav = document.getElementById('sidebar-nav'); // Parent container for delegation
    const logoutBtn = document.getElementById('logout-btn');

    function openSidebar() { /* ... (same as before) ... */
        if(sidebar) sidebar.classList.remove('-translate-x-full');
        if(sidebarOverlay) { sidebarOverlay.classList.remove('hidden'); setTimeout(() => sidebarOverlay.classList.remove('opacity-0'), 10); }
    }
    function closeSidebar() { /* ... (same as before) ... */
         if(sidebar) sidebar.classList.add('-translate-x-full');
         if(sidebarOverlay) { sidebarOverlay.classList.add('opacity-0'); setTimeout(() => sidebarOverlay.classList.add('hidden'), 300); }
    }

    if (openSidebarBtn) openSidebarBtn.addEventListener('click', openSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebar);
    if (logoutBtn) logoutBtn.addEventListener('click', (e) => { /* ... (same logout logic) ... */
        e.preventDefault();
        signOut(auth).then(() => { window.location.href = 'index.html'; })
            .catch((error) => { console.error('Sign out error', error); });
    });

    // Event Delegation for Sidebar Links and Dropdowns
    if (sidebarNav) {
        sidebarNav.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            const toggle = e.target.closest('button[data-toggle]');

            // Handle direct link clicks (close sidebar on mobile)
            if (link && !link.parentElement.classList.contains('sidebar-submenu')) { // Exclude submenu links from immediate close? Maybe not needed.
                if (window.innerWidth < 1024) { closeSidebar(); }
            }
            // Handle Dropdown Toggle Clicks
            else if (toggle) {
                const subMenuId = `submenu-${toggle.dataset.toggle}`;
                const subMenu = document.getElementById(subMenuId);
                const chevron = toggle.querySelector('.fa-chevron-down');

                if (subMenu) {
                     // Check if currently collapsed (max-h-0)
                    if (subMenu.style.maxHeight && subMenu.style.maxHeight !== '0px') {
                         subMenu.style.maxHeight = '0px'; // Collapse
                         toggle.classList.remove('active-parent'); // Optional: remove active style on collapse
                         if(chevron) chevron.classList.remove('rotate-180');
                     } else {
                         // Expand: Set max-height to scrollHeight for smooth transition
                         subMenu.style.maxHeight = subMenu.scrollHeight + "px";
                         toggle.classList.add('active-parent'); // Optional: add active style on expand
                         if(chevron) chevron.classList.add('rotate-180');
                     }
                }
            }
            // Handle submenu link clicks (close sidebar on mobile)
             else if (link && link.closest('.sidebar-submenu')) {
                 if (window.innerWidth < 1024) { closeSidebar(); }
             }
        });
    }
}
