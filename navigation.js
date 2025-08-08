// src/navigation.js
// This script handles all sidebar navigation rendering and toggle logic.

// Import necessary Firebase functions and utilities
import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { showMessageModal } from './utils.js';

// Global state and functions passed from App.js
let _currentUser = null;
let _userData = null;
let _navigateTo = null;
let _CONFIG = null;

// DOM Elements
const leftSidebar = document.getElementById('left-sidebar');
const mainContentWrapper = document.getElementById('main-content-wrapper');
const overlayBackdrop = document.getElementById('overlay-backdrop');
const sidebarToggle = document.getElementById('sidebar-toggle');
const websiteTitleSidebar = document.getElementById('website-title-sidebar');
const leftSidebarNav = document.getElementById('left-sidebar-nav');
const mobileAuthButton = document.getElementById('mobile-auth-btn');
const mobileMenuCloseButton = document.getElementById('mobile-menu-close');

let isSidebarExpanded = window.innerWidth >= 768;

/**
 * Toggles the visibility of the sidebar menu and overlay.
 */
function toggleSidebar() {
    isSidebarExpanded = !isSidebarExpanded;
    if (isSidebarExpanded) {
        leftSidebar.classList.remove('-translate-x-full');
        leftSidebar.classList.add('translate-x-0');
        mainContentWrapper.classList.remove('md:ml-20');
        mainContentWrapper.classList.add('md:ml-64');
        overlayBackdrop.classList.add('hidden');
    } else {
        leftSidebar.classList.remove('translate-x-0');
        leftSidebar.classList.add('-translate-x-full');
        mainContentWrapper.classList.remove('md:ml-64');
        mainContentWrapper.classList.add('md:ml-20');
        overlayBackdrop.classList.remove('hidden');
    }
}

/**
 * Renders the sidebar navigation links based on user authentication status and role.
 * @param {object} currentUser - The current authenticated Firebase user object.
 * @param {object} userData - The user's data from Firestore.
 * @param {function} navigateTo - The navigation function from App.js.
 * @param {function} signOut - The Firebase signOut function.
 * @param {object} auth - The Firebase Auth instance.
 */
export function renderSidebarNav(currentUser, userData, navigateTo, signOut, auth) {
    if (!leftSidebarNav) return;

    leftSidebarNav.innerHTML = ``; // Clear existing links
    const navLinks = [
        { id: 'nav-home', text: 'Home', icon: 'fas fa-home', page: 'home', requiresAuth: false },
        { id: 'nav-forum', text: 'Forum', icon: 'fas fa-comments', page: 'forum', requiresAuth: true },
        { id: 'nav-messages', text: 'Messages', icon: 'fas fa-envelope', page: 'messages', requiresAuth: true },
        { id: 'nav-settings', text: 'Settings', icon: 'fas fa-cogs', page: 'settings', requiresAuth: true },
        { id: 'nav-admin', text: 'Admin', icon: 'fas fa-user-shield', page: 'admin', requiresAuth: true, requiresAdmin: true },
    ];

    navLinks.forEach(link => {
        if (!link.requiresAuth || currentUser) {
            if (!link.requiresAdmin || (userData && userData.role === 'admin')) {
                const navItem = document.createElement('div');
                navItem.className = 'w-full mb-2';
                navItem.innerHTML = `
                    <button id="${link.id}" class="flex items-center w-full px-4 py-2 rounded-lg text-white font-semibold hover:bg-gray-700 transition duration-200">
                        <i class="${link.icon} text-lg mr-4"></i>
                        <span class="sidebar-nav-text text-lg">${link.text}</span>
                    </button>
                `;
                leftSidebarNav.appendChild(navItem);
                navItem.querySelector('button').addEventListener('click', () => {
                    navigateTo(link.page);
                    if (window.innerWidth < 768) {
                        toggleSidebar();
                    }
                });
            }
        }
    });

    // Add Auth/Logout button dynamically
    const authButtonContainer = document.createElement('div');
    authButtonContainer.className = 'w-full mt-auto'; // Push to the bottom of the sidebar
    if (currentUser) {
        const logoutButton = document.createElement('button');
        logoutButton.id = 'nav-logout';
        logoutButton.className = 'w-full flex items-center px-4 py-2 rounded-lg text-white font-semibold bg-red-600 hover:bg-red-700 transition duration-200';
        logoutButton.innerHTML = `<i class="fas fa-sign-out-alt text-lg mr-4"></i><span class="sidebar-nav-text text-lg">Logout</span>`;
        logoutButton.addEventListener('click', async () => {
            try {
                await signOut(auth);
                showMessageModal('You have been signed out successfully.');
                navigateTo('home');
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
        });
        authButtonContainer.appendChild(logoutButton);
    } else {
        const loginButton = document.createElement('button');
        loginButton.id = 'nav-login';
        loginButton.className = 'w-full flex items-center px-4 py-2 rounded-lg text-white font-semibold bg-blue-600 hover:bg-blue-700 transition duration-200';
        loginButton.innerHTML = `<i class="fas fa-sign-in-alt text-lg mr-4"></i><span class="sidebar-nav-text text-lg">Login</span>`;
        loginButton.addEventListener('click', () => navigateTo('auth'));
        authButtonContainer.appendChild(loginButton);
    }
    leftSidebarNav.appendChild(authButtonContainer);

    // Initial state based on screen size
    if (window.innerWidth >= 768) {
        leftSidebar.classList.remove('-translate-x-full');
        mainContentWrapper.classList.remove('ml-20');
        mainContentWrapper.classList.add('ml-64');
    }
}

/**
 * Initializes all navigation event listeners.
 * @param {HTMLElement} mobileSidebarToggle - The mobile toggle button element.
 * @param {HTMLElement} overlayBackdrop - The overlay backdrop element.
 */
export function initializeNavigation(mobileSidebarToggle, overlayBackdrop) {
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }
    if (mobileSidebarToggle) {
        mobileSidebarToggle.addEventListener('click', () => {
            leftSidebar.classList.remove('-translate-x-full');
            leftSidebar.classList.add('translate-x-0');
            overlayBackdrop.classList.remove('hidden');
        });
    }
    if (mobileMenuCloseButton) {
        mobileMenuCloseButton.addEventListener('click', () => {
            leftSidebar.classList.remove('translate-x-0');
            leftSidebar.classList.add('-translate-x-full');
            overlayBackdrop.classList.add('hidden');
        });
    }
    if (overlayBackdrop) {
        overlayBackdrop.addEventListener('click', toggleSidebar);
    }

    // Handle window resize for responsive behavior
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768) {
            if (!isSidebarExpanded) {
                leftSidebar.classList.remove('-translate-x-full');
                leftSidebar.classList.add('translate-x-0');
            }
            mainContentWrapper.classList.remove('ml-20', 'ml-64');
            mainContentWrapper.classList.add(isSidebarExpanded ? 'ml-64' : 'ml-20');
            overlayBackdrop.classList.add('hidden');
        } else {
            if (isSidebarExpanded) {
                leftSidebar.classList.remove('translate-x-0');
                leftSidebar.classList.add('-translate-x-full');
                overlayBackdrop.classList.add('hidden');
            }
        }
    });
}
