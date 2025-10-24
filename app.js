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
    { id: 'planning', icon: 'fa-clipboard-list', text: 'Plan & Journal', subItems: [
            { id: 'checklist', href: 'weekly_checklist.html', icon: 'fa-clipboard-check', text: 'Weekly Checklist' },
            { id: 'journal', href: 'trading_journal.html', icon: 'fa-book', text: 'Trading Journal' } ] },
    { id: 'results', href: 'real_results.html', icon: 'fa-chart-line', text: 'Real-World Results' },
    { id: 'screener', href: 'market_screener.html', icon: 'fa-search-dollar', text: 'Market Screener' },
    // *** NEW Market Data Dropdown ***
    {
        id: 'marketData',           // ID for the dropdown parent
        icon: 'fa-chart-bar',       // Example icon (you can change this)
        text: 'Market Data',        // Dropdown title
        subItems: [
            { id: 'news', href: 'news.html', icon: 'fa-newspaper', text: 'Live News Feed' },
            { id: 'calendar', href: 'economic_calendar.html', icon: 'fa-calendar-alt', text: 'Economic Calendar' }
        ]
    },
    // *** REMOVED original 'news' and 'calendar' items ***
    // { id: 'news', href: 'news.html', icon: 'fa-newspaper', text: 'Live News Feed' },
    // { id: 'calendar', href: 'economic_calendar.html', icon: 'fa-calendar-alt', text: 'Economic Calendar' },
    { id: 'tools', href: 'tools_calculators.html', icon: 'fa-tools', text: 'Tools' },
    { id: 'settings', href: 'settings.html', icon: 'fa-user-cog', text: 'Settings' },
];

let userPreferences = { theme: 'dark', sidebarItems: {} };
function initializeDefaultVisibility(items) {
     items.forEach(item => {
         userPreferences.sidebarItems[item.id] = true; // Set parent/item default visibility
         if (item.subItems) {
             // Ensure subitems have a default visibility tracked if needed later
             item.subItems.forEach(sub => userPreferences.sidebarItems[sub.id] = true);
         }
     });
}
initializeDefaultVisibility(allSidebarItems);


// --- Main App Initialization --- (No changes needed)
export async function initializeAppCore(pageSpecificInit) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await loadCommonComponents();
            const settingsDocRef = doc(db, `users/${user.uid}/preferences`, 'settings');
            await loadPreferences(settingsDocRef);
            applyTheme(userPreferences.theme);
            renderSidebar();
            attachCoreEventListeners();
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
    } catch (error) { console.error("Error loading common components:", error); /* ... error display ... */ }
 }

// --- Preference Management --- (No changes needed)
async function loadPreferences(settingsDocRef) {
     try {
        const docSnap = await getDoc(settingsDocRef);
        userPreferences = { theme: 'dark', sidebarItems: {} }; initializeDefaultVisibility(allSidebarItems);
        if (docSnap.exists()) {
            const loadedPrefs = docSnap.data(); userPreferences.theme = loadedPrefs.theme || 'dark';
            if (loadedPrefs.sidebarItems && typeof loadedPrefs.sidebarItems === 'object') {
                 for (const key in userPreferences.sidebarItems) {
                     if (loadedPrefs.sidebarItems.hasOwnProperty(key)) { userPreferences.sidebarItems[key] = loadedPrefs.sidebarItems[key]; }
                 }
            }
        } else { await setDoc(settingsDocRef, { ...userPreferences, lastUpdated: serverTimestamp() }); }
    } catch (error) { console.error("Error loading preferences:", error); userPreferences = { theme: 'dark', sidebarItems: {} }; initializeDefaultVisibility(allSidebarItems); }
}

// --- Theme Application --- (No changes needed)
export function applyTheme(theme) {
    if (theme === 'light') { document.documentElement.classList.remove('dark'); } else { document.documentElement.classList.add('dark'); }
    const themeToggle = document.getElementById('theme-toggle'); if (themeToggle) { themeToggle.checked = (theme === 'dark'); }
}

