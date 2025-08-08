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
import { getFirestore, collection, query, onSnapshot, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

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
 * Renders the Forum page with real-time posts.
 * @param {HTMLElement} contentArea - The main content area DOM element.
 * @param {object} currentUser - The current authenticated user.
 * @param {object} userData - The current user's data from Firestore.
 * @param {object} firebaseService - Object containing the db and auth instances.
 */
export function renderForumPage(contentArea, currentUser, userData, firebaseService) {
    contentArea.innerHTML = `
        <div class="p-4 md:p-8 w-full max-w-4xl mx-auto">
            <div class="flex justify-between items-center mb-6">
                <h1 class="text-3xl md:text-4xl font-bold text-white">Forum</h1>
                ${currentUser ? `
                    <button id="create-post-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 transform hover:scale-105">
                        <i class="fas fa-plus mr-2"></i>Create Post
                    </button>
                ` : ''}
            </div>
            <div id="posts-container" class="space-y-6">
                <!-- Posts will be rendered here dynamically -->
                <p class="text-center text-gray-500">Loading posts...</p>
            </div>
        </div>
    `;

    // Real-time listener for forum posts
    const db = firebaseService.db;
    const postsCollectionRef = collection(db, `/artifacts/sophoswrld/public/data/posts`);
    const q = query(postsCollectionRef, orderBy('timestamp', 'desc'));

    onSnapshot(q, (snapshot) => {
        const postsContainer = document.getElementById('posts-container');
        if (!postsContainer) return; // Exit if the container is not found

        const postsHtml = snapshot.docs.map(doc => {
            const post = doc.data();
            const postDate = post.timestamp ? post.timestamp.toDate().toLocaleString() : 'N/A';
            return `
                <div class="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
                    <div class="flex items-center mb-2">
                        <div class="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-lg font-bold text-white mr-3">
                            ${post.authorName ? post.authorName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                            <p class="text-white font-semibold">${post.authorName || 'Anonymous'}</p>
                            <p class="text-sm text-gray-400">${postDate}</p>
                        </div>
                    </div>
                    <h3 class="text-xl font-bold text-blue-400 mb-2">${post.title || 'No Title'}</h3>
                    <p class="text-gray-300">${post.content || 'No content.'}</p>
                </div>
            `;
        }).join('');

        postsContainer.innerHTML = postsHtml || '<p class="text-center text-gray-500">No posts yet. Be the first to create one!</p>';
    }, (error) => {
        console.error("Error fetching posts:", error);
        showMessageModal("Failed to load forum posts. Please try again later.", 'error');
    });

    // Event listener for the create post button
    const createPostBtn = document.getElementById('create-post-btn');
    if (createPostBtn) {
        createPostBtn.addEventListener('click', () => {
            // Placeholder for the modal to create a new post
            showMessageModal("Create Post functionality will be implemented here.", 'info');
        });
    }
}
