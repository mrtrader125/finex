// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-firestore.js";

// --- Firebase Config ---
const firebaseConfig = { apiKey: "AIzaSyCRtzONV0M1syCLTF6H5__cGEBgJxM13sM", authDomain: "adminpanel-93879.firebaseapp.com", projectId: "adminpanel-93879", storageBucket: "adminpanel-93879.appspot.com", messagingSenderId: "854889610123", appId: "1:854889610123:web:4522c7fc685e9864014d8e" };
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- SHARED UTILITY FUNCTIONS ---
export function getWeekId(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-${String(weekNo).padStart(2, '0')}`;
}
export function getWeekDateRange(date) {
    const d = new Date(date); const day = d.getDay();
    const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diffToMonday)); monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999);
    const mondayUTC = new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0, 0));
    const sundayUTC = new Date(Date.UTC(sunday.getFullYear(), sunday.getMonth(), sunday.getDate(), 23, 59, 59, 999));
    const options = { month: 'short', day: 'numeric' };
    const startString = monday.toLocaleDateString('en-US', options); const endString = sunday.toLocaleDateString('en-US', options);
    return { startDate: mondayUTC, endDate: sundayUTC, startString: startString, endString: endString };
}

// --- Available Sidebar Items (UPDATED STRUCTURE) ---
export const allSidebarItems = [
    { id: 'dashboard', href: 'member_dashboard.html', icon: 'fa-tachometer-alt', text: 'Dashboard' },
    { id: 'portfolio', href: 'portfolio.html', icon: 'fa-wallet', text: 'Portfolio' },
    { id: 'articles', href: 'articles.html', icon: 'fa-book-reader', text: 'Articles' },
    { id: 'analysis', href: 'analysis.html', icon: 'fa-image', text: 'Analysis' },
    // === THIS SECTION IS UPDATED ===
    { id: 'planning', icon: 'fa-clipboard-list', text: 'Plan & Journal', subItems: [
            { id: 'checklist', href: 'weekly_checklist.html', icon: 'fa-clipboard-check', text: 'Weekly Checklist' },
            { id: 'journal', href: 'trading_journal.html', icon: 'fa-book', text: 'Trading Journal' },
            // --- NEW ITEM ADDED BELOW ---
            { id: 'monthlyReview', href: 'monthly_review.html', icon: 'fa-calendar-check', text: 'Monthly Review' }
            // --- END OF NEW ITEM ---
        ] },
    // === END OF UPDATE ===
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
    { id: 'backtesting', href: 'backtesting.html', icon: 'fa-history', text: 'Backtesting' },
    { id: 'settings', href: 'settings.html', icon: 'fa-user-cog', text: 'Settings' },
];

let userPreferences = { theme: 'dark', sidebarItems: {} };
function initializeDefaultVisibility(items) {
     items.forEach(item => {
         userPreferences.sidebarItems[item.id] = true;
         if (item.subItems) {
             item.subItems.forEach(sub => userPreferences.sidebarItems[sub.id] = true);
         }
     });
}
initializeDefaultVisibility(allSidebarItems);


// --- Main App Initialization --- (MODIFIED FOR STABILITY)
export async function initializeAppCore(pageSpecificInit) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            
            // --- STABILITY FIX ---
            // We will wait for components (header/sidebar) AND 
            // preferences (theme) to load *before* hiding the spinner.
            // This prevents all "flashing" and "jumping".

            // 1. Start page-specific logic (like loading articles) immediately.
            //    This can run in the background while the layout loads.
            if (pageSpecificInit && typeof pageSpecificInit === 'function') {
                pageSpecificInit(user, db);
            }

            const settingsDocRef = doc(db, `users/${user.uid}/preferences`, 'settings');

            try {
                // 2. Wait for *both* components and preferences to finish
                await Promise.all([
                    loadCommonComponents(),
                    loadPreferences(settingsDocRef) // This function is now updated
                ]);

                // 3. Now that we have all data, apply it *before* showing the page
                applyTheme(userPreferences.theme);
                renderSidebar(); // Renders sidebar with correct items
                
                // 4. Attach event listeners (to the now-loaded components)
                attachCoreEventListeners();
                const userEmailSpan = document.getElementById('user-email');
                if (userEmailSpan) userEmailSpan.textContent = user.email;

                // 5. FINALLY, hide the loader and show the fully-ready page
                const appLoader = document.getElementById('app-loader');
                if (appLoader) appLoader.style.display = 'none';
                
                const appWrapper = document.getElementById('app-wrapper');
                if (appWrapper) appWrapper.style.display = 'block';

            } catch (error) {
                console.error("Failed to initialize app components:", error);
                // Handle error, maybe show a message in the loader
                const appLoader = document.getElementById('app-loader');
                if (appLoader) appLoader.textContent = "Error loading application.";
            }

        } else {
            window.location.replace(new URL('login.html', window.location.href).href);
        }
    });
}

// --- HTML Component Loader ---
async function loadCommonComponents() {
    const headerPlaceholder = document.getElementById('header-placeholder');
    const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
    try {
        const [headerRes, sidebarRes] = await Promise.all([ fetch('_header.html'), fetch('_sidebar.html') ]);
        if (!headerRes.ok) throw new Error(`Failed to load _header.html: ${headerRes.statusText}`);
        if (!sidebarRes.ok) throw new Error(`Failed to load _sidebar.html: ${sidebarRes.statusText}`);
        if (headerPlaceholder) headerPlaceholder.innerHTML = await headerRes.text();
        if (sidebarPlaceholder) sidebarPlaceholder.innerHTML = await sidebarRes.text();
    } catch (error) { console.error("Error loading common components:", error); /* ... error display ... */ }
 }

// --- Preference Management ---
// === THIS FUNCTION IS UPDATED TO LOAD GLOBAL DEFAULTS ===
async function loadPreferences(settingsDocRef) {
    try {
        // 1. Start with the hard-coded defaults
        userPreferences = { theme: 'dark', sidebarItems: {} };
        initializeDefaultVisibility(allSidebarItems);
        let baseSettings = { ...userPreferences.sidebarItems };
        let baseTheme = 'dark';

        // 2. Load GLOBAL defaults from 'siteSettings/sidebarDefaults'
        const globalSettingsRef = doc(db, "siteSettings", "sidebarDefaults");
        const globalDocSnap = await getDoc(globalSettingsRef);

        if (globalDocSnap.exists()) {
            // Merge global settings OVER hard-coded defaults
            const globalPrefs = globalDocSnap.data();
            if (globalPrefs.sidebarItems) {
                baseSettings = { ...baseSettings, ...globalPrefs.sidebarItems };
            }
            baseTheme = globalPrefs.theme || baseTheme;
        }

        // 3. Set userPreferences to these merged defaults
        userPreferences.sidebarItems = baseSettings;
        userPreferences.theme = baseTheme;

        // 4. Load the INDIVIDUAL user's settings
        const userDocSnap = await getDoc(settingsDocRef);
        
        // 5. Merge individual user's settings OVER the global defaults
        if (userDocSnap.exists()) {
            const loadedPrefs = userDocSnap.data();
            // User's theme overrides global/default theme
            userPreferences.theme = loadedPrefs.theme || userPreferences.theme; 
            
            if (loadedPrefs.sidebarItems && typeof loadedPrefs.sidebarItems === 'object') {
                // User's sidebar settings override global/default settings
                userPreferences.sidebarItems = { ...userPreferences.sidebarItems, ...loadedPrefs.sidebarItems };
            }
        }
        // We NO LONGER create a new user doc here.
        // A user doc will be created only when they first save their *own* settings.
        // This ensures they always get the latest global defaults until they choose to override them.

     } catch (error) { 
         console.error("Error loading preferences:", error);
         // Fallback to just the hard-coded defaults in case of error
         userPreferences = { theme: 'dark', sidebarItems: {} }; 
         initializeDefaultVisibility(allSidebarItems); 
     }
}

// --- Theme Application ---
export function applyTheme(theme) {
    if (theme === 'light') { document.documentElement.classList.remove('dark'); } else { document.documentElement.classList.add('dark'); }
    const themeToggle = document.getElementById('theme-toggle'); if (themeToggle) { themeToggle.checked = (theme === 'dark'); }
}

// --- Sidebar Rendering & Page Title Setting ---
export function renderSidebar() {
    const sidebarNav=document.getElementById('sidebar-nav'); const pageTitleEl=document.getElementById('page-title'); if(!sidebarNav){console.error("Sidebar nav element not found!"); return;} const currentPage=window.location.pathname.split('/').pop()||'member_dashboard.html'; let currentPageTitle="Dashboard"; let isSubItemActive=false; sidebarNav.innerHTML=''; allSidebarItems.forEach(item=>{if(!userPreferences.sidebarItems[item.id]){return;} if(item.subItems&&Array.isArray(item.subItems)){const dropdownContainer=document.createElement('div'); let parentIsActive=false; const toggleButton=document.createElement('button'); toggleButton.className='sidebar-link w-full flex items-center justify-between gap-4 p-3 rounded-lg text-left'; toggleButton.setAttribute('type','button'); toggleButton.dataset.toggle=item.id; item.subItems.forEach(subItem=>{if(subItem.href===currentPage){parentIsActive=true; isSubItemActive=true; currentPageTitle=subItem.text;}}); if(parentIsActive){toggleButton.classList.add('active-parent');} toggleButton.innerHTML=`<span class="flex items-center gap-4"><i class="fas ${item.icon} fa-fw w-6"></i><span>${item.text}</span></span><i class="fas fa-chevron-down text-xs transition-transform duration-200 chevron-icon"></i>`; dropdownContainer.appendChild(toggleButton); const subMenu=document.createElement('div'); subMenu.id=`submenu-${item.id}`; subMenu.className='pl-6 pt-1 space-y-1 overflow-hidden max-h-0 transition-max-height duration-300 ease-in-out sidebar-submenu'; item.subItems.forEach(subItem=>{const link=document.createElement('a'); link.href=subItem.href; link.className=`sidebar-link flex items-center gap-3 py-2 px-3 rounded-lg text-sm`; if(subItem.href===currentPage){link.classList.add('active');} link.innerHTML=`<i class="fas ${subItem.icon} fa-fw w-5"></i> <span>${subItem.text}</span>`; subMenu.appendChild(link);}); dropdownContainer.appendChild(subMenu); sidebarNav.appendChild(dropdownContainer);}else{const link=document.createElement('a'); link.href=item.href; link.className=`sidebar-link flex items-center gap-4 p-3 rounded-lg`; if(item.href===currentPage&&!isSubItemActive){link.classList.add('active'); currentPageTitle=item.text;} link.innerHTML=`<i class="fas ${item.icon} fa-fw w-6"></i><span>${item.text}</span>`; sidebarNav.appendChild(link);}});
    
    // Set Page Title (with "Finex" for dashboard)
    if(pageTitleEl){
        if (currentPageTitle === 'Dashboard') {
            pageTitleEl.textContent = 'Finex';
        } else {
            pageTitleEl.textContent = currentPageTitle;
        }
    }else{
        console.warn("Element with ID 'page-title' not found.");
    }
 }

// --- Core Event Listeners Attachment ---
function attachCoreEventListeners() {
    const openSidebarBtn=document.getElementById('open-sidebar-btn'); const closeSidebarBtn=document.getElementById('close-sidebar-btn'); const sidebar=document.getElementById('sidebar'); const sidebarOverlay=document.getElementById('sidebar-overlay'); const sidebarNav=document.getElementById('sidebar-nav'); const logoutBtn=document.getElementById('logout-btn'); function openSidebar(){if(sidebar)sidebar.classList.remove('-translate-x-full'); if(sidebarOverlay){sidebarOverlay.classList.remove('hidden'); setTimeout(()=>sidebarOverlay.classList.remove('opacity-0'),10);}} function closeSidebar(){if(sidebar)sidebar.classList.add('-translate-x-full'); if(sidebarOverlay){sidebarOverlay.classList.add('opacity-0'); setTimeout(()=>sidebarOverlay.classList.add('hidden'),300);}} if(openSidebarBtn)openSidebarBtn.addEventListener('click',openSidebar); if(closeSidebarBtn)closeSidebarBtn.addEventListener('click',closeSidebar); if(sidebarOverlay)sidebarOverlay.addEventListener('click',closeSidebar); if(logoutBtn)logoutBtn.addEventListener('click',(e)=>{e.preventDefault(); signOut(auth).then(()=>{window.location.href='index.html';}).catch((error)=>{console.error('Sign out error',error);});}); if(sidebarNav){sidebarNav.addEventListener('click',(e)=>{const link=e.target.closest('a'); const toggle=e.target.closest('button[data-toggle]'); if(link&&!link.closest('.sidebar-submenu')){if(window.innerWidth<1024){closeSidebar();}}else if(toggle){const subMenuId=`submenu-${toggle.dataset.toggle}`; const subMenu=document.getElementById(subMenuId); const chevron=toggle.querySelector('.chevron-icon'); if(subMenu){if(subMenu.style.maxHeight&&subMenu.style.maxHeight!=='0px'){subMenu.style.maxHeight='0px'; toggle.classList.remove('active-parent'); if(chevron)chevron.classList.remove('rotate-180');}else{subMenu.style.maxHeight=subMenu.scrollHeight+"px"; toggle.classList.add('active-parent'); if(chevron)chevron.classList.add('rotate-180');}}}else if(link&&link.closest('.sidebar-submenu')){if(window.innerWidth<1024){closeSidebar();}}});}
}