// --- Sidebar Rendering & Page Title Setting --- (No changes needed, handles subItems)
export function renderSidebar() {
    const sidebarNav=document.getElementById('sidebar-nav'); const pageTitleEl=document.getElementById('page-title'); if(!sidebarNav){console.error("Sidebar nav element not found!"); return;} const currentPage=window.location.pathname.split('/').pop()||'member_dashboard.html'; let currentPageTitle="Dashboard"; let isSubItemActive=false; sidebarNav.innerHTML=''; allSidebarItems.forEach(item=>{if(!userPreferences.sidebarItems[item.id]){return;} if(item.subItems&&Array.isArray(item.subItems)){const dropdownContainer=document.createElement('div'); let parentIsActive=false; const toggleButton=document.createElement('button'); toggleButton.className='sidebar-link w-full flex items-center justify-between gap-4 p-3 rounded-lg text-left'; toggleButton.setAttribute('type','button'); toggleButton.dataset.toggle=item.id; item.subItems.forEach(subItem=>{if(subItem.href===currentPage){parentIsActive=true; isSubItemActive=true; currentPageTitle=subItem.text;}}); if(parentIsActive){toggleButton.classList.add('active-parent');} toggleButton.innerHTML=`<span class="flex items-center gap-4"><i class="fas ${item.icon} fa-fw w-6"></i><span>${item.text}</span></span><i class="fas fa-chevron-down text-xs transition-transform duration-200 chevron-icon"></i>`; dropdownContainer.appendChild(toggleButton); const subMenu=document.createElement('div'); subMenu.id=`submenu-${item.id}`; subMenu.className='pl-6 pt-1 space-y-1 overflow-hidden max-h-0 transition-max-height duration-300 ease-in-out sidebar-submenu'; item.subItems.forEach(subItem=>{const link=document.createElement('a'); link.href=subItem.href; link.className=`sidebar-link flex items-center gap-3 py-2 px-3 rounded-lg text-sm`; if(subItem.href===currentPage){link.classList.add('active');} link.innerHTML=`<i class="fas ${subItem.icon} fa-fw w-5"></i> <span>${subItem.text}</span>`; subMenu.appendChild(link);}); dropdownContainer.appendChild(subMenu); sidebarNav.appendChild(dropdownContainer);}else{const link=document.createElement('a'); link.href=item.href; link.className=`sidebar-link flex items-center gap-4 p-3 rounded-lg`; if(item.href===currentPage&&!isSubItemActive){link.classList.add('active'); currentPageTitle=item.text;} link.innerHTML=`<i class="fas ${item.icon} fa-fw w-6"></i><span>${item.text}</span>`; sidebarNav.appendChild(link);}}); if(pageTitleEl){pageTitleEl.textContent=currentPageTitle;}else{console.warn("Element with ID 'page-title' not found.");}
 }

// --- Core Event Listeners Attachment --- (No changes needed, handles dropdowns)
function attachCoreEventListeners() {
    const openSidebarBtn=document.getElementById('open-sidebar-btn'); const closeSidebarBtn=document.getElementById('close-sidebar-btn'); const sidebar=document.getElementById('sidebar'); const sidebarOverlay=document.getElementById('sidebar-overlay'); const sidebarNav=document.getElementById('sidebar-nav'); const logoutBtn=document.getElementById('logout-btn'); function openSidebar(){if(sidebar)sidebar.classList.remove('-translate-x-full'); if(sidebarOverlay){sidebarOverlay.classList.remove('hidden'); setTimeout(()=>sidebarOverlay.classList.remove('opacity-0'),10);}} function closeSidebar(){if(sidebar)sidebar.classList.add('-translate-x-full'); if(sidebarOverlay){sidebarOverlay.classList.add('opacity-0'); setTimeout(()=>sidebarOverlay.classList.add('hidden'),300);}} if(openSidebarBtn)openSidebarBtn.addEventListener('click',openSidebar); if(closeSidebarBtn)closeSidebarBtn.addEventListener('click',closeSidebar); if(sidebarOverlay)sidebarOverlay.addEventListener('click',closeSidebar); if(logoutBtn)logoutBtn.addEventListener('click',(e)=>{e.preventDefault(); signOut(auth).then(()=>{window.location.href='index.html';}).catch((error)=>{console.error('Sign out error',error);});}); if(sidebarNav){sidebarNav.addEventListener('click',(e)=>{const link=e.target.closest('a'); const toggle=e.target.closest('button[data-toggle]'); if(link&&!link.closest('.sidebar-submenu')){if(window.innerWidth<1024){closeSidebar();}}else if(toggle){const subMenuId=`submenu-${toggle.dataset.toggle}`; const subMenu=document.getElementById(subMenuId); const chevron=toggle.querySelector('.chevron-icon'); if(subMenu){if(subMenu.style.maxHeight&&subMenu.style.maxHeight!=='0px'){subMenu.style.maxHeight='0px'; toggle.classList.remove('active-parent'); if(chevron)chevron.classList.remove('rotate-180');}else{subMenu.style.maxHeight=subMenu.scrollHeight+"px"; toggle.classList.add('active-parent'); if(chevron)chevron.classList.add('rotate-180');}}}else if(link&&link.closest('.sidebar-submenu')){if(window.innerWidth<1024){closeSidebar();}}});}
}
