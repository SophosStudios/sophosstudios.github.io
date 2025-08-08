// src/navigation.js
// Handles sidebar navigation rendering and toggle logic.

import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js';
import { showMessageModal, getRoleVFX } from './utils.js';

// Global state and functions passed from App.js
let _currentUser = null;
let _userData = null;
let _navigateTo = null;
let _CONFIG = null;

// DOM Elements for navigation
const navLinksContainer = document.getElementById('nav-links');
const mobileDynamicLinksContainer = document.getElementById('mobile-dynamic-links');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sideDrawerMenu = document.getElementById('side-drawer-menu');
const closeDrawerBtn = document.getElementById('close-drawer-btn');
const websiteTitle = document.querySelector('title');

/**
 * Initializes the navigation module with necessary global state and functions.
 * This should be called once from App.js.
 * @param {object} currentUser - The current Firebase Auth user object.
 * @param {object} userData - The current Firestore user data.
 * @param {function} navigateTo - The navigation function from App.js.
 * @param {object} CONFIG - The application's configuration object.
 */
export function initializeNavigation(currentUser, userData, navigateTo, CONFIG) {
    _currentUser = currentUser;
    _userData = userData;
    _navigateTo = navigateTo;
    _CONFIG = CONFIG;
    renderNavbar();
    setupEventListeners();
}

/**
 * Renders the dynamic part of the navigation bar based on user authentication and role.
 */
function renderNavbar() {
    // Clear existing dynamic links
    navLinksContainer.innerHTML = '';
    mobileDynamicLinksContainer.innerHTML = '';

    // Set website title
    websiteTitle.textContent = _CONFIG.websiteTitle;

    // Add common links for all authenticated users
    if (_currentUser) {
        addNavLink('Forum', 'forum');
        addNavLink('Profile', 'profile');
    }

    // Add admin-specific links
    if (_userData && (_userData.role === 'admin' || _userData.role === 'founder')) {
        addNavLink('Admin', 'admin');
    }
    
    // Add partner application link for members
    if (_userData && _userData.role === 'member') {
        addNavLink('Partner', 'partner-application');
    }

    // Add auth-related buttons
    if (_currentUser) {
        const displayName = _userData?.displayName || _currentUser.email.split('@')[0];
        addNavLink('Logout', 'logout', true, 'logout');
    } else {
        addNavLink('Login', 'auth');
    }
}

/**
 * A helper function to create and append a navigation link.
 * @param {string} text - The display text of the link.
 * @param {string} pageName - The page to navigate to.
 * @param {boolean} isMobileOnly - Whether to render only in the mobile drawer.
 * @param {string} [actionType] - The type of action ('logout' etc.).
 */
function addNavLink(text, pageName, isLogout = false) {
    // Desktop button
    const desktopButton = document.createElement('button');
    desktopButton.textContent = text;
    desktopButton.className = 'px-4 py-2 rounded-lg hover:bg-gray-700 text-white transition duration-200';
    desktopButton.addEventListener('click', () => {
        if (isLogout) {
            handleLogout();
        } else {
            _navigateTo(pageName);
        }
    });
    navLinksContainer.appendChild(desktopButton);

    // Mobile button
    const mobileButton = document.createElement('button');
    mobileButton.textContent = text;
    mobileButton.className = 'block w-full text-left px-4 py-3 hover:bg-gray-700 text-white transition duration-200 text-lg font-semibold';
    mobileButton.addEventListener('click', () => {
        if (isLogout) {
            handleLogout();
        } else {
            _navigateTo(pageName);
            sideDrawerMenu.classList.remove('open');
        }
    });
    mobileDynamicLinksContainer.appendChild(mobileButton);
}

/**
 * Sets up global event listeners for navigation.
 */
function setupEventListeners() {
    mobileMenuBtn.addEventListener('click', () => {
        sideDrawerMenu.classList.add('open');
    });

    closeDrawerBtn.addEventListener('click', () => {
        sideDrawerMenu.classList.remove('open');
    });

    // Add event listeners for static buttons
    document.getElementById('nav-home').addEventListener('click', () => _navigateTo('home'));
    document.getElementById('nav-about').addEventListener('click', () => _navigateTo('about'));
    document.getElementById('mobile-drawer-home').addEventListener('click', () => { _navigateTo('home'); sideDrawerMenu.classList.remove('open'); });
    document.getElementById('mobile-drawer-about').addEventListener('click', () => { _navigateTo('about'); sideDrawerMenu.classList.remove('open'); });
}

/**
 * Handles the logout process.
 */
async function handleLogout() {
    const auth = getAuth();
    try {
        await signOut(auth);
        showMessageModal('You have been signed out successfully.', 'success');
    } catch (error) {
        showMessageModal(error.message, 'error');
    }
}
