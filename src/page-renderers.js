// src/page-renderers.js
// Contains functions for rendering the main content of each page.

import {
    authenticateUser, sendPasswordReset,
    updateProfileData, fetchAllUsersFirestore,
    createPostFirestore, updatePostFirestore, deletePostFirestore,
    addReactionToPost, addCommentToPost, fetchAllPostsFirestore,
    sendEmailToUserFirestore, fetchPartnerTOSFirestore,
    fetchPartnerApplicationQuestionsFirestore, submitPartnerApplicationFirestore,
    fetchAllPartnerApplicationsFirestore,
    fetchVideosFirestore, addVideoFirestore, updateVideoFirestore, deleteVideoFirestore,
    fetchAllCodeSubmissions, fetchAllApprovedCodeSnippets
} from './firebase-service.js';
import { showMessageModal, showLoadingSpinner, hideLoadingSpinner, updateBodyBackground, extractYouTubeVideoId, getRoleVFX } from './utils.js';
import {
    showCreatePostModal, showTakeActionModal,
    showEditPartnerCardModal, showReviewApplicationModal, showEditQuestionModal,
    showAddEditVideoModal, showEditPartnerTOSModal,
    showSubmitCodeModal, showReviewCodeSubmissionModal
} from './modals.js';

// Global state and functions passed from App.js
let _currentUser = null;
let _userData = null;
let _navigateTo = null;
let _CONFIG = null;

// Cached data for pages to avoid redundant Firestore reads
let _usersList = [];
let _partnerApplicationsList = [];
let _currentPartnerQuestions = [];
let _videosList = [];
let _codeSubmissionsList = []; // For admin review
let _approvedCodeSnippets = []; // For approved code page

// Game variables for the Simple Game
let gameCanvas = null;
let gameCtx = null;
let gameInterval = null;
let score = 0;
let timeLeft = 30; // seconds
let target = { x: 0, y: 0, radius: 20 };
let gameRunning = false;
let gameTimerInterval = null;

/**
 * Initializes the page renderers module with necessary global state and functions.
 * This should be called once from App.js.
 * @param {object} currentUser - The current Firebase Auth user object.
 * @param {object} userData - The current Firestore user data.
 * @param {function} navigateTo - The main navigation function from App.js.
 * @param {object} CONFIG - The application's configuration object.
 */
export function initializePageRenderers(currentUser, userData, navigateTo, CONFIG) {
    _currentUser = currentUser;
    _userData = userData;
    _navigateTo = navigateTo;
    _CONFIG = CONFIG;
}

/**
 * Updates the global state references in the page renderers module.
 * Call this whenever currentUser or userData changes in App.js.
 * @param {object} currentUser - The current Firebase Auth user object.
 * @param {object} userData - The current Firestore user data.
 */
export function updatePageRendererState(currentUser, userData) {
    _currentUser = currentUser;
    _userData = userData;
}

/**
 * Renders the Home page content.
 */
