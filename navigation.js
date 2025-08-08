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
let isSidebarExpanded = window.innerWidth >= 768;

/**
 * Initializes the navigation module.
 */
export function initializeNavigation(mobileToggle, backdrop) {
    mobileToggle.addEventListener('click', toggleSidebar);
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    backdrop.addEventListener('click', toggleSidebar);
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
 * Updates the sidebar's UI state.
 */
function updateSidebarUI() {
    const textSpans = leftSidebarNav.querySelectorAll('.sidebar-nav-text');
    if (isSidebarExpanded) {
        leftSidebar.classList.add('expanded');
        mainContentWrapper.classList.add('expanded');
        websiteTitleSidebar.classList.remove('hidden');
        if (window.innerWidth < 768) {
            overlayBackdrop.classList.remove('hidden');
        }
        textSpans.forEach(span => span.classList.remove('hidden'));
        if (adminButtonContainer.innerHTML.trim() !== '') {
            adminButtonContainer.classList.remove('hidden');
        }
    } else {
        leftSidebar.classList.remove('expanded');
        mainContentWrapper.classList.remove('expanded');
        websiteTitleSidebar.classList.add('hidden');
        overlayBackdrop.classList.add('hidden');
        textSpans.forEach(span => span.classList.add('hidden'));
        adminButtonContainer.classList.add('hidden');
    }
}

/**
 * Creates a navigation link.
 */
function createNavLink(parentElement, text, page, iconClass) {
    const link = document.createElement('a');
    link.href = '#';
    link.className = 'flex items-center space-x-4 py-3 px-4 rounded-xl text-lg font-semibold text-gray-300 hover:bg-gray-700 transition-colors duration-200';
    link.innerHTML = `
        <i class="${iconClass} text-red-500 w-6 text-center"></i>
        <span class="sidebar-nav-text whitespace-nowrap ${isSidebarExpanded ? '' : 'hidden'}">${text}</span>
    `;
    link.addEventListener('click', (e) => {
        e.preventDefault();
        _navigateTo(page);
        if (window.innerWidth < 768 && isSidebarExpanded) {
            toggleSidebar();
        }
    });
    parentElement.appendChild(link);
}

/**
 * Renders the sidebar navigation based on user state.
 */
export function renderSidebarNav(currentUser, userData, navigateTo, signOutFunc, auth) {
    _currentUser = currentUser;
    _userData = userData;
    _navigateTo = navigateTo;
    _signOut = signOutFunc;
    _auth = auth;
    
    leftSidebarNav.innerHTML = '';
    adminButtonContainer.innerHTML = '';
    
    // General links
    createNavLink(leftSidebarNav, 'Home', 'home', 'fas fa-home');
    createNavLink(leftSidebarNav, 'Forums', 'forums', 'fas fa-comments');
    createNavLink(leftSidebarNav, 'Messages', 'messages', 'fas fa-envelope');
    createNavLink(leftSidebarNav, 'Settings', 'settings', 'fas fa-cog');

    // Admin links
    if (_userData?.role === 'admin') {
        const adminCategory = document.createElement('div');
        adminCategory.className = 'mt-6 pt-4 border-t border-gray-700';
        leftSidebarNav.appendChild(adminCategory);
        createNavLink(adminCategory, 'Admin Panel', 'admin', 'fas fa-user-shield');
    }
    
    // Auth button
    const authContainer = document.getElementById('admin-panel-button-container');
    authContainer.innerHTML = ''; // Clear previous buttons
    
    if (currentUser && !currentUser.isAnonymous) {
        const logoutButton = document.createElement('button');
        logoutButton.id = 'logout-btn';
        logoutButton.className = 'w-full py-3 px-4 rounded-lg bg-red-800 text-white font-bold hover:bg-red-700 transition duration-300 text-left flex items-center space-x-4';
        logoutButton.innerHTML = `
            <i class="fas fa-sign-out-alt w-6 text-center"></i>
            <span class="sidebar-nav-text ${isSidebarExpanded ? '' : 'hidden'}">Sign Out</span>`;
        logoutButton.addEventListener('click', async () => {
            try {
                await _signOut(_auth);
                _navigateTo('auth');
                showMessageModal('You have been signed out.', 'success');
            } catch (error) {
                showMessageModal(`Sign out failed: ${error.message}`, 'error');
            }
        });
        authContainer.appendChild(logoutButton);
    } else {
         const authButton = document.createElement('button');
        authButton.id = 'auth-btn';
        authButton.className = 'w-full py-3 px-4 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition duration-300 text-left flex items-center space-x-4';
        authButton.innerHTML = `
            <i class="fas fa-sign-in-alt w-6 text-center"></i>
            <span class="sidebar-nav-text ${isSidebarExpanded ? '' : 'hidden'}">Account</span>`;
        authButton.addEventListener('click', () => _navigateTo('auth'));
        authContainer.appendChild(authButton);
    }

    updateSidebarUI();
}