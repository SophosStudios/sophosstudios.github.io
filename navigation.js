// src/navigation.js
// Handles sidebar navigation rendering and toggle logic.

import { signOut } from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js';
import { showMessageModal } from './utils.js';

// Global state and functions passed from App.js
let _currentUser = null;
let _userData = null;
let _navigateTo = null;
let _signOut = null;
let _auth = null;
let _db = null;
let _appId = null;

// DOM Elements for navigation
const leftSidebar = document.getElementById('left-sidebar');
const leftSidebarNav = document.getElementById('left-sidebar-nav');
const mainContentWrapper = document.getElementById('main-content-wrapper');
const overlayBackdrop = document.getElementById('overlay-backdrop');
const sidebarToggle = document.getElementById('sidebar-toggle');
const mobileSidebarToggle = document.getElementById('mobile-sidebar-toggle');
const websiteTitleSidebar = document.getElementById('website-title-sidebar');
const adminButtonContainer = document.getElementById('admin-panel-button-container');

// State for sidebar
let isSidebarExpanded = window.innerWidth >= 768; // Start expanded on desktop, collapsed on mobile

/**
 * Initializes the navigation module with necessary global state and functions.
 * This should be called once from App.js.
 * @param {HTMLElement} mobileToggle - The mobile sidebar toggle button.
 * @param {HTMLElement} backdrop - The overlay backdrop element.
 */
export function initializeNavigation(mobileToggle, backdrop) {
    mobileToggle.addEventListener('click', toggleSidebar);
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    backdrop.addEventListener('click', toggleSidebar);

    // Initial state setup
    updateSidebarUI();
}

/**
 * Toggles the sidebar's expanded state.
 */
export function toggleSidebar() {
    isSidebarExpanded = !isSidebarExpanded;
    updateSidebarUI();
}

/**
 * Updates the sidebar's UI state based on `isSidebarExpanded`.
 */
function updateSidebarUI() {
    if (isSidebarExpanded) {
        leftSidebar.classList.add('expanded');
        mainContentWrapper.classList.add('expanded');
        websiteTitleSidebar.classList.remove('hidden');
        if (window.innerWidth < 768) {
            overlayBackdrop.classList.remove('hidden');
        }
    } else {
        leftSidebar.classList.remove('expanded');
        mainContentWrapper.classList.remove('expanded');
        websiteTitleSidebar.classList.add('hidden');
        overlayBackdrop.classList.add('hidden');
    }
    
    // Update text visibility based on the final sidebar state
    leftSidebarNav.querySelectorAll('.sidebar-nav-text').forEach(textSpan => {
        if (isSidebarExpanded) {
            textSpan.classList.remove('hidden');
        } else {
            textSpan.classList.add('hidden');
        }
    });

    // Update the button container visibility
    if (isSidebarExpanded && (adminButtonContainer.textContent.trim() !== '')) {
        adminButtonContainer.classList.remove('hidden');
    } else {
        adminButtonContainer.classList.add('hidden');
    }
}

/**
 * Creates and appends a navigation link to the sidebar.
 * @param {HTMLElement} parentElement - The parent to append the link to.
 * @param {string} text - The display text for the link.
 * @param {string} page - The page name for navigation.
 * @param {string} iconClass - The Font Awesome icon class.
 */
function createNavLink(parentElement, text, page, iconClass) {
    const link = document.createElement('a');
    link.href = '#';
    link.className = 'flex items-center space-x-4 py-3 px-4 rounded-xl text-lg font-semibold text-gray-300 hover:bg-gray-700 transition-colors duration-200';
    link.innerHTML = `
        <i class="${iconClass} text-red-500"></i>
        <span class="sidebar-nav-text whitespace-nowrap">${text}</span>
    `;
    link.addEventListener('click', (e) => {
        e.preventDefault();
        _navigateTo(page);
        // Collapse sidebar on mobile after clicking a link
        if (window.innerWidth < 768) {
            toggleSidebar();
        }
    });
    parentElement.appendChild(link);
}

/**
 * Renders the sidebar navigation based on user authentication and role.
 * This function should be called from App.js whenever the auth state changes.
 * @param {object} currentUser - The current Firebase Auth user object.
 * @param {object} userData - The current Firestore user data.
 * @param {function} navigateTo - The navigation function from App.js.
 * @param {function} signOut - The Firebase signOut function.
 * @param {object} auth - The Firebase auth instance.
 * @param {object} db - The Firestore db instance.
 * @param {string} appId - The app ID.
 */
export function renderSidebarNav(currentUser, userData, navigateTo, signOut, auth, db, appId) {
    _currentUser = currentUser;
    _userData = userData;
    _navigateTo = navigateTo;
    _signOut = signOut;
    _auth = auth;
    _db = db;
    _appId = appId;
    
    leftSidebarNav.innerHTML = '';
    adminButtonContainer.innerHTML = '';
    
    const generalCategory = document.createElement('div');
    generalCategory.className = 'space-y-2';
    leftSidebarNav.appendChild(generalCategory);

    // General links
    createNavLink(generalCategory, 'Home', 'home', 'fas fa-home');
    createNavLink(generalCategory, 'Messages', 'messages', 'fas fa-comments');
    createNavLink(generalCategory, 'Settings', 'settings', 'fas fa-cog');

    // Admin links (only for admins)
    if (_userData && _userData.role === 'admin') {
        const adminCategory = document.createElement('div');
        adminCategory.className = 'mt-6 space-y-2 border-t pt-4 border-gray-700';
        leftSidebarNav.appendChild(adminCategory);
        
        createNavLink(adminCategory, 'Admin Panel', 'admin', 'fas fa-user-shield');
    }
    
    // Auth button (Sign Out or Sign In)
    if (currentUser) {
        const logoutButton = document.createElement('button');
        logoutButton.id = 'logout-btn';
        logoutButton.className = 'w-full py-2 px-4 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition duration-300 text-center';
        logoutButton.textContent = 'Sign Out';
        logoutButton.addEventListener('click', async () => {
            try {
                await _signOut(_auth);
                showMessageModal('You have been signed out successfully.', 'success');
                _navigateTo('auth');
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
        });
        adminButtonContainer.appendChild(logoutButton);
    } else {
        const authButton = document.createElement('button');
        authButton.id = 'auth-btn';
        authButton.className = 'w-full py-2 px-4 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition duration-300 text-center';
        authButton.textContent = 'Account';
        authButton.addEventListener('click', () => {
            _navigateTo('auth');
        });
        adminButtonContainer.appendChild(authButton);
    }

    updateSidebarUI();
}
