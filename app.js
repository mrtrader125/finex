// app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-firestore.js";

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

// --- Utility Week Functions ---
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

    return {
        startDate: new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate())),
        endDate: new Date(Date.UTC(sunday.getFullYear(), sunday.getMonth(), sunday.getDate()))
    };
}

// Sidebar items
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

// Theme on load
if (typeof window !== 'undefined') {
    document.documentElement.classList.toggle('dark', userPreferences.theme === 'dark');
}

// --- Main Core Init ---
export async function initializeAppCore(pageSpecificInit) {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.replace("login.html");
            return;
        }

        // Show app after login
        const loader = document.getElementById("app-loader");
        if (loader) loader.style.display = "none";

        const wrapper = document.getElementById("app-wrapper");
        if (wrapper) wrapper.style.display = "block";

        try {
            // Load components
            await loadCommonComponents();

            // Apply theme
            applyTheme(userPreferences.theme);

            // Render sidebar
            renderSidebar();

            // Fix sidebar listeners after DOM injection
            wireSidebarOnce();

            // Load profile
            const userDocRef = doc(db, "users", user.uid);
            let profileSnap = await getDoc(userDocRef);

            let userProfile = {
                email: user.email,
                displayName: user.email.split('@')[0]
            };

            if (profileSnap.exists()) {
                userProfile.displayName = profileSnap.data().displayName || userProfile.displayName;
            }

            // Update email
            const emailEl = document.getElementById("user-email");
            if (emailEl) emailEl.textContent = userProfile.email;

            // Page-specific init
            if (typeof pageSpecificInit === "function") {
                pageSpecificInit(user, db, userProfile);
            }

        } catch (error) {
            console.error("Initialization error:", error);
            document.querySelector("main").innerHTML =
                `<p style="color:red;text-align:center;padding:20px;">Error loading page. ${error.message}</p>`;
        }
    });
}

// Load header & sidebar components
async function loadCommonComponents() {
    const headerPlaceholder = document.getElementById("header-placeholder");
    const sidebarPlaceholder = document.getElementById("sidebar-placeholder");

    if (!headerPlaceholder || !sidebarPlaceholder) return;

    try {
        const headerRes = await fetch("_header.html");
        headerPlaceholder.innerHTML = headerRes.ok
            ? await headerRes.text()
            : `<p style="color:red;text-align:center;">Error loading header</p>`;

        const sidebarRes = await fetch("_sidebar.html");
        sidebarPlaceholder.innerHTML = sidebarRes.ok
            ? await sidebarRes.text()
            : `<p style="color:red;text-align:center;">Error loading sidebar</p>`;
    } catch (error) {
        console.error("Component load error:", error);
    }
}

// Apply theme
export function applyTheme(theme) {
    localStorage.setItem("finex_theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
}

// Sidebar rendering
export function renderSidebar() {
    const sidebarNav = document.getElementById("sidebar-nav");
    if (!sidebarNav) return;

    sidebarNav.innerHTML = "";

    const currentPage =
        window.location.pathname.split("/").pop() || "member_dashboard.html";

    allSidebarItems.forEach(item => {
        if (!item.subItems) {
            sidebarNav.innerHTML += `
                <a href="${item.href}" 
                   class="sidebar-link flex items-center gap-4 p-3 rounded-lg ${item.href === currentPage ? "active" : ""}">
                    <i class="fas ${item.icon} fa-fw w-6"></i>
                    <span>${item.text}</span>
                </a>`;
        } else {
            let subHTML = "";
            item.subItems.forEach(sub => {
                subHTML += `
                    <a href="${sub.href}" 
                       class="sidebar-link flex items-center gap-3 py-2 px-3 rounded-lg text-sm">
                       <i class="fas ${sub.icon} fa-fw w-5"></i>
                       <span>${sub.text}</span>
                    </a>`;
            });

            sidebarNav.innerHTML += `
                <div>
                    <button class="sidebar-link w-full flex items-center justify-between gap-4 p-3 rounded-lg" data-toggle="${item.id}">
                        <span class="flex items-center gap-4">
                            <i class="fas ${item.icon} fa-fw w-6"></i>${item.text}
                        </span>
                        <i class="fas fa-chevron-down text-xs"></i>
                    </button>
                    <div id="submenu-${item.id}" class="sidebar-submenu pl-6 pt-1 space-y-1 max-h-0 overflow-hidden">
                        ${subHTML}
                    </div>
                </div>`;
        }
    });
}

// Sidebar functions
function openSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    if (!sidebar || !overlay) return;

    sidebar.classList.remove("-translate-x-full");
    overlay.classList.remove("hidden");

    requestAnimationFrame(() => {
        overlay.classList.remove("opacity-0");
    });
}

function closeSidebar() {
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("sidebar-overlay");
    if (!sidebar || !overlay) return;

    sidebar.classList.add("-translate-x-full");
    overlay.classList.add("opacity-0");
    setTimeout(() => overlay.classList.add("hidden"), 300);
}

// Correctly wire sidebar after DOM injection
function wireSidebarOnce() {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar || sidebar.dataset.wired === "1") return;

    const openBtn = document.getElementById("open-sidebar-btn");
    const closeBtn = document.getElementById("close-sidebar-btn");
    const overlay = document.getElementById("sidebar-overlay");

    if (openBtn) openBtn.onclick = openSidebar;
    if (closeBtn) closeBtn.onclick = closeSidebar;
    if (overlay) overlay.onclick = closeSidebar;

    sidebar.dataset.wired = "1";
}

// Attach core event listeners
function attachCoreEventListeners() {
    document.body.addEventListener("click", (e) => {
        const openBtn = e.target.closest("#open-sidebar-btn");
        const closeBtn = e.target.closest("#close-sidebar-btn");
        const overlay = e.target.closest("#sidebar-overlay");

        if (openBtn) return openSidebar();
        if (closeBtn || overlay) return closeSidebar();
    });
}
