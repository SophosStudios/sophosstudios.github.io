// src/page-renderers.js
// Contains functions for rendering the main content of each page.

// Import necessary functions and utilities
import { showLoadingSpinner, hideLoadingSpinner, showMessageModal } from './utils.js';

// Global state variables for caching data
let _usersList = [];
let _partnerApplicationsList = [];
let _currentPartnerQuestions = [];
let _videosList = [];

/**
 * Renders the home page content.
 * @param {HTMLElement} container - The DOM element to render into.
 * @param {object} currentUser - The current authenticated user.
 * @param {object} userData - The current user's Firestore data.
 * @param {function} navigateTo - The navigation function.
 */
export function renderHomePage(container, currentUser, userData, navigateTo) {
    container.innerHTML = `
        <div class="flex flex-col items-center justify-center p-8">
            <h1 class="text-4xl md:text-6xl font-bold text-red-500 mb-4 animate-pulse">Welcome to SophosWRLD</h1>
            <p class="text-xl text-gray-400 text-center">Your personalized community hub.</p>
            <div class="mt-8">
                <button id="view-messages-btn" class="bg-red-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-red-700 transition-colors duration-300 shadow-lg">
                    <i class="fas fa-comments mr-2"></i>View Messages
                </button>
                <button id="open-settings-btn" class="bg-gray-700 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-600 transition-colors duration-300 ml-4 shadow-lg">
                    <i class="fas fa-cog mr-2"></i>Customize
                </button>
            </div>
        </div>
    `;
    document.getElementById('view-messages-btn').addEventListener('click', () => navigateTo('messages'));
    document.getElementById('open-settings-btn').addEventListener('click', () => navigateTo('settings'));
}

/**
 * Renders the admin panel page.
 * @param {HTMLElement} container - The DOM element to render into.
 * @param {object} currentUser - The current authenticated user.
 * @param {object} userData - The current user's Firestore data.
 * @param {function} showMessageModal - The modal display function.
 * @param {function} showLoadingSpinner - The spinner display function.
 * @param {function} hideLoadingSpinner - The spinner hide function.
 * @param {object} db - The Firestore db instance.
 * @param {string} appId - The app ID.
 */
export function renderAdminPage(container, currentUser, userData, showMessageModal, showLoadingSpinner, hideLoadingSpinner, db, appId) {
    if (!currentUser || userData?.role !== 'admin') {
        container.innerHTML = `<h1 class="text-3xl text-center text-red-500">Access Denied</h1>`;
        return;
    }

    container.innerHTML = `
        <div class="bg-gray-800 p-8 rounded-lg shadow-xl border-t-4 border-red-500 w-full max-w-4xl">
            <h2 class="text-3xl font-bold text-red-500 mb-6">Admin Dashboard</h2>
            <h3 class="text-xl font-semibold text-gray-200 mb-4">Manage Users</h3>
            <div id="user-list" class="space-y-4">
                <p class="text-gray-400 text-center">Loading users...</p>
            </div>
        </div>
    `;

    // Placeholder for the real-time user list listener
    console.log("Admin page rendered. User list listener would be set up here.");
}

/**
 * Renders the authentication page.
 * @param {HTMLElement} container - The DOM element to render into.
 * @param {object} auth - The Firebase auth instance.
 * @param {object} db - The Firestore db instance.
 * @param {string} appId - The app ID.
 * @param {function} showMessageModal - The modal display function.
 * @param {function} showLoadingSpinner - The spinner display function.
 * @param {function} hideLoadingSpinner - The spinner hide function.
 * @param {function} navigateTo - The navigation function.
 */
export function renderAuthPage(container, auth, db, appId, showMessageModal, showLoadingSpinner, hideLoadingSpinner, navigateTo) {
    container.innerHTML = `
        <div class="max-w-md mx-auto bg-gray-800 p-8 rounded-lg shadow-xl border-t-4 border-red-500">
            <h2 class="text-3xl font-bold text-center mb-6 text-red-500">Sign In / Sign Up</h2>
            <form id="auth-form" class="space-y-4">
                <input type="email" id="auth-email" placeholder="Email" class="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500" required>
                <input type="password" id="auth-password" placeholder="Password" class="w-full p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500" required>
                <div class="flex items-center justify-between">
                    <button type="submit" id="signin-btn" class="bg-red-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-red-700 transition-colors duration-300">Sign In</button>
                    <button type="button" id="signup-btn" class="bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors duration-300">Sign Up</button>
                </div>
            </form>
        </div>
    `;
}

/**
 * Renders the direct messages list.
 * @param {HTMLElement} container - The DOM element to render into.
 * @param {object} currentUser - The current authenticated user.
 * @param {object} db - The Firestore db instance.
 * @param {string} appId - The app ID.
 * @param {function} showMessageModal - The modal display function.
 * @param {function} showLoadingSpinner - The spinner display function.
 * @param {function} hideLoadingSpinner - The spinner hide function.
 */
export function renderDMsPage(container, currentUser, db, appId, showMessageModal, showLoadingSpinner, hideLoadingSpinner) {
    container.innerHTML = `
        <div class="bg-gray-800 p-8 rounded-lg shadow-xl border-t-4 border-red-500 w-full max-w-4xl">
            <h2 class="text-3xl font-bold text-red-500 mb-6">Direct Messages</h2>
            <div id="messages-list" class="space-y-4">
                <p class="text-gray-400 text-center">Loading users...</p>
            </div>
        </div>
    `;
    console.log("DMs page rendered. A listener for users and messages would be set up here.");
}
