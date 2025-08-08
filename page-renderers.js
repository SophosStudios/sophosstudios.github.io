// src/page-renderers.js
// Contains functions for rendering the main content of each page.

import {
    authenticateUser, sendPasswordReset, fetchCurrentUserFirestoreData,
    updateProfileData, fetchAllUsersFirestore,
    createPostFirestore, updatePostFirestore, deletePostFirestore,
    addReactionToPost, addCommentToPost, fetchAllPostsFirestore,
    sendEmailToUserFirestore, fetchPartnerTOSFirestore,
    fetchPartnerApplicationQuestionsFirestore, submitPartnerApplicationFirestore,
    fetchAllPartnerApplicationsFirestore, updatePartnerApplicationStatusFirestore,
    fetchVideosFirestore, addVideoFirestore, updateVideoFirestore, deleteVideoFirestore
} from './firebase-service.js';
import { showMessageModal, showLoadingSpinner, hideLoadingSpinner, applyThemeClasses, updateBodyBackground, extractYouTubeVideoId, getRoleVFX } from './utils.js';
import {
    showCreatePostModal, showTakeActionModal, showEditUserInfoModal,
    showEditPartnerCardModal, showReviewApplicationModal, showEditQuestionModal,
    showAddEditVideoModal, showEditPartnerTOSModal
} from './modals.js';

// Global state and functions passed from App.js
let _currentUser = null;
let _userData = null;
let _navigateTo = null;
let _CONFIG = null;
let _usersList = []; // Cache for users list in admin panel
let _partnerApplicationsList = []; // Cache for partner applications list
let _currentPartnerQuestions = []; // Cache for partner application questions
let _videosList = []; // Cache for videos list

/**
 * Initializes the page renderers with necessary global state and functions.
 * @param {object} currentUser - The current Firebase Auth user object.
 * @param {object} userData - The current Firestore user data.
 * @param {function} navigateTo - The navigation function.
 * @param {object} config - The global CONFIG object.
 */
export function initializePageRenderers(currentUser, userData, navigateTo, config) {
    _currentUser = currentUser;
    _userData = userData;
    _navigateTo = navigateTo;
    _CONFIG = config;
}

/**
 * Renders the Home page content.
 * @param {HTMLElement} contentArea - The main content area DOM element.
 * @param {object} currentUser - The current user object.
 * @param {object} userData - The current user's data from Firestore.
 * @param {function} navigateTo - The navigation function.
 */
export function renderHomePage(contentArea, currentUser, userData, navigateTo) {
    contentArea.innerHTML = `
        <div class="p-6 md:p-12 text-center bg-gray-900 rounded-lg shadow-lg">
            <h1 class="text-4xl md:text-6xl font-bold text-white mb-4">Welcome to SophosWRLD</h1>
            <p class="text-lg md:text-xl text-gray-300 mb-8">
                Your community for all things Sophos Studios. Connect with other members,
                share your thoughts on the forum, and stay up-to-date with the latest news.
            </p>
            ${currentUser ? `
                <div class="space-x-4">
                    <button onclick="navigateTo('forum')" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full transition duration-300 transform hover:scale-105">
                        Go to Forum
                    </button>
                    <button onclick="navigateTo('settings')" class="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-full transition duration-300 transform hover:scale-105">
                        Settings
                    </button>
                </div>
            ` : `
                <div class="space-x-4">
                    <button onclick="navigateTo('auth')" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full transition duration-300 transform hover:scale-105">
                        Sign In / Register
                    </button>
                </div>
            `}
        </div>
    `;
    // Attach event listeners for the dynamic buttons
    contentArea.querySelector('.bg-blue-600')?.addEventListener('click', () => navigateTo('forum'));
    contentArea.querySelector('.bg-gray-700')?.addEventListener('click', () => navigateTo('settings'));
}

/**
 * Renders the Admin page.
 * @param {HTMLElement} contentArea - The main content area DOM element.
 * @param {Array<object>} usersList - List of all users.
 * @param {object} currentUser - The current authenticated user.
 * @param {function} updateUserRoleFirestore - Function to update user roles.
 */
export function renderAdminPage(contentArea, usersList, currentUser, updateUserRoleFirestore) {
    // Admin page rendering logic...
}

/**
 * Renders the Authentication page.
 * @param {HTMLElement} contentArea - The main content area DOM element.
 * @param {function} handleEmailPasswordSignIn - Sign-in handler.
 * @param {function} handleEmailPasswordSignUp - Sign-up handler.
 * @param {function} handleGoogleSignIn - Google sign-in handler.
 */
export function renderAuthPage(contentArea, handleEmailPasswordSignIn, handleEmailPasswordSignUp, handleGoogleSignIn) {
    // Auth page rendering logic...
}

/**
 * Renders the Direct Messages page.
 * @param {HTMLElement} contentArea - The main content area DOM element.
 * @param {Array<object>} usersList - List of all users.
 * @param {object} currentUser - The current authenticated user.
 * @param {function} sendDirectMessage - Function to send a message.
 * @param {function} getDirectMessages - Function to get messages.
 * @param {function} updateDirectMessageSeenStatus - Function to update seen status.
 */
export function renderDMsPage(contentArea, usersList, currentUser, sendDirectMessage, getDirectMessages, updateDirectMessageSeenStatus) {
    // DMs page rendering logic...
}

/**
 * Renders the Settings page.
 * @param {HTMLElement} contentArea - The main content area DOM element.
 * @param {object} currentUser - The current authenticated user.
 * @param {object} userData - The current user's data from Firestore.
 * @param {function} navigateTo - The navigation function.
 */
export function renderSettingsPage(contentArea, currentUser, userData, navigateTo) {
    // Settings page rendering logic...
}

/**
 * Renders the Forum page.
 * @param {HTMLElement} contentArea - The main content area DOM element.
 * @param {object} currentUser - The current authenticated user.
 * @param {object} userData - The current user's data from Firestore.
 * @param {object} firebaseService - The firebase service object.
 */
export function renderForumPage(contentArea, currentUser, userData, firebaseService) {
    contentArea.innerHTML = `
        <div class="p-6 md:p-12 text-center bg-gray-900 rounded-lg shadow-lg">
            <h1 class="text-4xl md:text-6xl font-bold text-white mb-4">SophosWRLD Forum</h1>
            <p class="text-lg md:text-xl text-gray-300">
                Welcome to the forum! This is where the community connects.
                This is a placeholder for the forum content.
            </p>
        </div>
    `;
    // Add event listeners or other forum-specific logic here later.
}
