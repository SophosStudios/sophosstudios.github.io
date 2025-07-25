// src/navigation.js
// Handles sidebar navigation rendering and toggle logic.

import { getRoleVFX } from './utils.js';

// Global state and functions passed from App.js
let _currentUser = null;
let _userData = null;
let _navigateTo = null;
let _CONFIG = null;

// DOM Elements for navigation
const leftSidebar = document.getElementById('left-sidebar');
const leftSidebarNav = document.getElementById('left-sidebar-nav');
const mainContentWrapper = document.getElementById('main-content-wrapper');
const overlayBackdrop = document.getElementById('overlay-backdrop');
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebarIconOpen = document.getElementById('sidebar-icon-open');
const sidebarIconClose = document.getElementById('sidebar-icon-close');
const websiteTitleSidebar = document.getElementById('website-title-sidebar');

let isSidebarExpanded = window.innerWidth >= 768; // Start expanded on desktop, collapsed on mobile

/**
 * Initializes the navigation module with necessary global state and functions.
 * This should be called once from App.js.
 * @param {object} currentUser - The current Firebase Auth user object.
 * @param {object} userData - The current Firestore user data.
 * @param {function} navigateTo - The main navigation function from App.js.
 * @param {object} CONFIG - The application's configuration object.
 */
export function initializeNavigation(currentUser, userData, navigateTo, CONFIG) {
    _currentUser = currentUser;
    _userData = userData;
    _navigateTo = navigateTo;
    _CONFIG = CONFIG;

    // Set initial sidebar state based on screen size
    updateSidebarUI();
    // Set website title in sidebar
    if (websiteTitleSidebar) {
        websiteTitleSidebar.textContent = _CONFIG.websiteTitle;
    }

    // Event listener for sidebar toggle button
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    // Event listener for overlay backdrop (mobile)
    if (overlayBackdrop) {
        overlayBackdrop.addEventListener('click', closeSidebar);
    }
    // Adjust sidebar on window resize
    window.addEventListener('resize', handleResize);
}

/**
 * Updates the global state references in the navigation module.
 * Call this whenever currentUser or userData changes in App.js.
 * @param {object} currentUser - The current Firebase Auth user object.
 * @param {object} userData - The current Firestore user data.
 */
export function updateNavigationState(currentUser, userData) {
    _currentUser = currentUser;
    _userData = userData;
    renderNavbar(); // Re-render navbar to reflect auth state changes
}

/**
 * Toggles the sidebar's expanded/collapsed state.
 */
function toggleSidebar() {
    isSidebarExpanded = !isSidebarExpanded;
    updateSidebarUI();
}

/**
 * Closes the sidebar, primarily for mobile overlay.
 */
export function closeSidebar() {
    isSidebarExpanded = false;
    updateSidebarUI();
}

/**
 * Updates the sidebar and main content wrapper CSS classes based on `isSidebarExpanded` state.
 */
function updateSidebarUI() {
    if (leftSidebar && mainContentWrapper && sidebarIconOpen && sidebarIconClose && websiteTitleSidebar) {
        if (isSidebarExpanded) {
            leftSidebar.classList.remove('-translate-x-full');
            leftSidebar.classList.add('w-64');
            mainContentWrapper.classList.remove('ml-0');
            mainContentWrapper.classList.add('ml-64');
            // Show expanded elements
            websiteTitleSidebar.classList.remove('hidden');
            // Hide mobile open icon, show close icon (if on mobile)
            if (window.innerWidth < 768) {
                sidebarIconOpen.classList.add('hidden');
                sidebarIconClose.classList.remove('hidden');
                overlayBackdrop.classList.add('visible'); // Show overlay on mobile when expanded
            } else {
                sidebarIconOpen.classList.add('hidden'); // Keep hidden on desktop
                sidebarIconClose.classList.add('hidden'); // Keep hidden on desktop
                overlayBackdrop.classList.remove('visible'); // Hide overlay on desktop
            }
        } else {
            // Collapse sidebar
            if (window.innerWidth < 768) {
                leftSidebar.classList.add('-translate-x-full');
                leftSidebar.classList.remove('w-64');
                mainContentWrapper.classList.remove('ml-64');
                mainContentWrapper.classList.add('ml-0');
                // Show mobile open icon, hide close icon
                sidebarIconOpen.classList.remove('hidden');
                sidebarIconClose.classList.add('hidden');
                overlayBackdrop.classList.remove('visible'); // Hide overlay on mobile when collapsed
            } else {
                // On desktop, collapse to mini-sidebar (16px width)
                leftSidebar.classList.remove('-translate-x-full'); // Always visible
                leftSidebar.classList.remove('w-64');
                leftSidebar.classList.add('w-16'); // Mini width
                mainContentWrapper.classList.remove('ml-64');
                mainContentWrapper.classList.add('ml-16'); // Adjust content margin
                // Hide expanded elements
                websiteTitleSidebar.classList.add('hidden');
                // Ensure mobile icons are hidden on desktop
                sidebarIconOpen.classList.add('hidden');
                sidebarIconClose.classList.add('hidden');
                overlayBackdrop.classList.remove('visible'); // Hide overlay on desktop
            }
        }
        // Update visibility of nav item text based on sidebar state
        leftSidebarNav.querySelectorAll('.sidebar-nav-text').forEach(textSpan => {
            if (isSidebarExpanded || window.innerWidth >= 768) { // Always show text on expanded or desktop
                textSpan.classList.remove('hidden');
            } else {
                textSpan.classList.add('hidden');
            }
        });
    }
}

