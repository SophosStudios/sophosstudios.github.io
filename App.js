// src/App.js
// This script contains the entire application logic, including Firebase initialization
// and new features like forum, post management, reactions, comments, and enhanced backgrounds.

// Import Firebase functions
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";

// Import all services and renderers
import CONFIG from './config.js';
import { initializeFirebaseServices, fetchCurrentUserFirestoreData } from './firebase-service.js';
import { initializeNavigation } from './navigation.js';
import {
    initializePageRenderers,
    renderHomePage,
    renderAboutPage,
    renderAuthPage,
    renderForumPage,
    renderAdminPage,
    renderProfilePage,
    renderPartnerApplicationPage,
    renderManagePartnerAppsPage,
    renderManageVideosPage
} from './page-renderers.js';
import { initializeModalModule } from './modals.js';
import { showLoadingSpinner, hideLoadingSpinner } from './utils.js';

// DOM Elements
const contentArea = document.getElementById('content-area');

// Global state variables
let currentUser = null;
let userData = null;

// Initialize Firebase services with the configuration from config.js
initializeFirebaseServices(CONFIG.firebaseConfig, CONFIG);
const auth = getAuth();

/**
 * Main navigation function to render different pages.
 * @param {string} pageName - The name of the page to render.
 */
function navigateTo(pageName) {
    contentArea.dataset.currentPage = pageName;
    switch (pageName) {
        case 'home':
            renderHomePage();
            break;
        case 'about':
            renderAboutPage();
            break;
        case 'auth':
            renderAuthPage();
            break;
        case 'forum':
            renderForumPage();
            break;
        case 'admin':
            renderAdminPage();
            break;
        case 'profile':
            renderProfilePage();
            break;
        case 'partner-application':
            renderPartnerApplicationPage();
            break;
        case 'manage-partner-apps':
            renderManagePartnerAppsPage();
            break;
        case 'manage-videos':
            renderManageVideosPage();
            break;
        default:
            renderHomePage();
            break;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Set up the Firebase Auth state change listener
    onAuthStateChanged(auth, async (user) => {
        showLoadingSpinner();
        if (user) {
            currentUser = user;
            userData = await fetchCurrentUserFirestoreData(currentUser);
            // Re-initialize modules with the new user data
            initializeNavigation(currentUser, userData, navigateTo, CONFIG);
            initializePageRenderers(currentUser, userData, navigateTo, CONFIG);
            initializeModalModule(currentUser, userData, navigateTo, null, CONFIG);

            // Re-render the current page to reflect the logged-in state
            const currentPage = contentArea.dataset.currentPage || 'home';
            navigateTo(currentPage);
        } else {
            currentUser = null;
            userData = null;
            // Re-initialize modules for logged-out state
            initializeNavigation(currentUser, userData, navigateTo, CONFIG);
            initializePageRenderers(currentUser, userData, navigateTo, CONFIG);
            initializeModalModule(currentUser, userData, navigateTo, null, CONFIG);

            // Navigate to home if user logs out
            navigateTo('home');
        }
        hideLoadingSpinner();
    });

    // Initial navigation on page load
    if (!contentArea.dataset.currentPage) {
        navigateTo('home');
    }
});
