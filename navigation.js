// src/navigation.js
// Handles sidebar navigation rendering and toggle logic.

import { getRoleVFX } from './utils.js';
import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js';
import { showMessageModal } from './utils.js';

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
const sidebarIcon = document.getElementById('sidebar-icon');
const websiteTitleSidebar = document.getElementById('website-title-sidebar');
const adminPanelButtonContainer = document.getElementById('admin-panel-button-container');

// State for sidebar
let isSidebarExpanded = window.innerWidth >= 768;

/**
 * Initializes the navigation module with necessary global state and functions.
 * @param {object} currentUser - The current Firebase Auth user object.
 * @param {object} userData - The current Firestore user data.
 * @param {function} navigateTo - The function to change pages.
 * @param {function} CONFIG - The application configuration.
 */
export function initializeNavigation(currentUser, userData, navigateTo, CONFIG) {
    _currentUser = currentUser;
    _userData = userData;
    _navigateTo = navigateTo;
    _CONFIG = CONFIG;

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    if (overlayBackdrop) {
        overlayBackdrop.addEventListener('click', toggleSidebar);
    }

    renderSidebarNav();
}

/**
 * Toggles the sidebar's expanded/collapsed state.
 */
function toggleSidebar() {
    isSidebarExpanded = !isSidebarExpanded;
    updateSidebarUI();
}

/**
 * Renders the sidebar navigation links based on user authentication and role.
 */
export function renderSidebarNav() {
    if (!leftSidebarNav) return;

    leftSidebarNav.innerHTML = '';
    adminPanelButtonContainer.innerHTML = '';

    // Static links
    const homeLink = createNavLink('home', 'fas fa-home', 'Home');
    const aboutLink = createNavLink('about', 'fas fa-info-circle', 'About');
    leftSidebarNav.appendChild(homeLink);
    leftSidebarNav.appendChild(aboutLink);
    
    // Dynamic links
    if (_currentUser) {
        // Add new links for forum and messages
        const forumLink = createNavLink('forum', 'fas fa-users', 'Forum');
        const messagesLink = createNavLink('messages', 'fas fa-envelope', 'Messages');
        leftSidebarNav.appendChild(forumLink);
        leftSidebarNav.appendChild(messagesLink);
        
        // Add Admin link if user is an admin
        if (_userData?.role === 'admin') {
            const adminLink = createNavLink('admin', 'fas fa-user-shield', 'Admin');
            leftSidebarNav.appendChild(adminLink);
        }
        
        // Authentication-related buttons
        const userProfileInfo = document.createElement('div');
        userProfileInfo.className = 'w-full text-center mt-auto mb-4';
        userProfileInfo.innerHTML = `
            <div class="flex items-center justify-center p-2 rounded-lg bg-gray-700 mx-2">
                <p class="text-sm font-semibold text-gray-300 truncate">${_userData?.username || 'User'}</p>
            </div>
            <button id="logout-btn" class="w-full mt-2 py-2 px-4 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition duration-300 text-center text-sm">Sign Out</button>
        `;
        adminPanelButtonContainer.appendChild(userProfileInfo);
        document.getElementById('logout-btn').addEventListener('click', async () => {
            try {
                const auth = getAuth();
                await signOut(auth);
                showMessageModal('You have been signed out successfully.');
                _navigateTo('home');
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
        });
    } else {
        const authButton = document.createElement('button');
        authButton.id = 'auth-btn';
        authButton.className = 'w-full py-2 px-4 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition duration-300 text-center text-sm';
        authButton.textContent = 'Account';
        authButton.addEventListener('click', () => {
            _navigateTo('auth');
        });
        adminPanelButtonContainer.appendChild(authButton);
    }
    
    updateSidebarUI();
}

/**
 * Creates a navigation link element.
 * @param {string} page - The page to navigate to.
 * @param {string} iconClass - Font Awesome icon class.
 * @param {string} text - The text for the link.
 * @returns {HTMLElement} The created link element.
 */
function createNavLink(page, iconClass, text) {
    const link = document.createElement('div');
    link.className = `sidebar-nav-item flex items-center p-3 rounded-lg cursor-pointer hover:bg-gray-700 transition duration-200 mb-2`;
    link.innerHTML = `
        <i class="${iconClass} text-xl"></i>
        <span class="ml-4 text-white text-lg sidebar-nav-text">${text}</span>
    `;
    link.addEventListener('click', () => {
        _navigateTo(page);
        if (window.innerWidth < 768) {
            toggleSidebar(); // Close sidebar on mobile after navigating
        }
    });
    return link;
}

/**
 * Updates the UI of the sidebar based on its expanded state.
 */
function updateSidebarUI() {
    if (isSidebarExpanded) {
        leftSidebar.style.width = '250px';
        mainContentWrapper.style.marginLeft = '250px';
        sidebarIcon.classList.remove('fa-bars');
        sidebarIcon.classList.add('fa-times');
        overlayBackdrop.style.display = 'block';
        websiteTitleSidebar.classList.remove('hidden');
        leftSidebarNav.querySelectorAll('.sidebar-nav-text').forEach(textSpan => {
            textSpan.classList.remove('hidden');
        });
    } else {
        leftSidebar.style.width = '64px';
        mainContentWrapper.style.marginLeft = '64px';
        sidebarIcon.classList.remove('fa-times');
        sidebarIcon.classList.add('fa-bars');
        overlayBackdrop.style.display = 'none';
        websiteTitleSidebar.classList.add('hidden');
        leftSidebarNav.querySelectorAll('.sidebar-nav-text').forEach(textSpan => {
            textSpan.classList.add('hidden');
        });
    }
}
