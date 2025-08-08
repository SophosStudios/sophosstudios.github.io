// App.js
// This script contains the entire application logic, including Firebase initialization
// and all feature-specific functions for SophosWRLD.

// Import Firebase services
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, signInWithCustomToken, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, query, onSnapshot, deleteDoc, orderBy, serverTimestamp, addDoc, where } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// Import configuration from config.js
import CONFIG from './config.js'; 

// Import utility functions
import { showLoadingSpinner, hideLoadingSpinner, showMessageModal, updateTheme } from './utils.js';

// Import all page renderers
import { renderHomePage, renderAdminPage, renderAuthPage, renderDMsPage, renderSettingsPage, renderForumsPage } from './page-renderers.js';

// Import navigation functions
import { initializeNavigation, renderSidebarNav } from './navigation.js';

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
const sidebarToggle = document.getElementById('sidebar-toggle');
const mobileSidebarToggle = document.getElementById('mobile-sidebar-toggle');
const overlayBackdrop = document.getElementById('overlay-backdrop');
const modalContainer = document.getElementById('modal-container');
const mobileAuthButton = document.getElementById('mobile-auth-btn');

// --- Navigation and Routing ---

/**
 * Handles navigation to different pages.
 * @param {string} page - The page to render.
 */
function navigateTo(page) {
    if (!contentArea) {
        console.error("Content area not found.");
        return;
    }
    
    // Clear the content area
    contentArea.innerHTML = '';
    localStorage.setItem('currentPage', page); // Save current page
    
    // Render the new page based on the page name
    switch (page) {
        case 'home':
            renderHomePage(contentArea, currentUser, userData, navigateTo);
            break;
        case 'admin':
            renderAdminPage(contentArea, currentUser, userData, db, appId, showMessageModal);
            break;
        case 'auth':
            renderAuthPage(contentArea, auth, db, appId, showMessageModal, showLoadingSpinner, hideLoadingSpinner, navigateTo);
            break;
        case 'messages':
            renderDMsPage(contentArea, currentUser, db, appId, showMessageModal, showLoadingSpinner, hideLoadingSpinner);
            break;
        case 'settings':
            renderSettingsPage(contentArea, currentUser, userData, db, appId, showMessageModal, showLoadingSpinner, hideLoadingSpinner, updateTheme);
            break;
        case 'forums':
            renderForumsPage(contentArea, currentUser, userData, db, appId, showMessageModal);
            break;
        default:
            contentArea.innerHTML = `<h1 class="text-3xl text-center text-gray-500">Page Not Found</h1>`;
            break;
    }
}

// --- Firebase Authentication Listener ---

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    
    if (user) {
        // Sign in with custom token if available
        if (initialAuthToken) {
            try {
                await signInWithCustomToken(auth, initialAuthToken);
                console.log("Signed in with custom token.");
            } catch (error) {
                console.error("Error signing in with custom token:", error);
            }
        }
        
        // Fetch user data from Firestore
        const userDocRef = doc(db, `/artifacts/${appId}/public/data/users`, user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            userData = { id: userDoc.id, ...userDoc.data() };
        } else {
            // Create a new user entry if one doesn't exist
            userData = {
                username: user.email ? user.email.split('@')[0] : 'Guest',
                email: user.email || 'N/A',
                role: 'member',
                theme: 'dark',
                accentColor: '#ef4444' // Default red color
            };
            await setDoc(doc(db, `/artifacts/${appId}/public/data/users`, user.uid), userData);
        }
        
        // Apply user-specific theme
        if (userData.accentColor) {
            updateTheme(userData.accentColor);
        }

        // Render the navigation and initial page after auth state is determined
        renderSidebarNav(currentUser, userData, navigateTo, signOut, auth, db, appId);
        const currentPage = localStorage.getItem('currentPage') || 'home';
        navigateTo(currentPage);
        
    } else {
        // Not authenticated
        userData = null;
        renderSidebarNav(currentUser, userData, navigateTo, signOut, auth, db, appId);
        navigateTo('auth');
    }
});


document.addEventListener('DOMContentLoaded', async () => {
    initializeNavigation(mobileSidebarToggle, overlayBackdrop);
    
    // Set up click listener for the mobile auth button
    if(mobileAuthButton) {
        mobileAuthButton.addEventListener('click', () => {
            navigateTo('auth');
            if (window.innerWidth < 768) {
                toggleSidebar(); // Assuming toggleSidebar is exported from navigation
            }
        });
    }

    // Anonymous sign-in has been removed from here.
    // The onAuthStateChanged listener will now handle unauthenticated
    // users by redirecting them to the 'auth' page.
});