/**
 * Handles window resize events to adjust sidebar behavior.
 */
function handleResize() {
    const wasExpanded = isSidebarExpanded;
    if (window.innerWidth >= 768) {
        // On desktop, if it was collapsed, expand it to default desktop view
        if (!wasExpanded) {
            isSidebarExpanded = true; // Default to expanded on desktop
        }
        sidebarIconOpen.classList.add('hidden'); // Ensure mobile icons are hidden
        sidebarIconClose.classList.add('hidden');
        overlayBackdrop.classList.remove('visible'); // Hide overlay
    } else {
        // On mobile, if it was expanded (from desktop), collapse it to mobile default
        if (wasExpanded) {
            isSidebarExpanded = false; // Default to collapsed on mobile
        }
        sidebarIconOpen.classList.remove('hidden'); // Show mobile open icon
        sidebarIconClose.classList.add('hidden');
    }
    updateSidebarUI();
    renderNavbar(); // Re-render navbar to adjust for mobile/desktop view
}


/**
 * Renders the Navbar links based on authentication status and sidebar state.
 */
export function renderNavbar() {
    if (!leftSidebarNav) {
        console.warn("Element with ID 'left-sidebar-nav' not found. Sidebar navigation may not render correctly.");
        return;
    }
    leftSidebarNav.innerHTML = ''; // Clear existing links

    const createAndAppendButton = (container, id, text, page, iconHtml = '', roles = [], categoryRoles = []) => {
        // Check if user has required roles for this item or its category
        const hasItemRole = roles.length === 0 || (_userData && roles.includes(_userData.role));
        const hasCategoryRole = categoryRoles.length === 0 || (_userData && categoryRoles.includes(_userData.role));

        if (!hasItemRole || !hasCategoryRole) {
            return; // Skip rendering if user doesn't have the required role
        }

        const btn = document.createElement('button');
        btn.id = id;
        btn.className = `
            flex items-center w-full px-4 py-3 text-lg font-semibold rounded-lg hover:bg-gray-700 text-white transition duration-200
            ${id.includes('admin') || id.includes('manage-partner-questions') || id.includes('partner-applications') ? 'bg-red-600 hover:bg-red-700 shadow-md' :
              (id.includes('auth') ? 'bg-green-600 hover:bg-green-700 shadow-md' :
              (id.includes('sign-out') ? 'bg-blue-600 hover:bg-blue-700 shadow-md' : ''))}
        `;
        btn.innerHTML = `${iconHtml} <span class="sidebar-nav-text ml-3 ${isSidebarExpanded || window.innerWidth >= 768 ? '' : 'hidden'}">${text}</span>`;
        btn.addEventListener('click', () => {
            _navigateTo(page);
            closeSidebar(); // Close sidebar after navigation (especially for mobile)
        });
        container.appendChild(btn);
    };

    // Navigation Categories
    const categories = [
        {
            name: 'General',
            icon: '<i class="fas fa-info-circle"></i>',
            items: [
                { id: 'nav-home', text: 'Home', page: 'home', icon: '<i class="fas fa-home"></i>' },
                { id: 'nav-about', text: 'About', page: 'about', icon: '<i class="fas fa-info-circle"></i>' },
                { id: 'nav-team', text: 'Meet the Team', page: 'team', icon: '<i class="fas fa-users"></i>' },
                { id: 'nav-videos', text: 'Videos', page: 'videos', icon: '<i class="fas fa-video"></i>' } // New Videos Link
            ],
            authRequired: false
        },
        {
            name: 'Community',
            icon: '<i class="fas fa-comments"></i>',
            items: [
                { id: 'nav-forum', text: 'Forum', page: 'forum', icon: '<i class="fas fa-comments"></i>' }
            ],
            authRequired: true
        },
        {
            name: 'Partnership',
            icon: '<i class="fas fa-handshake"></i>',
            items: [
                { id: 'nav-partners', text: 'Check Out Partners', page: 'partners', icon: '<i class="fas fa-users-gear"></i>' },
                { id: 'nav-partner-tos', text: 'Partner TOS', page: 'partner-tos', icon: '<i class="fas fa-file-contract"></i>' },
                { id: 'nav-apply-partner', text: 'Become a Partner', page: 'apply-partner', icon: '<i class="fas fa-user-plus"></i>', roles: ['member'] }
            ],
            authRequired: true
        },
        {
            name: 'Administration',
            icon: '<i class="fas fa-shield-alt"></i>',
            items: [
                { id: 'nav-admin', text: 'Admin Panel', page: 'admin', icon: '<i class="fas fa-user-cog"></i>' },
                { id: 'nav-partner-applications', text: 'Partner Applications', page: 'partner-applications', icon: '<i class="fas fa-inbox"></i>' },
                { id: 'nav-manage-partner-questions', text: 'Manage Partner Questions', page: 'manage-partner-questions', icon: '<i class="fas fa-question-circle"></i>', roles: ['founder', 'co-founder'] },
                { id: 'nav-manage-videos', text: 'Manage Videos', page: 'manage-videos', icon: '<i class="fas fa-video"></i>', roles: ['admin', 'founder', 'co-founder'] } // New Manage Videos link
            ],
            authRequired: true,
            roles: ['admin', 'founder', 'co-founder'] // Category-level roles
        },
        {
            name: 'Account',
            icon: '<i class="fas fa-user-circle"></i>',
            items: [], // Populated below based on auth state
            authRequired: false
        }
    ];

    // Populate Account category based on auth state
    const accountCategory = categories.find(cat => cat.name === 'Account');
    if (_currentUser && _userData) {
        const profileIconSrc = _userData.profilePicUrl || `https://placehold.co/100x100/F0F0F0/000000?text=${(_userData.username || _currentUser.email || 'U').charAt(0).toUpperCase()}`;
        const profileIconHtml = `
            <img src="${profileIconSrc}" alt="Profile" class="w-8 h-8 rounded-full object-cover border-2 border-gray-400"
                 onerror="this.onerror=null; this.src='https://placehold.co/100x100/F0F0F0/000000?text=${(_userData.username || _currentUser.email || 'U').charAt(0).toUpperCase()}'">`;

        accountCategory.items.push(
            { id: 'nav-profile', text: 'Profile', page: 'profile', icon: profileIconHtml },
            { id: 'nav-settings', text: 'Settings', page: 'settings', icon: '<i class="fas fa-cog"></i>' },
            { id: 'nav-sign-out', text: 'Sign Out', page: 'logout', icon: '<i class="fas fa-sign-out-alt"></i>' }
        );
    } else {
        accountCategory.items.push(
            { id: 'nav-auth', text: 'Sign In / Up', page: 'auth', icon: '<i class="fas fa-sign-in-alt"></i>' }
        );
    }

    categories.forEach(category => {
        if (category.authRequired && !_currentUser) return;

        const filteredItems = category.items.filter(item => {
            const itemRoles = item.roles || [];
            const categoryRoles = category.roles || [];

            const hasItemRole = itemRoles.length === 0 || (_userData && itemRoles.includes(_userData.role));
            const hasCategoryRole = categoryRoles.length === 0 || (_userData && categoryRoles.includes(_userData.role));

            return hasItemRole && hasCategoryRole;
        });

        if (filteredItems.length === 0) return;

        // Create category header for expanded view
        const categoryHeader = document.createElement('div');
        categoryHeader.className = `
            text-gray-400 text-sm font-bold uppercase px-4 pt-4 pb-2
            ${isSidebarExpanded || window.innerWidth >= 768 ? '' : 'hidden'} sidebar-category-header
        `;
        categoryHeader.textContent = category.name;
        leftSidebarNav.appendChild(categoryHeader);

        // Create buttons for each item in the category
        filteredItems.forEach(item => {
            createAndAppendButton(leftSidebarNav, item.id, item.text, item.page, item.icon, item.roles, category.roles);
        });
    });

    // Update the UI to reflect current sidebar state after rendering links
    updateSidebarUI();
}
