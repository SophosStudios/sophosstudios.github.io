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
const adminPanelButtonContainer = document.getElementById('admin-panel-button-container'); // New container for fixed button

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
        // Update visibility of dropdown icons
        leftSidebarNav.querySelectorAll('.dropdown-toggle-icon').forEach(icon => {
            if (isSidebarExpanded || window.innerWidth >= 768) {
                icon.classList.remove('hidden');
            } else {
                icon.classList.add('hidden');
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
    if (!leftSidebarNav || !adminPanelButtonContainer) {
        console.warn("Required navigation elements not found. Sidebar navigation may not render correctly.");
        return;
    }
    leftSidebarNav.innerHTML = ''; // Clear existing links
    adminPanelButtonContainer.innerHTML = ''; // Clear existing admin button

    // Helper to check if user has any of the required roles
    const hasRequiredRole = (roles) => {
        return roles.length === 0 || (_userData && roles.includes(_userData.role));
    };

    /**
     * Creates a navigation button or dropdown header.
     * @param {HTMLElement} container - The parent element to append to.
     * @param {string} id - The ID for the button/div.
     * @param {string} text - The display text.
     * @param {string} page - The page to navigate to (for direct links).
     * @param {string} iconHtml - HTML for the icon.
     * @param {Array<string>} roles - Roles required for this item.
     * @param {Array<object>} [children=null] - Array of child menu items for dropdown.
     * @returns {HTMLElement|null} The created element or null if roles don't match.
     */
    const createNavItem = (container, id, text, page, iconHtml, roles, children = null) => {
        if (!hasRequiredRole(roles)) {
            return null;
        }

        const itemWrapper = document.createElement('div');
        itemWrapper.className = 'relative'; // For dropdown positioning

        const btn = document.createElement('button');
        btn.id = id;
        btn.className = `
            flex items-center w-full px-4 py-3 text-lg font-semibold rounded-lg hover:bg-gray-700 text-white transition duration-200
            ${id.includes('admin') || id.includes('manage-partner-questions') || id.includes('partner-applications') || id.includes('review-code-submissions') ? 'bg-red-600 hover:bg-red-700 shadow-md' :
              (id.includes('auth') ? 'bg-green-600 hover:bg-green-700 shadow-md' :
              (id.includes('sign-out') ? 'bg-blue-600 hover:bg-blue-700 shadow-md' : ''))}
        `;
        // Ensure text color is white for all nav items
        btn.innerHTML = `${iconHtml} <span class="sidebar-nav-text ml-3 text-white ${isSidebarExpanded || window.innerWidth >= 768 ? '' : 'hidden'}">${text}</span>`;

        if (children) {
            btn.classList.add('justify-between'); // Space between text and arrow
            btn.innerHTML += `<i class="fas fa-chevron-down ml-auto dropdown-toggle-icon ${isSidebarExpanded || window.innerWidth >= 768 ? '' : 'hidden'}"></i>`;
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent closing sidebar if clicking dropdown toggle
                const dropdownContent = itemWrapper.querySelector('.dropdown-content');
                if (dropdownContent) {
                    dropdownContent.classList.toggle('hidden');
                    const icon = btn.querySelector('.dropdown-toggle-icon');
                    if (icon) {
                        icon.classList.toggle('fa-chevron-down');
                        icon.classList.toggle('fa-chevron-up');
                    }
                }
            });
        } else {
            btn.addEventListener('click', () => {
                _navigateTo(page);
                closeSidebar(); // Close sidebar after navigation (especially for mobile)
            });
        }

        itemWrapper.appendChild(btn);

        if (children) {
            const dropdownContent = document.createElement('div');
            // Ensure dropdown content text is also white
            dropdownContent.className = `dropdown-content hidden pl-4 py-2 space-y-1 bg-gray-800 rounded-b-lg text-white`; // Indent children
            children.forEach(child => {
                const childBtn = document.createElement('button');
                childBtn.id = child.id;
                childBtn.className = `
                    flex items-center w-full px-4 py-2 text-md font-medium rounded-lg hover:bg-gray-600 text-white transition duration-200
                `;
                childBtn.innerHTML = `${child.icon} <span class="sidebar-nav-text ml-3 ${isSidebarExpanded || window.innerWidth >= 768 ? '' : 'hidden'}">${child.text}</span>`;
                childBtn.addEventListener('click', () => {
                    _navigateTo(child.page);
                    closeSidebar();
                });
                dropdownContent.appendChild(childBtn);
            });
            itemWrapper.appendChild(dropdownContent);
        }

        container.appendChild(itemWrapper);
        return itemWrapper;
    };


    // Define Navigation Structure with Dropdowns
    const categories = [
        {
            name: 'General',
            roles: [], // No specific roles required
            items: [
                { id: 'nav-home', text: 'Home', page: 'home', icon: '<i class="fas fa-home"></i>', roles: [] },
                { id: 'nav-about', text: 'About', page: 'about', icon: '<i class="fas fa-info-circle"></i>', roles: [] },
                { id: 'nav-team', text: 'Meet the Team', page: 'team', icon: '<i class="fas fa-users"></i>', roles: [] },
                { id: 'nav-videos', text: 'Videos', page: 'videos', icon: '<i class="fas fa-video"></i>', roles: [] }
            ]
        },
        {
            name: 'Community',
            roles: ['member', 'admin', 'founder', 'co-founder', 'partner'], // Only authenticated users
            items: [
                { id: 'nav-forum', text: 'Forum', page: 'forum', icon: '<i class="fas fa-comments"></i>', roles: [] }
            ]
        },
        {
            name: 'Games', // New Category for fun things
            roles: ['member', 'admin', 'founder', 'co-founder', 'partner'], // Accessible to all logged-in members
            items: [
                { id: 'nav-simple-game', text: 'Simple Game', page: 'simple-game', icon: '<i class="fas fa-gamepad"></i>', roles: [] }
                // Add more game links here as needed
            ]
        },
        {
            name: 'Code Showcase', // New category for code snippets
            roles: ['member', 'admin', 'founder', 'co-founder', 'partner'],
            items: [
                { id: 'nav-submit-code', text: 'Submit Code', page: 'submit-code', icon: '<i class="fas fa-file-code"></i>', roles: [] },
                { id: 'nav-approved-code', text: 'Approved Code', page: 'approved-code', icon: '<i class="fas fa-check-circle"></i>', roles: [] }
            ]
        },
        {
            name: 'Partnership',
            roles: ['member', 'admin', 'founder', 'co-founder', 'partner'], // Only authenticated users
            items: [
                { id: 'nav-partners', text: 'Check Out Partners', page: 'partners', icon: '<i class="fas fa-users-gear"></i>', roles: [] },
                { id: 'nav-partner-tos', text: 'Partner TOS', page: 'partner-tos', icon: '<i class="fas fa-file-contract"></i>', roles: [] },
                { id: 'nav-apply-partner', text: 'Become a Partner', page: 'apply-partner', icon: '<i class="fas fa-user-plus"></i>', roles: ['member'] }
            ]
        },
        {
            name: 'Account',
            roles: [], // Handled by individual items below
            items: []
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
            { id: 'nav-profile', text: 'Profile', page: 'profile', icon: profileIconHtml, roles: [] },
            { id: 'nav-settings', text: 'Settings', page: 'settings', icon: '<i class="fas fa-cog"></i>', roles: [] },
            { id: 'nav-sign-out', text: 'Sign Out', page: 'logout', icon: '<i class="fas fa-sign-out-alt"></i>', roles: [] }
        );
    } else {
        accountCategory.items.push(
            { id: 'nav-auth', text: 'Sign In / Up', page: 'auth', icon: '<i class="fas fa-sign-in-alt"></i>', roles: [] }
        );
    }

    categories.forEach(category => {
        // Filter items within the category based on user's roles
        const filteredItems = category.items.filter(item => hasRequiredRole(item.roles));

        // If the category itself has roles and the user doesn't meet them, skip the whole category
        if (!hasRequiredRole(category.roles)) {
            return;
        }

        // If there are no items after filtering, don't show the category header
        if (filteredItems.length === 0) {
            return;
        }

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
            // For now, no actual nested children in the data structure, but the function supports it.
            // If you want a dropdown, you'd define `children` array in the `item` object.
            // Example:
            // { id: 'nav-partnership-dropdown', text: 'Partnership', icon: '<i class="fas fa-handshake"></i>', roles: ['member'],
            //   children: [
            //     { id: 'nav-partners', text: 'Check Out Partners', page: 'partners', icon: '<i class="fas fa-users-gear"></i>', roles: [] },
            //     { id: 'nav-partner-tos', text: 'Partner TOS', page: 'partner-tos', icon: '<i class="fas fa-file-contract"></i>', roles: [] },
            //     { id: 'nav-apply-partner', text: 'Become a Partner', icon: '<i class="fas fa-user-plus"></i>', roles: ['member'] }
            //   ]
            // }
            // For now, I'll just render them as flat items under the category.
            // The "Partnership" category itself acts as a conceptual grouping.

            createNavItem(leftSidebarNav, item.id, item.text, item.page, item.icon, item.roles);
        });
    });

    // Render the fixed Admin Panel button at the bottom
    if (_userData && (_userData.role === 'admin' || _userData.role === 'founder' || _userData.role === 'co-founder')) {
        const adminBtn = document.createElement('button');
        adminBtn.id = 'fixed-admin-panel-btn';
        adminBtn.className = `
            w-full py-3 rounded-full bg-red-600 text-white font-bold text-lg hover:bg-red-700 transition duration-300 transform hover:scale-105 shadow-lg
            flex items-center justify-center
            ${isSidebarExpanded || window.innerWidth >= 768 ? 'px-4' : 'px-0'}
        `;
        adminBtn.innerHTML = `
            <i class="fas fa-gear text-xl"></i>
            <span class="sidebar-nav-text ml-3 ${isSidebarExpanded || window.innerWidth >= 768 ? '' : 'hidden'}">Admin Panel</span>
        `;
        adminBtn.addEventListener('click', () => {
            _navigateTo('admin');
            closeSidebar();
        });
        adminPanelButtonContainer.appendChild(adminBtn);
    }


    // Update the UI to reflect current sidebar state after rendering links
    updateSidebarUI();
}
