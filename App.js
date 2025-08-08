// App.js
// This script contains the entire application logic, including Firebase initialization
// and navigation.

// Import Firebase functions from the service file
import { initializeFirebaseServices, fetchUserData, signOutUser } from './firebase-service.js';

// Import all renderers and navigation logic
import * as PageRenderers from './page-renderers.js';
import * as Navigation from './navigation.js';

// Import configuration
import CONFIG from './config.js';
import { updateTheme } from './utils.js';

// Import Firebase core and auth services
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, query, onSnapshot, deleteDoc, orderBy, serverTimestamp, addDoc, where } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";


// --- Global variables provided by the Canvas environment (do not change) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : CONFIG.firebaseConfig;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global state
let currentUser = null;
let userData = null;

// DOM Elements
const contentArea = document.getElementById('content-area');
const navHomeButton = document.getElementById('nav-home');

// --- Navigation and Routing ---

/**
 * Handles navigation to different pages.
 * @param {string} pageId - The page to render.
 */
function navigateTo(pageId) {
    // Clear content area before rendering new page
    if (!contentArea) {
        console.error("Content area not found.");
        return;
    }
    contentArea.innerHTML = '';

    // Store the current page in local storage
    localStorage.setItem('currentPage', pageId);

    // Render the new page based on the page name
    switch (pageId) {
        case 'home':
            PageRenderers.renderHomePage();
            break;
        case 'about':
            PageRenderers.renderAboutPage();
            break;
        case 'forums':
            PageRenderers.renderForumsPage();
            break;
        case 'profile':
            PageRenderers.renderProfilePage();
            break;
        case 'settings':
            PageRenderers.renderSettingsPage();
            break;
        case 'direct-messages':
            PageRenderers.renderDirectMessagesPage();
            break;
        case 'admin-panel':
            PageRenderers.renderAdminPanelPage();
            break;
        case 'login':
            PageRenderers.renderLoginPage();
            break;
        default:
            PageRenderers.renderHomePage();
            break;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Firebase services
    initializeFirebaseServices(firebaseConfig, CONFIG);

    // Handle initial anonymous sign-in or custom token sign-in
    try {
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else if (!auth.currentUser) {
            await signInAnonymously(auth);
        }
    } catch (error) {
        console.error("Authentication failed:", error);
    }
    
    // Set up the Firebase Auth state change listener
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            userData = await fetchUserData(user.uid);
            if (!userData) {
                userData = { displayName: user.email ? user.email.split('@')[0] : 'Guest', role: 'member', theme: 'dark', accentColor: '#ff0000' };
                // You might want to save this to Firestore here
            }
            // Apply user-specific theme
            if (userData.accentColor) {
                updateTheme(userData.accentColor);
            }
        } else {
            currentUser = null;
            userData = null;
            updateTheme('#ff0000'); // Default to red accent for unauthenticated users
        }
        
        // Initialize and render navigation with the latest user state
        Navigation.initializeNavigation(currentUser, userData, navigateTo, CONFIG);
        Navigation.renderNav();
        
        // Initialize page renderers with the latest user state
        PageRenderers.initializeRenderers(currentUser, userData, navigateTo, CONFIG);

        // Navigate to a page after authentication state is confirmed.
        const currentPage = localStorage.getItem('currentPage') || 'home';
        navigateTo(currentPage);
    });

    // Event listeners for the top nav home button
    if (navHomeButton) {
        navHomeButton.addEventListener('click', () => navigateTo('home'));
    }
});
