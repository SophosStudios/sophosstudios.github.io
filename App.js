// App.js
// This script contains the entire application logic, including Firebase initialization
// and all feature-specific functions for SophosWRLD.

// Import Firebase services - Using a consistent, updated version.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, query, onSnapshot, deleteDoc, orderBy, serverTimestamp, addDoc, where } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

// Import configuration from config.js
import CONFIG from './config.js'; 

// Import utility functions
import { showLoadingSpinner, hideLoadingSpinner, showMessageModal, updateTheme } from './utils.js';

// Import all page renderers
import { renderHomePage, renderAdminPage, renderAuthPage, renderDMsPage, renderProfilePage } from './page-renderers.js';

// Import navigation functions
import { initializeNavigation, renderSidebarNav } from './navigation.js';

// --- Global variables provided by the Canvas environment (do not change) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : CONFIG.firebaseConfig;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// DOM Elements
const contentArea = document.getElementById('content-area');
const mobileAuthButton = document.getElementById('mobile-auth-btn');
const mobileSidebarToggle = document.getElementById('sidebar-toggle');
const overlayBackdrop = document.getElementById('overlay-backdrop');

// Initialize Firebase and Firestore
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Global state variables
let currentUser = null;
let userData = null;

// Map of page names to their render functions
const pageRenderers = {
    'home': renderHomePage,
    'admin': renderAdminPage,
    'auth': renderAuthPage,
    'dms': renderDMsPage,
    'profile': renderProfilePage,
    // Add other pages here
};

/**
 * Handles navigation between pages.
 * @param {string} pageName - The name of the page to navigate to.
 * @param {boolean} [pushState=true] - Whether to add a new entry to the browser history.
 */
function navigateTo(pageName, pushState = true) {
    console.log(`Navigating to: ${pageName}`);
    showLoadingSpinner();
    
    // Check if the user is authenticated, and if not, always redirect to the auth page.
    if (!currentUser && pageName !== 'auth') {
        pageName = 'auth';
    }

    if (pageName in pageRenderers) {
        // Clear the main content area before rendering a new page
        contentArea.innerHTML = '';
        pageRenderers[pageName](contentArea, currentUser, userData, navigateTo, auth, db, appId, showMessageModal, showLoadingSpinner, hideLoadingSpinner);
        
        // Update browser history and local storage
        if (pushState) {
            history.pushState({ page: pageName }, '', `#${pageName}`);
            localStorage.setItem('currentPage', pageName);
        }

    } else {
        console.error(`Page renderer for "${pageName}" not found.`);
        contentArea.innerHTML = `<p class="text-xl text-red-500">Error: Page not found.</p>`;
    }
    hideLoadingSpinner();
}

// Attach popstate listener for browser back/forward buttons
window.addEventListener('popstate', (event) => {
    const pageName = event.state ? event.state.page : 'home';
    navigateTo(pageName, false); // Don't push state again
});

// Initialize the app on DOM content loaded
document.addEventListener('DOMContentLoaded', async () => {
    initializeNavigation(mobileSidebarToggle, overlayBackdrop);
    
    // Set up click listener for the mobile auth button
    if(mobileAuthButton) {
        mobileAuthButton.addEventListener('click', () => {
            navigateTo('auth');
            // Assuming toggleSidebar is available from navigation.js
            // You may need to import it or make it globally available if it's not.
            // toggleSidebar(); 
        });
    }

    // Set up a listener for Firebase Auth state changes
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        let authReady = false;

        if (currentUser) {
            // User is signed in
            console.log("User is signed in:", currentUser.uid);
            const userDocRef = doc(db, `/artifacts/${appId}/public/data/users`, currentUser.uid);
            
            try {
                const userDocSnap = await getDoc(userDocRef);
                
                if (userDocSnap.exists()) {
                    userData = userDocSnap.data();
                    console.log("User data loaded from Firestore:", userData);
                } else {
                    // Create a new user document for the newly signed-in user
                    console.log("New user signing in, creating Firestore document.");
                    userData = {
                        uid: currentUser.uid,
                        displayName: currentUser.displayName || 'Sophos Member',
                        email: currentUser.email || '',
                        photoURL: currentUser.photoURL || `https://placehold.co/150x150/000000/FFFFFF?text=${currentUser.displayName ? currentUser.displayName.charAt(0) : 'S'}`,
                        role: 'member',
                        theme: 'dark',
                        accentColor: '#ef4444'
                    };
                    await setDoc(userDocRef, userData);
                }

                // Apply user-specific theme
                if (userData.accentColor) {
                    updateTheme(userData.accentColor);
                }
                authReady = true;

            } catch (error) {
                console.error("Error fetching or creating user document:", error);
                showMessageModal("Failed to load user data. Please try again.", 'error');
            }
        } else {
            // User is signed out, no anonymous sign-in attempted.
            console.log("User is signed out.");
            userData = null;
            updateTheme('#ff0000'); // Default to red accent for unauthenticated users
            authReady = true;
        }

        if (authReady) {
            renderSidebarNav(currentUser, userData, navigateTo, signOut, auth, db, appId);
            const currentPage = localStorage.getItem('currentPage') || 'home';
            if (!contentArea.dataset.currentPage || contentArea.dataset.currentPage !== currentPage) {
                navigateTo(currentPage);
                contentArea.dataset.currentPage = currentPage;
            }
        }
    });
});
