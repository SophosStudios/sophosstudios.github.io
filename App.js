// App.js
// This script contains the entire application logic, including Firebase initialization
// and all feature-specific functions for SophosWRLD.

// Import Firebase services
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, signInWithCustomToken, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, query, onSnapshot, deleteDoc, orderBy, serverTimestamp, addDoc, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Import configuration from config.js
import CONFIG from './config.js'; 

// Import utility functions
import { showLoadingSpinner, hideLoadingSpinner, showMessageModal, updateTheme } from './utils.js';

// Import all page renderers
import { renderHomePage, renderAdminPage, renderAuthPage, renderDMsPage, renderSettingsPage, renderForumPage } from './page-renderers.js';

// Import navigation functions
import { initializeNavigation, renderSidebarNav } from './navigation.js';

// Import Firebase service functions
import { initializeFirebaseServices, updateUserRoleFirestore, sendDirectMessage, getDirectMessages, updateDirectMessageSeenStatus } from './firebase-service.js';

// --- Global variables provided by the Canvas environment (do not change) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : CONFIG.firebaseConfig;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
initializeFirebaseServices(firebaseConfig, CONFIG);

// Global state
let currentUser = null;
let userData = null;
let userList = [];

// DOM Elements
const contentArea = document.getElementById('content-area');
const sidebarToggle = document.getElementById('sidebar-toggle');
const mobileSidebarToggle = document.getElementById('mobile-sidebar-toggle');
const overlayBackdrop = document.getElementById('overlay-backdrop');
const modalContainer = document.getElementById('modal-container');
const mobileAuthButton = document.getElementById('mobile-auth-btn');
const googleProvider = new GoogleAuthProvider();

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
    
    // Render the new page based on the page name
    switch (page) {
        case 'home':
            renderHomePage(contentArea, currentUser, userData, navigateTo);
            break;
        case 'forum':
            // The firebaseService variable is not defined here, it's a separate module.
            // A more robust approach would be to pass the db and auth objects.
            // For now, we will simply pass the required arguments.
            renderForumPage(contentArea, currentUser, userData, { db, auth });
            break;
        case 'admin':
            if (userData?.role === 'admin') {
                renderAdminPage(contentArea, userList, currentUser, updateUserRoleFirestore);
            } else {
                contentArea.innerHTML = `<h1 class="text-3xl text-center text-red-500">Access Denied</h1>`;
            }
            break;
        case 'auth':
            renderAuthPage(contentArea, handleEmailPasswordSignIn, handleEmailPasswordSignUp, handleGoogleSignIn);
            break;
        case 'messages':
            if (currentUser) {
                renderDMsPage(contentArea, userList, currentUser, sendDirectMessage, getDirectMessages, updateDirectMessageSeenStatus);
            } else {
                contentArea.innerHTML = `<h1 class="text-3xl text-center text-red-500">You must be logged in to view messages.</h1>`;
            }
            break;
        case 'settings':
            renderSettingsPage(contentArea, currentUser, userData, navigateTo);
            break;
        default:
            contentArea.innerHTML = `<h1 class="text-3xl text-center text-gray-500">Page Not Found</h1>`;
            break;
    }
}

/**
 * Handles email/password sign-up.
 * @param {string} email 
 * @param {string} password 
 */
async function handleEmailPasswordSignUp(email, password) {
    try {
        showLoadingSpinner();
        await createUserWithEmailAndPassword(auth, email, password);
        showMessageModal('Sign up successful! Welcome to SophosWRLD.', 'success');
    } catch (error) {
        showMessageModal(error.message, 'error');
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Handles email/password sign-in.
 * @param {string} email 
 * @param {string} password 
 */
async function handleEmailPasswordSignIn(email, password) {
    try {
        showLoadingSpinner();
        await signInWithEmailAndPassword(auth, email, password);
        showMessageModal('Sign in successful!', 'success');
    } catch (error) {
        showMessageModal(error.message, 'error');
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Handles Google Sign-In with a pop-up.
 */
async function handleGoogleSignIn() {
    try {
        showLoadingSpinner();
        await signInWithPopup(auth, googleProvider);
        showMessageModal('Google Sign-In successful!', 'success');
    } catch (error) {
        showMessageModal(error.message, 'error');
    } finally {
        hideLoadingSpinner();
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
            } catch (error) {
                console.error("Error signing in with custom token:", error);
            }
        }
        
        const userDocRef = doc(db, `/artifacts/${appId}/public/data/users`, user.uid);
        onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                userData = { id: doc.id, ...doc.data() };
                if (userData.accentColor) {
                    updateTheme(userData.accentColor);
                }
            } else {
                userData = {
                    username: user.email ? user.email.split('@')[0] : 'Guest',
                    email: user.email || 'N/A',
                    role: 'member',
                    theme: 'dark',
                    accentColor: '#ef4444'
                };
                setDoc(doc(db, `/artifacts/${appId}/public/data/users`, user.uid), userData);
            }
            
            renderSidebarNav(currentUser, userData, navigateTo, signOut, auth);
            const currentPage = localStorage.getItem('currentPage') || 'home';
            navigateTo(currentPage);
        });

        // Real-time listener for all users
        const usersQuery = collection(db, `/artifacts/${appId}/public/data/users`);
        onSnapshot(usersQuery, (snapshot) => {
            userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        });

    } else {
        userData = null;
        userList = [];
        renderSidebarNav(currentUser, userData, navigateTo, signOut, auth);
        navigateTo('auth');
    }
});


document.addEventListener('DOMContentLoaded', async () => {
    initializeNavigation(mobileSidebarToggle, overlayBackdrop);
    
    // Set up click listener for the mobile auth button
    if(mobileAuthButton) {
        mobileAuthButton.addEventListener('click', () => {
            navigateTo('auth');
            // A toggleSidebar() function is not defined in the provided code.
            // We should either define it or remove this line to prevent errors.
            // For now, I will comment it out to prevent errors.
            // toggleSidebar();
        });
    }

});
