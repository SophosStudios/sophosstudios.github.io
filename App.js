// App.js
// This is the main entry point for the application.
// It initializes Firebase, manages global authentication state,
// and coordinates between different modules (navigation, page renderers, modals).

import CONFIG from './config.js';
import { initializeFirebaseServices, getFirebaseAuth, fetchCurrentUserFirestoreData } from './src/firebase-service.js';
import { initializeNavigation, updateNavigationState, closeSidebar } from './src/navigation.js';
import { initializePageRenderers, updatePageRendererState } from './src/page-renderers.js';
import { initializeModals, updateModalState } from './src/modals.js';
import { showLoadingSpinner, hideLoadingSpinner, showMessageModal, updateBodyBackground } from './src/utils.js';

// Global State Variables
let currentUser = null; // Firebase Auth user object
let userData = null; // Firestore user document data (role, background, etc.)

// DOM Elements
const contentArea = document.getElementById('content-area');

// Firebase Auth instance (will be initialized after Firebase services)
let auth = null;

/**
 * Navigates to a specific page and renders its content.
 * This is the central navigation function, passed to other modules.
 * @param {string} page - The page to navigate to.
 * @param {string} [id=null] - Optional: postId for edit-post route, userId for send-email route, or any other ID.
 */
async function navigateTo(page, id = null) {
    // Store the current page in a data attribute on the content area for tracking
    contentArea.dataset.currentPage = page;
    contentArea.dataset.currentId = id; // Store generic ID if applicable

    // Close sidebar on navigation (important for mobile)
    closeSidebar();

    // Handle logout separately as it modifies auth state
    if (page === 'logout') {
        showLoadingSpinner();
        try {
            if (auth) { // Ensure auth is defined before signing out
                await auth.signOut();
            }
            currentUser = null;
            userData = null;
            showMessageModal('You have been signed out.');
            page = 'home'; // Redirect to home after logout
        } catch (error) {
            console.error("Error signing out:", error.message);
            showMessageModal("Failed to sign out. Please try again.", 'error');
            hideLoadingSpinner();
            return; // Prevent navigating away if sign out fails
        } finally {
            hideLoadingSpinner();
        }
    }

    // Pass current user and user data to page renderers
    // Page renderers will then handle their own logic and dependencies
    const pageRenderers = await import('./src/page-renderers.js'); // Dynamic import to avoid circular dependency
    switch (page) {
        case 'home':
            pageRenderers.renderHomePage();
            break;
        case 'auth':
            pageRenderers.renderAuthPage();
            break;
        case 'profile':
            pageRenderers.renderProfilePage();
            break;
        case 'settings':
            pageRenderers.renderSettingsPage();
            break;
        case 'about':
            pageRenderers.renderAboutPage();
            break;
        case 'admin':
            pageRenderers.renderAdminPanelPage();
            break;
        case 'edit-post':
            if (id) {
                pageRenderers.renderEditPostPage(id);
            } else {
                showMessageModal("Invalid post ID for editing.", 'error');
                navigateTo('forum');
            }
            break;
        case 'forum':
            pageRenderers.renderForumPage();
            break;
        case 'team':
            pageRenderers.renderTeamPage();
            break;
        case 'send-email':
            pageRenderers.renderSendEmailPage(id);
            break;
        case 'partners':
            pageRenderers.renderPartnersPage();
            break;
        case 'partner-tos':
            pageRenderers.renderPartnerTOSPage();
            break;
        case 'apply-partner':
            pageRenderers.renderApplyPartnerPage();
            break;
        case 'partner-applications':
            pageRenderers.renderPartnerApplicationsAdminPage();
            break;
        case 'manage-partner-questions':
            pageRenderers.renderManagePartnerQuestionsPage();
            break;
        case 'videos': // New videos page
            pageRenderers.renderVideosPage();
            break;
        case 'manage-videos': // New manage videos page
            pageRenderers.renderManageVideosPage();
            break;
        case 'submit-code': // New submit code page
            pageRenderers.renderSubmitCodePage();
            break;
        case 'review-code-submissions': // New review code submissions page
            pageRenderers.renderReviewCodeSubmissionsPage();
            break;
        case 'approved-code': // New approved code showcase page
            pageRenderers.renderApprovedCodePage();
            break;
        case 'simple-game': // New simple game page
            pageRenderers.renderSimpleGamePage();
            break;
        default:
            pageRenderers.renderHomePage();
    }
    // Update navigation UI after page change
    updateNavigationState(currentUser, userData);
}

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Firebase services first
    initializeFirebaseServices(CONFIG.firebaseConfig, CONFIG);
    // Now that Firebase app is initialized, get the auth instance
    auth = getFirebaseAuth();

    // Initialize other modules, passing necessary dependencies
    initializeNavigation(currentUser, userData, navigateTo, CONFIG);
    initializePageRenderers(currentUser, userData, navigateTo, CONFIG);
    // Modals module needs references to render functions for re-rendering pages after modal actions
    initializeModals(currentUser, userData, navigateTo,
        () => navigateTo('admin'), // renderAdminPanelPage
        () => navigateTo('forum'), // renderForumPage
        () => navigateTo('partners'), // renderPartnersPage
        () => navigateTo('partner-tos'), // renderPartnerTOSPage
        () => navigateTo('manage-partner-questions'), // renderManagePartnerQuestionsPage
        () => navigateTo('videos'), // renderVideosPage
        () => navigateTo('review-code-submissions') // renderReviewCodeSubmissionsPage
    );


    // Firebase Auth State Listener - Central point for user state management
    auth.onAuthStateChanged(async (user) => {
        showLoadingSpinner();
        if (user) {
            currentUser = user;
            try {
                // Rely on fetchCurrentUserFirestoreData to create user document if it doesn't exist
                const fetchedUserData = await fetchCurrentUserFirestoreData(currentUser);
                if (fetchedUserData) {
                    userData = fetchedUserData;
                } else {
                    // If fetchedUserData is null, it means there was an error fetching/creating data.
                    // Log out the user and redirect to auth.
                    console.error("Failed to fetch or create user data in Firestore for authenticated user.");
                    if (auth) {
                        await auth.signOut();
                    }
                    currentUser = null;
                    userData = null;
                    showMessageModal("Failed to load user data. Please try signing in again.", 'error');
                    navigateTo('auth');
                    hideLoadingSpinner();
                    return;
                }

                // Update UI based on new user data
                updateBodyBackground(userData); // Apply user's saved background and theme
                updateNavigationState(currentUser, userData); // Update navigation with user info
                updatePageRendererState(currentUser, userData); // Update page renderers with user info
                updateModalState(currentUser, userData); // Update modals with user info

                // Check if the user is banned before allowing them to proceed
                if (userData.isBanned) {
                    if (auth) { // Ensure auth is defined before signing out
                        await auth.signOut();
                    }
                    currentUser = null;
                    userData = null;
                    showMessageModal("Your account has been banned. Please contact support for more information.", 'error');
                    navigateTo('auth'); // Redirect to auth page or a specific banned page
                    hideLoadingSpinner();
                    return; // Stop further rendering
                }

                // Determine which page to render based on current state or previous navigation
                let pageToRender = contentArea.dataset.currentPage || 'home';
                let currentId = contentArea.dataset.currentId || null;

                if (pageToRender === 'auth' || pageToRender === 'logout') {
                    pageToRender = 'home'; // Always redirect to home if coming from auth/logout
                }
                navigateTo(pageToRender, currentId); // Navigate to the appropriate page

            } catch (error) {
                console.error("Error setting up user data after auth state change:", error);
                if (auth) { // Ensure auth is defined before signing out
                    await auth.signOut();
                }
                currentUser = null;
                userData = null;
                showMessageModal("Failed to load user data. Please try signing in again.", 'error');
                navigateTo('auth');
            }
        } else {
            // User is logged out
            currentUser = null;
            userData = null;
            // Ensure theme is reset if no user is logged in
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light-theme');
            updateBodyBackground(userData); // Reset to default background (light theme default)
            updateNavigationState(currentUser, userData); // Update navigation to logged out state
            updatePageRendererState(currentUser, userData); // Update page renderers to logged out state
            updateModalState(currentUser, userData); // Update modals to logged out state

            // Only redirect if current page is not home, about, team, partners, or partner-tos (public pages)
            if (!['home', 'about', 'team', 'partners', 'partner-tos', 'videos', 'simple-game', 'submit-code', 'approved-code'].includes(contentArea.dataset.currentPage)) {
                 navigateTo('home'); // Redirect to home if logged out from a protected page
            }
        }
        hideLoadingSpinner();
    });

    // Initial navigation call if no page is set (first load)
    if (!contentArea.dataset.currentPage) {
        navigateTo('home');
    }
});