export function renderHomePage() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl mx-auto text-center backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
            <h1 class="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-green-600 mb-6">
                Welcome to ${_CONFIG.websiteTitle}!
            </h1>
            ${_currentUser && _userData ? `
                <p class="text-xl text-gray-700 dark:text-gray-300 mb-4">
                    Hello, <span class="font-semibold text-blue-600">${_userData.username || _currentUser.email}</span>!
                    You are logged in as a ${getRoleVFX(_userData.role)}.
                </p>
                <p class="text-lg text-gray-600 dark:text-gray-400 mb-6">
                    Explore your profile settings, check out the forum, or visit the admin panel if you have the permissions.
                </p>
                <div class="flex flex-col sm:flex-row justify-center gap-4">
                    <button id="go-to-profile-btn" class="py-3 px-6 rounded-full bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                        Go to Profile
                    </button>
                    <button id="go-to-forum-btn" class="py-3 px-6 rounded-full bg-purple-600 text-white font-bold text-lg hover:bg-purple-700 transition duration-300 transform hover:scale-105 shadow-lg">
                        Visit Forum
                    </button>
                    ${_userData.role === 'admin' || _userData.role === 'founder' || _userData.role === 'co-founder' ? `
                    <button id="go-to-admin-btn" class="py-3 px-6 rounded-full bg-red-600 text-white font-bold text-lg hover:bg-red-700 transition duration-300 transform hover:scale-105 shadow-lg">
                        Admin Panel
                    </button>` : ''}
                </div>
            ` : `
                <p class="text-lg text-gray-700 dark:text-gray-300 mb-6">
                    Sign in or create an account to unlock full features and personalize your experience.
                </p>
                <button id="go-to-auth-btn" class="py-3 px-8 rounded-full bg-green-600 text-white font-bold text-lg hover:bg-green-700 transition duration-300 transform hover:scale-105 shadow-lg">
                    Sign In / Sign Up
                </button>
            `}
        </div>
    `;

    if (_currentUser && _userData) {
        document.getElementById('go-to-profile-btn').addEventListener('click', () => _navigateTo('profile'));
        document.getElementById('go-to-forum-btn').addEventListener('click', () => _navigateTo('forum'));
        if (_userData.role === 'admin' || _userData.role === 'founder' || _userData.role === 'co-founder') {
            document.getElementById('go-to-admin-btn').addEventListener('click', () => _navigateTo('admin'));
        }
    } else {
        document.getElementById('go-to-auth-btn').addEventListener('click', () => _navigateTo('auth'));
    }
}

/**
 * Renders the Auth (Sign In / Sign Up) page.
 */
export function renderAuthPage() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="flex flex-col items-center justify-center p-4">
            <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md md:max-w-lg mx-auto backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                <h2 id="auth-title" class="text-3xl font-extrabold text-center text-gray-800 dark:text-gray-100 mb-8">Sign In</h2>
                <form id="auth-form" class="space-y-6">
                    <div>
                        <label for="email" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Email</label>
                        <input type="email" id="email" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="your@example.com" required>
                    </div>
                    <div id="username-field" class="hidden">
                        <label for="username" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Username</label>
                        <input type="text" id="username" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="Choose a username">
                    </div>
                    <div>
                        <label for="password" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Password</label>
                        <input type="password" id="password" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="Minimum 6 characters" required>
                    </div>
                    <button type="submit" id="auth-submit-btn" class="w-full py-3 rounded-full bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                        Sign In
                    </button>
                </form>
                <div class="mt-6 text-center">
                    <button id="toggle-auth-mode" class="text-blue-600 hover:underline text-sm font-medium">
                        Need an account? Sign Up
                    </button>
                    <button id="forgot-password-btn" class="block mt-2 text-blue-600 hover:underline text-sm font-medium mx-auto">
                        Forgot Password?
                    </button>
                </div>
                <div class="mt-6">
                    <button id="google-auth-btn" class="w-full py-3 rounded-full bg-red-500 text-white font-bold text-lg hover:bg-red-600 transition duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2">
                        <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12.24 10.26v3.29h6.14c-.26 1.63-1.4 3.01-3.23 3.91l-.01.01-2.58 2.02c-1.52 1.19-3.4 1.83-5.32 1.83-4.8 0-8.72-3.86-8.72-8.62s3.92-8.62 8.72-8.62c2.81 0 4.67 1.19 5.86 2.36L18.42 5c-.71-.69-2.09-1.83-5.46-1.83-3.69 0-6.73 2.97-6.73 6.64s3.04 6.64 6.73 6.64c2.86 0 4.69-1.22 5.56-2.26l.01-.01-4.73-3.71z" fill="#FFFFFF"></path>
                        </svg>
                        <span>Sign in with Google</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    const authForm = document.getElementById('auth-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const usernameField = document.getElementById('username-field');
    const usernameInput = document.getElementById('username');
    const authTitle = document.getElementById('auth-title');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const toggleAuthModeBtn = document.getElementById('toggle-auth-mode');
    const forgotPasswordBtn = document.getElementById('forgot-password-btn');
    const googleAuthBtn = document.getElementById('google-auth-btn');

    let isSignUpMode = false;

    toggleAuthModeBtn.addEventListener('click', () => {
        isSignUpMode = !isSignUpMode;
        authTitle.textContent = isSignUpMode ? 'Create Account' : 'Sign In';
        authSubmitBtn.textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
        toggleAuthModeBtn.textContent = isSignUpMode ? 'Already have an account? Sign In' : 'Need an account? Sign Up';
        usernameField.classList.toggle('hidden', !isSignUpMode);
        usernameInput.required = isSignUpMode;
        forgotPasswordBtn.classList.toggle('hidden', isSignUpMode);
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value;
        const password = passwordInput.value;
        const username = usernameInput.value;

        try {
            await authenticateUser(isSignUpMode ? 'signup' : 'login', { email, password, username });
            if (isSignUpMode) {
                showMessageModal('Account created successfully! You are now signed in.');
            } else {
                showMessageModal('Signed in successfully!');
            }
            // onAuthStateChanged listener in App.js will handle redirection
        } catch (error) {
            showMessageModal(error.message, 'error');
        }
    });

    forgotPasswordBtn.addEventListener('click', async () => {
        const email = emailInput.value;
        if (!email) {
            showMessageModal("Please enter your email to reset password.", 'info');
            return;
        }
        try {
            await sendPasswordReset(email);
            showMessageModal("Password reset email sent! Check your inbox.");
        } catch (error) {
            showMessageModal(error.message, 'error');
        }
    });

    googleAuthBtn.addEventListener('click', async () => {
        try {
            await authenticateUser('google');
            showMessageModal('Signed in with Google successfully!');
        } catch (error) {
            showMessageModal(error.message, 'error');
        }
    });
}

/**
 * Renders the Profile page.
 */
export function renderProfilePage() {
    const contentArea = document.getElementById('content-area');
    if (!_currentUser || !_userData) {
        _navigateTo('auth');
        return;
    }

    contentArea.innerHTML = `
        <div class="flex flex-col items-center justify-center p-4">
            <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md md:max-w-lg mx-auto backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                <h2 class="text-3xl font-extrabold text-center text-gray-800 dark:text-gray-100 mb-8">Your Profile</h2>

                <div class="flex flex-col items-center mb-6">
                    <img id="profile-pic-display" src="${_userData.profilePicUrl || `https://placehold.co/100x100/F0F0F0/000000?text=${(_userData.username || _currentUser.email || 'U').charAt(0).toUpperCase()}`}" alt="Profile" class="w-32 h-32 rounded-full object-cover border-4 border-blue-500 shadow-md">
                </div>

                <form id="profile-form" class="space-y-6">
                    <div>
                        <label for="profile-username" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Username</label>
                        <input type="text" id="profile-username" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" value="${_userData.username || ''}" required>
                    </div>
                    <div>
                        <label for="profile-email" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Email</label>
                        <input type="email" id="profile-email" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 dark:text-gray-100 cursor-not-allowed" value="${_currentUser.email}" disabled>
                    </div>
                    <button type="button" id="reset-password-btn" class="w-full py-3 rounded-full bg-yellow-600 text-white font-bold text-lg hover:bg-yellow-700 transition duration-300 transform hover:scale-105 shadow-lg">
                        Reset Password
                    </button>
                    <button type="submit" id="save-profile-btn" class="w-full py-3 rounded-full bg-green-600 text-white font-bold text-lg hover:bg-green-700 transition duration-300 transform hover:scale-105 shadow-lg">
                        Save Changes
                    </button>
                    <button type="button" id="go-to-settings-btn" class="w-full py-3 rounded-full bg-purple-600 text-white font-bold text-lg hover:bg-purple-700 transition duration-300 transform hover:scale-105 shadow-lg mt-4">
                        Go to Settings
                    </button>
                </form>
            </div>
        </div>
    `;

    const profileForm = document.getElementById('profile-form');
    const usernameInput = document.getElementById('profile-username');
    const resetPasswordBtn = document.getElementById('reset-password-btn');
    const goToSettingsBtn = document.getElementById('go-to-settings-btn');


    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newUsername = usernameInput.value;

        try {
            await updateProfileData(_currentUser.uid, {
                username: newUsername
            });
            // Re-fetch user data to ensure _userData is updated globally
            _userData = await fetchCurrentUserFirestoreData(_currentUser);
            showMessageModal('Username updated successfully!');
            _navigateTo('profile'); // Re-render profile to update any dependent UI (e.g., if profile pic changes based on username)
        } catch (error) {
            showMessageModal(error.message, 'error');
        }
    });

    resetPasswordBtn.addEventListener('click', async () => {
        showMessageModal('Are you sure you want to send a password reset email to your registered email address?', 'confirm', async () => {
            try {
                await sendPasswordReset(_currentUser.email);
                showMessageModal("Password reset email sent! Check your inbox.");
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
        });
    });

    goToSettingsBtn.addEventListener('click', () => _navigateTo('settings'));
}

/**
 * Renders the new Settings page.
 */
export function renderSettingsPage() {
    const contentArea = document.getElementById('content-area');
    if (!_currentUser || !_userData) {
        _navigateTo('auth');
        return;
    }

    const backgroundOptions = [
        { name: 'Blue-Purple Gradient (Default)', class: 'bg-gradient-to-r from-blue-400 to-purple-600' },
        { name: 'Green-Cyan Gradient', class: 'bg-gradient-to-r from-green-400 to-cyan-600' },
        { name: 'Red-Black Gradient', class: 'bg-gradient-to-r from-red-800 to-black' },
        { name: 'Orange-Red Gradient', class: 'bg-gradient-to-r from-orange-600 to-red-600' },
    ];

    const isPartnerOrAdmin = _userData.role === 'partner' || _userData.role === 'admin' || _userData.role === 'founder' || _userData.role === 'co-founder';
    const partnerLinks = _userData.partnerInfo?.links || {};

    contentArea.innerHTML = `
        <div class="flex flex-col items-center justify-center p-4">
            <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl mx-auto backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                <h2 class="text-3xl font-extrabold text-center text-gray-800 dark:text-gray-100 mb-8">Account Settings</h2>

                <form id="settings-form" class="space-y-8">
                    <!-- Profile Picture & Bio Section -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start border-b border-gray-200 dark:border-gray-700 pb-8">
                        <div class="flex flex-col items-center justify-center">
                            <img id="profile-pic-display" src="${_userData.profilePicUrl || `https://placehold.co/100x100/F0F0F0/000000?text=${(_userData.username || _currentUser.email || 'U').charAt(0).toUpperCase()}`}" alt="Profile" class="w-32 h-32 rounded-full object-cover border-4 border-blue-500 shadow-md mb-4">
                            <label for="profile-pic-url" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Profile Picture URL</label>
                            <input type="url" id="profile-pic-url" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="e.g., https://example.com/your-image.jpg" value="${_userData.profilePicUrl || ''}">
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">Provide a direct image URL.</p>
                        </div>
                        <div>
                            <label for="profile-bio" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Your Bio</label>
                            <textarea id="profile-bio" rows="6" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="Tell us about yourself...">${_userData.bio || ''}</textarea>
                        </div>
                    </div>

                    <!-- Theme & Background Section -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start border-b border-gray-200 dark:border-gray-700 pb-8 pt-8">
                        <div>
                            <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Display Options</h3>
                            <div class="flex items-center space-x-3 mb-4">
                                <label for="dark-mode-toggle" class="text-gray-700 dark:text-gray-300 text-md font-semibold">Dark Mode</label>
                                <label class="switch">
                                    <input type="checkbox" id="dark-mode-toggle" ${_userData.theme === 'dark' ? 'checked' : ''}>
                                    <span class="slider round"></span>
                                </label>
                            </div>

                            <label for="profile-background-select" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Website Background Theme</label>
                            <select id="profile-background-select" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-gray-50 dark:bg-gray-700 dark:text-gray-100">
                                ${backgroundOptions.map(option => `
                                    <option value="${option.class}" ${_userData.backgroundUrl === option.class ? 'selected' : ''}>
                                        ${option.name}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div>
                            <label for="custom-background-url" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Custom Background Image/GIF URL (Overrides Theme)</label>
                            <input type="url" id="custom-background-url" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="e.g., https://example.com/your-animated.gif" value="${(_userData.backgroundUrl && (_userData.backgroundUrl.startsWith('http') || _userData.backgroundUrl.startsWith('https'))) ? _userData.backgroundUrl : ''}">
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">For GIFs, choose a subtle or abstract one for a formal look. This will override the theme selection above.</p>
                        </div>
                    </div>

                    <!-- Partner Card Information Section -->
                    ${isPartnerOrAdmin ? `
                        <div class="border-b border-gray-200 dark:border-gray-700 pb-8 pt-8">
                            <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Partner Card Information</h3>
                            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">This information will be displayed on your public partner card.</p>

                            <div class="mb-4">
                                <label for="partner-description" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Partner Description</label>
                                <textarea id="partner-description" rows="4" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="A short description for your partner card...">${_userData.partnerInfo?.description || ''}</textarea>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <h4 class="col-span-full text-lg font-semibold text-gray-800 dark:text-gray-100 mt-4">Partner Links</h4>
                                ${['discord', 'roblox', 'fivem', 'codingCommunity', 'minecraft', 'website'].map(platform => `
                                    <div>
                                        <label for="partner-link-${platform}" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2 capitalize">${platform.replace(/([A-Z])/g, ' $1').trim()} Link</label>
                                        <input type="url" id="partner-link-${platform}" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="Enter URL for ${platform} profile/community" value="${partnerLinks[platform] || ''}">
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <button type="submit" id="save-settings-btn" class="w-full py-3 rounded-full bg-green-600 text-white font-bold text-lg hover:bg-green-700 transition duration-300 transform hover:scale-105 shadow-lg mt-6">
                        Save All Settings
                    </button>
                </form>
            </div>
        </div>
    `;

    const settingsForm = document.getElementById('settings-form');
    const profilePicUrlInput = document.getElementById('profile-pic-url');
    const backgroundSelect = document.getElementById('profile-background-select');
    const customBackgroundUrlInput = document.getElementById('custom-background-url');
    const profileBioInput = document.getElementById('profile-bio');
    const profilePicDisplay = document.getElementById('profile-pic-display');
    const darkModeToggle = document.getElementById('dark-mode-toggle');

    const partnerDescriptionInput = document.getElementById('partner-description');
    const partnerLinkInputs = {};
    ['discord', 'roblox', 'fivem', 'codingCommunity', 'minecraft', 'website'].forEach(platform => {
        partnerLinkInputs[platform] = document.getElementById(`partner-link-${platform}`);
    });

    profilePicUrlInput.addEventListener('input', () => {
      profilePicDisplay.src = profilePicUrlInput.value || `https://placehold.co/100x100/F0F0F0/000000?text=${(_userData.username || _currentUser.email || 'U').charAt(0).toUpperCase()}`;
    });
    profilePicDisplay.onerror = () => {
        profilePicDisplay.src = `https://placehold.co/100x100/F0F0F0/000000?text=${(_userData.username || _currentUser.email || 'U').charAt(0).toUpperCase()}`;
    };

    darkModeToggle.addEventListener('change', async () => {
        const newTheme = darkModeToggle.checked ? 'dark' : 'light';
        try {
            await updateProfileData(_currentUser.uid, { theme: newTheme });
            _userData = await fetchCurrentUserFirestoreData(_currentUser); // Re-fetch to update global state
            updateBodyBackground(_userData);
            showMessageModal(`Theme changed to ${newTheme} mode!`);
        } catch (error) {
            showMessageModal(error.message, 'error');
            darkModeToggle.checked = (_userData.theme === 'dark'); // Revert checkbox on error
        }
    });

    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newProfilePicUrl = profilePicUrlInput.value || `https://placehold.co/100x100/F0F0F0/000000?text=${(_userData.username || _currentUser.email || 'U').charAt(0).toUpperCase()}`;
        const newBio = profileBioInput.value;

        let newBackgroundUrl;
        if (customBackgroundUrlInput.value) {
            newBackgroundUrl = customBackgroundUrlInput.value;
        } else {
            newBackgroundUrl = backgroundSelect.value;
        }

        const updatedPartnerInfo = {
            description: partnerDescriptionInput ? partnerDescriptionInput.value : (_userData.partnerInfo?.description || ''),
            links: {}
        };

        if (isPartnerOrAdmin) {
            ['discord', 'roblox', 'fivem', 'codingCommunity', 'minecraft', 'website'].forEach(platform => {
                if (partnerLinkInputs[platform]) {
                    updatedPartnerInfo.links[platform] = partnerLinkInputs[platform].value;
                }
            });
        } else {
            updatedPartnerInfo.description = _userData.partnerInfo?.description || '';
            updatedPartnerInfo.links = _userData.partnerInfo?.links || {};
        }

        try {
            await updateProfileData(_currentUser.uid, {
                profilePicUrl: newProfilePicUrl,
                backgroundUrl: newBackgroundUrl,
                bio: newBio,
                partnerInfo: updatedPartnerInfo
            });
            _userData = await fetchCurrentUserFirestoreData(_currentUser); // Re-fetch to update global state
            updateBodyBackground(_userData);
            showMessageModal('Settings updated successfully!');
        } catch (error) {
            showMessageModal(error.message, 'error');
        }
    });
}

/**
 * Renders the About page content.
 */
export function renderAboutPage() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="flex flex-col items-center justify-center p-4">
            <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl mx-auto text-center backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                <h2 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600 mb-6">About ${_CONFIG.websiteTitle}</h2>
                <p class="text-lg text-gray-700 dark:text-gray-300 mb-4">
                    Welcome to a secure and user-friendly platform designed to streamline your online experience. We offer robust user authentication, allowing you to sign up and sign in with ease, keeping your data safe.
                </p>
                <p class="text-lg text-gray-700 dark:text-gray-300 mb-4">
                    Our platform is built with a focus on personalization. You can update your profile information, choose a custom background theme, and manage your personal details within a dedicated settings section.
                </p>
                <p class="text-lg text-gray-700 dark:text-gray-300 mb-4">
                    For administrators, we provide a powerful admin panel. This feature allows designated users to oversee all registered accounts, view user details, and manage roles (assigning 'admin' or 'member' status) to ensure smooth operation and access control. Admins can also create and manage forum posts.
                </p>
                <p class="text-lg text-gray-700 dark:text-gray-300 mb-4">
                    Members can engage with forum posts by adding reactions and comments, fostering a dynamic community environment.
                </p>
                <p class="text-lg text-gray-700 dark:text-gray-300 mb-4">
                    We prioritize responsive design, ensuring that our website looks great and functions perfectly on any device, from desktops to mobile phones. Our clean, modern interface is powered by efficient technologies to provide a seamless browsing experience.
                </p>
                <p class="text-lg text-gray-700 dark:text-gray-300">
                    Thank you for choosing our platform. We're committed to providing a reliable and enjoyable service.
                </p>
            </div>
        </div>
    `;
}

/**
 * Renders the Admin Panel page.
 */
export async function renderAdminPanelPage() {
    const contentArea = document.getElementById('content-area');
    if (!_currentUser || (_userData.role !== 'admin' && _userData.role !== 'founder' && _userData.role !== 'co-founder')) {
        contentArea.innerHTML = `
            <div class="flex flex-col items-center justify-center p-4">
                <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md md:max-w-lg mx-auto text-center backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                    <h2 class="text-3xl font-extrabold text-red-600 mb-4">Access Denied</h2>
                    <p class="text-lg text-gray-700 dark:text-gray-300">You do not have administrative privileges to access this page.</p>
                </div>
            </div>
        `;
        return;
    }

    try {
        _usersList = await fetchAllUsersFirestore();
    } catch (error) {
        showMessageModal(error.message, 'error');
        _usersList = [];
    }


    contentArea.innerHTML = `
        <div class="flex flex-col items-center justify-center p-4 min-h-[calc(100vh-64px)]">
            <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-full lg:max-w-4xl mx-auto backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                <h2 class="text-3xl font-extrabold text-center text-gray-800 dark:text-gray-100 mb-8">Admin Panel</h2>
                <p class="text-lg text-gray-700 dark:text-gray-300 text-center mb-6">Manage user roles and accounts, and create forum posts.</p>
                <div class="mb-6 text-center space-x-4 flex flex-wrap justify-center gap-2">
                    <button id="view-forum-admin-btn" class="py-2 px-6 rounded-full bg-purple-600 text-white font-bold text-lg hover:bg-purple-700 transition duration-300 transform hover:scale-105 shadow-lg">
                        Manage Posts (Forum)
                    </button>
                    <button id="view-partner-applications-btn" class="py-2 px-6 rounded-full bg-indigo-600 text-white font-bold text-lg hover:bg-indigo-700 transition duration-300 transform hover:scale-105 shadow-lg">
                        View Partner Applications
                    </button>
                    ${_userData.role === 'founder' || _userData.role === 'co-founder' ? `
                        <button id="manage-partner-questions-btn" class="py-2 px-6 rounded-full bg-teal-600 text-white font-bold text-lg hover:bg-teal-700 transition duration-300 transform hover:scale-105 shadow-lg">
                            Manage Partner Questions
                        </button>
                    ` : ''}
                    <button id="manage-videos-admin-btn" class="py-2 px-6 rounded-full bg-orange-600 text-white font-bold text-lg hover:bg-orange-700 transition duration-300 transform hover:scale-105 shadow-lg">
                        Manage Videos
                    </button>
                    <button id="review-code-submissions-btn" class="py-2 px-6 rounded-full bg-red-500 text-white font-bold text-lg hover:bg-red-600 transition duration-300 transform hover:scale-105 shadow-lg">
                        Review Code Submissions
                    </button>
                </div>

                <h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 text-center">Manage Users</h3>
                ${_usersList.length === 0 ? `
                    <p class="text-center text-gray-600 dark:text-gray-400">No users found.</p>
                ` : `
                    <div class="overflow-x-auto rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead class="bg-gray-100 dark:bg-gray-700">
                                <tr>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Icon
                                    </th>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Username
                                    </th>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Email
                                    </th>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Role
                                    </th>
                                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700" id="users-table-body">
                                <!-- Users will be populated here by JS -->
                            </tbody>
                        </table>
                    </div>
                `}
            </div>
        </div>
    `;

    if (_usersList.length > 0) {
        const usersTableBody = document.getElementById('users-table-body');
        usersTableBody.innerHTML = _usersList.map(user => {
            const profileIconSrc = user.profilePicUrl || `https://placehold.co/100x100/F0F0F0/000000?text=${(user.username || user.email || 'U').charAt(0).toUpperCase()}`;
            const isDisabled = user.id === _currentUser.uid ? 'disabled' : '';
            const canAssignFounderOrCoFounder = _userData.role === 'founder' || _userData.role === 'co-founder';
            const showFounderOption = canAssignFounderOrCoFounder || user.role === 'founder';
            const showCoFounderOption = canAssignFounderOrCoFounder || user.role === 'co-founder';


            return `
                <tr data-user-id="${user.id}" class="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <img src="${profileIconSrc}" alt="User Icon" class="w-10 h-10 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600" onerror="this.onerror=null; this.src='https://placehold.co/100x100/F0F0F0/000000?text=${(user.username || user.email || 'U').charAt(0).toUpperCase()}'">
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100 font-medium">
                        ${user.username}
                        ${user.isBanned ? '<span class="ml-2 text-red-500 text-xs">(Banned)</span>' : ''}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-300 text-sm">
                        ${user.email}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <select class="role-select bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 ${isDisabled}" ${isDisabled}>
                            <option value="member" ${user.role === 'member' ? 'selected' : ''}>Member</option>
                            <option value="partner" ${user.role === 'partner' ? 'selected' : ''}>Partner</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                            ${showCoFounderOption ? `<option value="co-founder" ${user.role === 'co-founder' ? 'selected' : ''}>Co-Founder</option>` : ''}
                            ${showFounderOption ? `<option value="founder" ${user.role === 'founder' ? 'selected' : ''}>Founder</option>` : ''}
                        </select>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button class="take-action-btn bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 transform hover:scale-105 shadow-md ${isDisabled}" ${isDisabled}>
                            Take Action
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        usersTableBody.querySelectorAll('.role-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const userId = e.target.closest('tr').dataset.userId;
                const newRole = e.target.value;
                try {
                    const success = await updateUserRoleFirestore(userId, newRole, _userData);
                    if (success) {
                        showMessageModal(`User role updated to ${newRole}!`);
                        renderAdminPanelPage(); // Re-render to update UI
                    } else {
                        // If operation failed (e.g., due to self-demotion block), revert select
                        e.target.value = _usersList.find(u => u.id === userId).role;
                    }
                } catch (error) {
                    showMessageModal(error.message, 'error');
                    // Revert select on error
                    e.target.value = _usersList.find(u => u.id === userId).role;
                }
            });
        });

        usersTableBody.querySelectorAll('.take-action-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const userId = e.target.closest('tr').dataset.userId;
                const user = _usersList.find(u => u.id === userId);
                if (user) {
                    showTakeActionModal(user);
                }
            });
        });
    }

    document.getElementById('view-forum-admin-btn').addEventListener('click', () => _navigateTo('forum'));
    document.getElementById('view-partner-applications-btn').addEventListener('click', () => _navigateTo('partner-applications'));
    if (_userData.role === 'founder' || _userData.role === 'co-founder') {
        document.getElementById('manage-partner-questions-btn').addEventListener('click', () => _navigateTo('manage-partner-questions'));
    }
    document.getElementById('manage-videos-admin-btn').addEventListener('click', () => _navigateTo('manage-videos'));
    document.getElementById('review-code-submissions-btn').addEventListener('click', () => _navigateTo('review-code-submissions'));
}

/**
 * Renders the Forum page.
 */
export async function renderForumPage() {
    const contentArea = document.getElementById('content-area');
    if (!_currentUser) {
        contentArea.innerHTML = `
            <div class="flex flex-col items-center justify-center p-4">
                <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md md:max-w-lg mx-auto text-center backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                    <h2 class="text-3xl font-extrabold text-red-600 mb-4">Access Denied</h2>
                    <p class="text-lg text-gray-700 dark:text-gray-300">You must be logged in to view the forum.</p>
                    <button id="go-to-auth-from-forum-btn" class="mt-6 py-3 px-8 rounded-full bg-green-600 text-white font-bold text-lg hover:bg-green-700 transition duration-300 transform hover:scale-105 shadow-lg">
                        Sign In / Sign Up
                    </button>
                </div>
            </div>
        `;
        document.getElementById('go-to-auth-from-forum-btn').addEventListener('click', () => _navigateTo('auth'));
        return;
    }

    let posts = [];
    try {
        posts = await fetchAllPostsFirestore();
    } catch (error) {
        showMessageModal(error.message, 'error');
        posts = [];
    }

    const canCreatePost = _userData.role === 'admin' || _userData.role === 'founder' || _userData.role === 'co-founder';

    contentArea.innerHTML = `
        <div class="flex flex-col items-center justify-center p-4 min-h-[calc(100vh-64px)]">
            <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-full lg:max-w-4xl mx-auto backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                <h2 class="text-3xl font-extrabold text-center text-gray-800 dark:text-gray-100 mb-8">Community Forum</h2>
                ${canCreatePost ? `
                    <div class="text-center mb-6">
                        <button id="create-post-btn" class="py-3 px-8 rounded-full bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                            Create New Post
                        </button>
                    </div>
                ` : ''}

                <div id="posts-list" class="space-y-6">
                    ${posts.length === 0 ? `
                        <p class="text-center text-gray-600 dark:text-gray-400">No posts yet. Be the first to post!</p>
                    ` : posts.map(post => `
                        <div class="post-card bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
                            <h3 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">${post.title}</h3>
                            <p class="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-wrap">${post.content}</p>
                            <div class="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4 border-t border-b border-gray-200 dark:border-gray-600 py-2">
                                <span>Posted by <span class="font-semibold">${post.authorUsername}</span> on ${post.timestamp}</span>
                                ${canCreatePost ? `
                                    <div class="space-x-2">
                                        <button class="edit-post-btn text-blue-500 hover:text-blue-700 font-semibold" data-post-id="${post.id}">
                                            Edit
                                        </button>
                                        <button class="delete-post-btn text-red-500 hover:text-red-700 font-semibold" data-post-id="${post.id}">
                                            Delete
                                        </button>
                                    </div>
                                ` : ''}
                            </div>

                            <!-- Reactions Section -->
                            <div class="flex items-center space-x-4 mb-4">
                                <span class="text-gray-700 dark:text-gray-300 font-semibold">Reactions:</span>
                                ${Object.entries(post.reactions).map(([emoji, count]) => `
                                    <span class="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2.5 py-0.5 rounded-full">
                                        ${emoji} ${count}
                                    </span>
                                `).join('')}
                                <div class="relative inline-block text-left">
                                    <button class="add-reaction-btn text-gray-600 dark:text-gray-300 hover:text-blue-600 transition duration-200" data-post-id="${post.id}">
                                        <i class="fas fa-smile"></i> Add Reaction
                                    </button>
                                    <div class="reaction-picker hidden absolute z-10 bg-white dark:bg-gray-700 rounded-md shadow-lg p-2 mt-1 border border-gray-200 dark:border-gray-600">
                                        <button class="emoji-btn hover:bg-gray-100 dark:hover:bg-gray-600 p-1 rounded-md" data-emoji="👍">👍</button>
                                        <button class="emoji-btn hover:bg-gray-100 dark:hover:bg-gray-600 p-1 rounded-md" data-emoji="❤️">❤️</button>
                                        <button class="emoji-btn hover:bg-gray-100 dark:hover:bg-gray-600 p-1 rounded-md" data-emoji="😂">😂</button>
                                        <button class="emoji-btn hover:bg-gray-100 dark:hover:bg-gray-600 p-1 rounded-md" data-emoji="🔥">🔥</button>
                                        <button class="emoji-btn hover:bg-gray-100 dark:hover:bg-gray-600 p-1 rounded-md" data-emoji="🤔">🤔</button>
                                    </div>
                                </div>
                            </div>

                            <!-- Comments Section -->
                            <div class="comments-section mt-4 border-t border-gray-200 dark:border-gray-600 pt-4">
                                <h4 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Comments (${post.comments.length})</h4>
                                <div class="space-y-3 mb-4">
                                    ${post.comments.length === 0 ? `
                                        <p class="text-sm text-gray-600 dark:text-gray-400">No comments yet.</p>
                                    ` : post.comments.map(comment => `
                                        <div class="bg-gray-100 dark:bg-gray-600 p-3 rounded-md">
                                            <p class="text-gray-800 dark:text-gray-200 text-sm">${comment.text}</p>
                                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                By <span class="font-medium">${comment.authorUsername}</span> on ${new Date(comment.timestamp).toLocaleString()}
                                            </p>
                                        </div>
                                    `).join('')}
                                </div>
                                <div class="flex items-center space-x-2">
                                    <input type="text" class="comment-input w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100" placeholder="Add a comment..." data-post-id="${post.id}">
                                    <button class="submit-comment-btn bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 transform hover:scale-105 shadow-md" data-post-id="${post.id}">
                                        Post
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;

    if (canCreatePost) {
        document.getElementById('create-post-btn').addEventListener('click', () => showCreatePostModal());

        document.querySelectorAll('.edit-post-btn').forEach(button