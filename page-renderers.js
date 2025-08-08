// src/page-renderers.js
// Contains functions for rendering the main content of each page.

import {
    authenticateUser,
    sendPasswordReset,
    fetchCurrentUserFirestoreData,
    updateProfileData,
    fetchAllUsersFirestore,
    createPostFirestore,
    updatePostFirestore,
    deletePostFirestore,
    addReactionToPost,
    addCommentToPost,
    fetchAllPostsFirestore,
    sendEmailToUserFirestore,
    fetchPartnerTOSFirestore,
    fetchPartnerApplicationQuestionsFirestore,
    submitPartnerApplicationFirestore,
    fetchAllPartnerApplicationsFirestore,
    updatePartnerApplicationStatusFirestore,
    fetchVideosFirestore,
    addVideoFirestore,
    updateVideoFirestore,
    deleteVideoFirestore,
    fetchUserByUidFirestore
} from './firebase-service.js';
import { showMessageModal, showLoadingSpinner, hideLoadingSpinner, updateBodyBackground, getRoleVFX } from './utils.js';
import {
    showCreatePostModal,
    showTakeActionModal,
    showEditUserInfoModal,
    showReviewApplicationModal,
    showAddEditVideoModal,
    showEditPartnerTOSModal,
    showEditPartnerQuestionsModal
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
 * Initializes the page renderer module with necessary global state and functions.
 * @param {object} currentUser - The current Firebase Auth user object.
 * @param {object} userData - The current Firestore user data.
 * @param {function} navigateTo - The navigation function from App.js.
 * @param {object} CONFIG - The application's configuration object.
 */
export function initializePageRenderers(currentUser, userData, navigateTo, CONFIG) {
    _currentUser = currentUser;
    _userData = userData;
    _navigateTo = navigateTo;
    _CONFIG = CONFIG;
}

/**
 * Renders the Home page.
 */
export function renderHomePage() {
    updateBodyBackground('https://placehold.co/1920x1080/121212/E0E0E0?text=SophosWRLD+Community');
    const contentArea = document.getElementById('content-area');
    contentArea.className = 'flex-grow p-4 md:p-8';
    contentArea.innerHTML = `
        <div class="text-center">
            <h1 class="text-6xl font-bold text-red-500 animate-pulse">Welcome to SophosWRLD</h1>
            <p class="mt-4 text-xl text-gray-300">Your community hub for all things Sophos Studios.</p>
            ${_currentUser ? `<p class="mt-2 text-md text-gray-400">Hello, <span class="font-bold text-red-400">${_userData.displayName}</span>!</p>` : ''}
            <div class="mt-8 flex justify-center space-x-4">
                <button id="go-to-forum-btn" class="px-6 py-3 bg-red-600 rounded-lg text-white font-bold hover:bg-red-700 transition duration-300">Go to Forum</button>
                ${!_currentUser ? `<button id="go-to-auth-btn" class="px-6 py-3 bg-gray-700 rounded-lg text-white font-bold hover:bg-gray-600 transition duration-300">Join Us</button>` : ''}
            </div>
        </div>
    `;

    document.getElementById('go-to-forum-btn')?.addEventListener('click', () => _navigateTo('forum'));
    document.getElementById('go-to-auth-btn')?.addEventListener('click', () => _navigateTo('auth'));
}

/**
 * Renders the About page.
 */
export function renderAboutPage() {
    updateBodyBackground('https://placehold.co/1920x1080/121212/E0E0E0?text=About+SophosWRLD');
    const contentArea = document.getElementById('content-area');
    contentArea.className = 'flex-grow p-4 md:p-8';
    contentArea.innerHTML = `
        <div class="max-w-2xl mx-auto bg-gray-800 p-8 rounded-lg shadow-xl border-t-4 border-red-500">
            <h1 class="text-4xl font-bold text-red-500 mb-4">About SophosWRLD</h1>
            <p class="text-gray-300 leading-relaxed mb-4">
                SophosWRLD is the official community platform for Sophos Studios. We are dedicated to creating a space
                for our members to connect, share ideas, and collaborate on projects. Our mission is to foster a creative
                and supportive environment for developers, artists, and enthusiasts.
            </p>
            <p class="text-gray-300 leading-relaxed">
                Whether you're a long-time fan or a new member, we're excited to have you here. Explore the forum,
                check out the latest projects, and connect with the team.
            </p>
        </div>
    `;
}

/**
 * Renders the Auth (Login/Signup) page.
 */
export function renderAuthPage() {
    updateBodyBackground('https://placehold.co/1920x1080/121212/E0E0E0?text=Authentication');
    const contentArea = document.getElementById('content-area');
    contentArea.className = 'flex-grow p-4 md:p-8 flex items-center justify-center';
    contentArea.innerHTML = `
        <div class="w-full max-w-md bg-gray-800 p-8 rounded-lg shadow-xl border-t-4 border-red-500">
            <h2 id="auth-title" class="text-3xl font-bold text-center text-red-500 mb-6">Login</h2>
            <form id="auth-form" class="space-y-4">
                <div>
                    <label for="email" class="block text-sm font-medium text-gray-300">Email</label>
                    <input type="email" id="email" name="email" required
                           class="mt-1 block w-full rounded-lg bg-gray-700 border-gray-600 text-white p-3 focus:border-red-500 focus:ring focus:ring-red-500 focus:ring-opacity-50">
                </div>
                <div>
                    <label for="password" class="block text-sm font-medium text-gray-300">Password</label>
                    <input type="password" id="password" name="password" required
                           class="mt-1 block w-full rounded-lg bg-gray-700 border-gray-600 text-white p-3 focus:border-red-500 focus:ring focus:ring-red-500 focus:ring-opacity-50">
                </div>
                <button type="submit" id="auth-submit-btn" class="w-full py-3 bg-red-600 rounded-lg text-white font-bold hover:bg-red-700 transition duration-300">
                    Login
                </button>
            </form>
            <div class="mt-4 text-center">
                <button id="toggle-auth-btn" class="text-sm text-gray-400 hover:text-red-400">Need an account? Sign up</button>
            </div>
            <div class="mt-4 text-center">
                <button id="reset-password-btn" class="text-sm text-gray-400 hover:text-red-400">Forgot password?</button>
            </div>
            <div class="mt-6">
                <button id="google-auth-btn" class="w-full py-3 flex items-center justify-center space-x-2 bg-gray-700 rounded-lg text-white font-bold hover:bg-gray-600 transition duration-300">
                    <i class="fab fa-google"></i>
                    <span>Sign in with Google</span>
                </button>
            </div>
        </div>
    `;

    const authForm = document.getElementById('auth-form');
    const authTitle = document.getElementById('auth-title');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const toggleAuthBtn = document.getElementById('toggle-auth-btn');
    const resetPasswordBtn = document.getElementById('reset-password-btn');
    const googleAuthBtn = document.getElementById('google-auth-btn');
    let isLogin = true;

    toggleAuthBtn.addEventListener('click', () => {
        isLogin = !isLogin;
        authTitle.textContent = isLogin ? 'Login' : 'Sign Up';
        authSubmitBtn.textContent = isLogin ? 'Login' : 'Sign Up';
        toggleAuthBtn.textContent = isLogin ? 'Need an account? Sign up' : 'Already have an account? Login';
        // Hide password reset button on sign up page
        resetPasswordBtn.style.display = isLogin ? 'block' : 'none';
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        try {
            if (isLogin) {
                await authenticateUser('login', email, password);
            } else {
                await authenticateUser('signup', email, password);
            }
        } catch (error) {
            // Error handled by firebase-service.js
        }
    });

    resetPasswordBtn.addEventListener('click', async () => {
        const email = document.getElementById('email').value;
        if (!email) {
            showMessageModal('Please enter your email to reset your password.', 'error');
            return;
        }
        await sendPasswordReset(email);
    });

    googleAuthBtn.addEventListener('click', async () => {
        try {
            await authenticateUser('google');
        } catch (error) {
            // Error handled by firebase-service.js
        }
    });
}

/**
 * Renders the Forum page.
 */
export async function renderForumPage() {
    updateBodyBackground('https://placehold.co/1920x1080/121212/E0E0E0?text=SophosWRLD+Forum');
    const contentArea = document.getElementById('content-area');
    contentArea.className = 'flex-grow p-4 md:p-8 flex items-start justify-center';
    contentArea.innerHTML = `
        <div class="max-w-4xl w-full bg-gray-800 p-6 rounded-lg shadow-xl border-t-4 border-red-500">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold text-red-500">Community Forum</h2>
                ${_currentUser ? `
                    <button id="create-post-btn" class="px-4 py-2 bg-red-600 rounded-lg text-white font-bold hover:bg-red-700 transition duration-300">
                        <i class="fas fa-plus mr-2"></i>Create Post
                    </button>
                ` : ''}
            </div>
            <div id="posts-container" class="space-y-6">
                <!-- Posts will be loaded here dynamically -->
            </div>
        </div>
    `;

    if (_currentUser) {
        document.getElementById('create-post-btn').addEventListener('click', () => {
            showCreatePostModal();
        });
    }

    // Set up real-time listener for posts
    fetchAllPostsFirestore((posts) => {
        const postsContainer = document.getElementById('posts-container');
        if (!postsContainer) return;
        postsContainer.innerHTML = ''; // Clear previous posts
        posts.forEach(post => {
            const postElement = createPostElement(post);
            postsContainer.appendChild(postElement);
        });
    });
}

/**
 * Creates and returns a single post element.
 * @param {object} post - The post data.
 * @returns {HTMLElement} The post DOM element.
 */
function createPostElement(post) {
    const postDiv = document.createElement('div');
    postDiv.className = 'bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-700';
    postDiv.innerHTML = `
        <div class="flex justify-between items-start">
            <div>
                <h3 class="text-2xl font-bold text-white">${post.title}</h3>
                <div class="flex items-center text-sm text-gray-400 mt-1">
                    <span class="mr-2">by</span>
                    <span class="font-bold text-red-400 cursor-pointer" data-user-id="${post.authorId}">${post.authorName}</span>
                    <span class="ml-2">${post.createdAt.toDate().toLocaleString()}</span>
                </div>
            </div>
            ${_currentUser && (_userData.role === 'admin' || _userData.role === 'founder' || _currentUser.uid === post.authorId) ? `
                <div class="flex space-x-2">
                    <button class="edit-post-btn text-blue-500 hover:text-blue-300 transition duration-200" data-post-id="${post.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-post-btn text-red-500 hover:text-red-300 transition duration-200" data-post-id="${post.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            ` : ''}
        </div>
        <p class="mt-4 text-gray-300 leading-relaxed">${post.content}</p>
        
        <!-- Reactions Section -->
        <div class="mt-4 flex items-center space-x-4 border-t border-gray-700 pt-4">
            <button class="like-btn text-gray-400 hover:text-red-400 transition duration-200" data-post-id="${post.id}">
                <i class="fas fa-heart"></i>
                <span class="ml-1">${post.reactions.likes}</span>
            </button>
            <button class="love-btn text-gray-400 hover:text-pink-400 transition duration-200" data-post-id="${post.id}">
                <i class="fas fa-star"></i>
                <span class="ml-1">${post.reactions.loves}</span>
            </button>
            <button class="laugh-btn text-gray-400 hover:text-yellow-400 transition duration-200" data-post-id="${post.id}">
                <i class="fas fa-laugh"></i>
                <span class="ml-1">${post.reactions.laughs}</span>
            </button>
        </div>
        
        <!-- Comments Section -->
        <div class="mt-6 border-t border-gray-700 pt-4">
            <h4 class="text-lg font-semibold text-white mb-2">Comments (${post.comments.length})</h4>
            <div id="comments-container-${post.id}" class="space-y-4">
                ${post.comments.map(comment => `
                    <div class="bg-gray-800 p-4 rounded-lg">
                        <div class="flex items-center text-sm text-gray-400 mb-1">
                            <span class="font-bold text-red-400 mr-2 cursor-pointer" data-user-id="${comment.authorId}">${comment.authorName}</span>
                            <span class="text-xs">${comment.createdAt.toDate().toLocaleString()}</span>
                        </div>
                        <p class="text-gray-300">${comment.content}</p>
                    </div>
                `).join('')}
            </div>
            ${_currentUser ? `
                <form class="mt-4 flex space-x-2" data-post-id="${post.id}">
                    <input type="text" placeholder="Add a comment..." class="flex-grow bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:ring-red-500 focus:border-red-500" required>
                    <button type="submit" class="px-4 py-2 bg-red-600 rounded-lg text-white font-bold hover:bg-red-700 transition duration-300">Send</button>
                </form>
            ` : ''}
        </div>
    `;

    // Add event listeners for dynamic elements
    if (_currentUser) {
        // Edit/Delete buttons (only for owner/admin)
        postDiv.querySelectorAll('.edit-post-btn').forEach(btn => {
            btn.addEventListener('click', () => showCreatePostModal(post));
        });
        postDiv.querySelectorAll('.delete-post-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                showMessageModal('Are you sure you want to delete this post?', 'confirm', async () => {
                    await deletePostFirestore(post.id);
                });
            });
        });

        // Reaction buttons
        postDiv.querySelectorAll('.like-btn').forEach(btn => {
            btn.addEventListener('click', () => addReactionToPost(post.id, 'likes'));
        });
        postDiv.querySelectorAll('.love-btn').forEach(btn => {
            btn.addEventListener('click', () => addReactionToPost(post.id, 'loves'));
        });
        postDiv.querySelectorAll('.laugh-btn').forEach(btn => {
            btn.addEventListener('click', () => addReactionToPost(post.id, 'laughs'));
        });

        // Comment form
        postDiv.querySelectorAll('form').forEach(form => {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const input = form.querySelector('input');
                if (input.value.trim()) {
                    await addCommentToPost(post.id, input.value, _currentUser);
                    input.value = ''; // Clear input
                }
            });
        });
    }

    return postDiv;
}


/**
 * Renders the Admin page.
 */
export async function renderAdminPage() {
    if (!_userData || (_userData.role !== 'admin' && _userData.role !== 'founder')) {
        _navigateTo('home');
        showMessageModal('You do not have permission to view this page.', 'error');
        return;
    }
    updateBodyBackground('https://placehold.co/1920x1080/121212/E0E0E0?text=Admin+Panel');
    const contentArea = document.getElementById('content-area');
    contentArea.className = 'flex-grow p-4 md:p-8 flex items-start justify-center';
    contentArea.innerHTML = `
        <div class="w-full max-w-5xl bg-gray-800 p-6 rounded-lg shadow-xl border-t-4 border-red-500">
            <h2 class="text-3xl font-bold text-red-500 mb-6">Admin Panel</h2>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

                <!-- User Management Section -->
                <div class="col-span-1 lg:col-span-2 bg-gray-900 p-6 rounded-xl border border-gray-700">
                    <h3 class="text-xl font-bold text-white mb-4">User Management</h3>
                    <div id="users-list-container" class="space-y-4 max-h-[500px] overflow-y-auto">
                        <!-- Users will be loaded here dynamically -->
                    </div>
                </div>

                <!-- Admin Action Buttons Section -->
                <div class="col-span-1 bg-gray-900 p-6 rounded-xl border border-gray-700">
                    <h3 class="text-xl font-bold text-white mb-4">Admin Actions</h3>
                    <div class="space-y-4">
                        <button id="manage-videos-btn" class="w-full px-4 py-3 bg-red-600 rounded-lg text-white font-bold hover:bg-red-700 transition duration-300">
                            Manage Videos
                        </button>
                        <button id="manage-partner-apps-btn" class="w-full px-4 py-3 bg-red-600 rounded-lg text-white font-bold hover:bg-red-700 transition duration-300">
                            Manage Partner Applications
                        </button>
                        <button id="edit-partner-tos-btn" class="w-full px-4 py-3 bg-red-600 rounded-lg text-white font-bold hover:bg-red-700 transition duration-300">
                            Edit Partner TOS
                        </button>
                        <button id="edit-partner-questions-btn" class="w-full px-4 py-3 bg-red-600 rounded-lg text-white font-bold hover:bg-red-700 transition duration-300">
                            Edit Partner Questions
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('manage-videos-btn').addEventListener('click', () => _navigateTo('manage-videos'));
    document.getElementById('manage-partner-apps-btn').addEventListener('click', () => _navigateTo('manage-partner-apps'));
    document.getElementById('edit-partner-tos-btn').addEventListener('click', async () => showEditPartnerTOSModal(await fetchPartnerTOSFirestore()));
    document.getElementById('edit-partner-questions-btn').addEventListener('click', () => showEditPartnerQuestionsModal());


    // Set up real-time listener for users
    fetchAllUsersFirestore((users) => {
        _usersList = users;
        const usersListContainer = document.getElementById('users-list-container');
        if (!usersListContainer) return;
        usersListContainer.innerHTML = '';
        users.forEach(user => {
            const userElement = createUserElement(user);
            usersListContainer.appendChild(userElement);
        });
    });

    // Set up real-time listener for partner questions
    fetchPartnerApplicationQuestionsFirestore((questions) => {
        _currentPartnerQuestions = questions;
    });
}

/**
 * Creates a single user element for the admin panel.
 * @param {object} user - The user data.
 * @returns {HTMLElement} The user DOM element.
 */
function createUserElement(user) {
    const userDiv = document.createElement('div');
    userDiv.className = 'flex items-center justify-between p-4 bg-gray-800 rounded-lg border border-gray-700';
    userDiv.innerHTML = `
        <div>
            <div class="font-bold text-white">${user.displayName}</div>
            <div class="text-sm text-gray-400">${user.email}</div>
            <div class="text-sm mt-1">${getRoleVFX(user.role)}</div>
        </div>
        <button class="take-action-btn px-4 py-2 bg-red-600 rounded-lg text-white font-bold hover:bg-red-700 transition duration-300" data-user-id="${user.uid}">
            Action
        </button>
    `;

    userDiv.querySelector('.take-action-btn').addEventListener('click', (e) => {
        const userId = e.target.dataset.userId;
        const userToActOn = _usersList.find(u => u.uid === userId);
        if (userToActOn) {
            showTakeActionModal(userToActOn, _userData);
        }
    });

    return userDiv;
}


/**
 * Renders the Profile page for the current user.
 */
export async function renderProfilePage() {
    if (!_currentUser) {
        _navigateTo('auth');
        return;
    }
    updateBodyBackground('https://placehold.co/1920x1080/121212/E0E0E0?text=User+Profile');

    // Fetch the latest user data to ensure the page is up to date
    const userData = await fetchUserByUidFirestore(_currentUser.uid);
    if (!userData) {
        showMessageModal('Failed to load user profile.', 'error');
        return;
    }

    const contentArea = document.getElementById('content-area');
    contentArea.className = 'flex-grow p-4 md:p-8 flex items-center justify-center';
    contentArea.innerHTML = `
        <div class="w-full max-w-xl bg-gray-800 p-8 rounded-lg shadow-xl border-t-4 border-red-500">
            <h2 class="text-3xl font-bold text-red-500 mb-6">User Profile</h2>
            <div class="space-y-4">
                <div class="flex items-center space-x-4">
                    <div class="text-gray-400">Display Name:</div>
                    <div class="font-bold text-white">${userData.displayName}</div>
                </div>
                <div class="flex items-center space-x-4">
                    <div class="text-gray-400">Email:</div>
                    <div class="font-bold text-white">${userData.email}</div>
                </div>
                <div class="flex items-center space-x-4">
                    <div class="text-gray-400">Role:</div>
                    <div class="font-bold">${getRoleVFX(userData.role)}</div>
                </div>
                <div class="flex items-center space-x-4">
                    <div class="text-gray-400">User ID:</div>
                    <div class="font-mono text-xs text-gray-400 break-all">${userData.uid}</div>
                </div>
                <div class="pt-4 border-t border-gray-700">
                    <button id="edit-profile-btn" class="px-6 py-2 bg-red-600 rounded-lg text-white font-bold hover:bg-red-700 transition duration-300">
                        Edit Profile
                    </button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('edit-profile-btn').addEventListener('click', () => {
        showEditUserInfoModal(userData);
    });
}

/**
 * Renders the Partner Application page.
 */
export async function renderPartnerApplicationPage() {
    if (!_currentUser) {
        _navigateTo('auth');
        return;
    }
    updateBodyBackground('https://placehold.co/1920x1080/121212/E0E0E0?text=Partner+Application');

    const tos = await fetchPartnerTOSFirestore();
    const questions = await fetchPartnerApplicationQuestionsFirestore();

    const contentArea = document.getElementById('content-area');
    contentArea.className = 'flex-grow p-4 md:p-8 flex items-start justify-center';
    contentArea.innerHTML = `
        <div class="max-w-2xl w-full bg-gray-800 p-8 rounded-lg shadow-xl border-t-4 border-red-500">
            <h2 class="text-3xl font-bold text-red-500 mb-6">Partner Application</h2>
            <div class="prose prose-invert max-w-none">
                <h3 class="text-xl font-semibold text-white mb-2">Terms of Service</h3>
                <p>${tos}</p>
            </div>
            <div class="mt-6 flex items-center space-x-2">
                <input type="checkbox" id="tos-checkbox" class="rounded text-red-500 focus:ring-red-500">
                <label for="tos-checkbox" class="text-gray-300">I agree to the terms of service.</label>
            </div>
            
            <form id="partner-application-form" class="mt-6 space-y-4">
                ${questions.map((question, index) => `
                    <div>
                        <label for="q-${index}" class="block text-sm font-medium mb-1 text-gray-300">${question}</label>
                        <textarea id="q-${index}" name="q-${index}" rows="4" class="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:ring-red-500 focus:border-red-500" required></textarea>
                    </div>
                `).join('')}
                <div class="flex justify-end">
                    <button type="submit" id="submit-application-btn" class="px-6 py-2 bg-red-600 rounded-lg text-white font-bold hover:bg-red-700 transition duration-300">
                        Submit Application
                    </button>
                </div>
            </form>
        </div>
    `;

    const form = document.getElementById('partner-application-form');
    const tosCheckbox = document.getElementById('tos-checkbox');
    const submitBtn = document.getElementById('submit-application-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!tosCheckbox.checked) {
            showMessageModal('You must agree to the terms of service to submit an application.', 'error');
            return;
        }

        const answers = {};
        questions.forEach((question, index) => {
            const answer = document.getElementById(`q-${index}`).value;
            answers[question] = answer;
        });

        showLoadingSpinner();
        try {
            await submitPartnerApplicationFirestore(answers, _currentUser, _userData);
            showMessageModal('Application submitted successfully!', 'success');
            _navigateTo('home');
        } catch (error) {
            showMessageModal(error.message, 'error');
        } finally {
            hideLoadingSpinner();
        }
    });
}

/**
 * Renders the Admin page for managing partner applications.
 */
export function renderManagePartnerAppsPage() {
    if (!_userData || (_userData.role !== 'admin' && _userData.role !== 'founder')) {
        _navigateTo('home');
        showMessageModal('You do not have permission to view this page.', 'error');
        return;
    }
    updateBodyBackground('https://placehold.co/1920x1080/121212/E0E0E0?text=Manage+Partner+Applications');
    const contentArea = document.getElementById('content-area');
    contentArea.className = 'flex-grow p-4 md:p-8 flex items-start justify-center';
    contentArea.innerHTML = `
        <div class="w-full max-w-4xl bg-gray-800 p-6 rounded-lg shadow-xl border-t-4 border-red-500">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold text-red-500">Partner Applications</h2>
                <button id="back-to-admin-btn" class="px-4 py-2 bg-gray-700 rounded-lg text-white font-bold hover:bg-gray-600 transition duration-300">
                    <i class="fas fa-arrow-left mr-2"></i>Back to Admin
                </button>
            </div>
            <div id="applications-list-container" class="space-y-4">
                <!-- Applications will be loaded here dynamically -->
            </div>
        </div>
    `;

    document.getElementById('back-to-admin-btn').addEventListener('click', () => _navigateTo('admin'));

    fetchAllPartnerApplicationsFirestore((applications) => {
        _partnerApplicationsList = applications;
        const applicationsListContainer = document.getElementById('applications-list-container');
        if (!applicationsListContainer) return;
        applicationsListContainer.innerHTML = '';
        if (applications.length === 0) {
            applicationsListContainer.innerHTML = `<p class="text-center text-gray-400">No applications found.</p>`;
        }
        applications.forEach(app => {
            const appElement = createApplicationElement(app);
            applicationsListContainer.appendChild(appElement);
        });
    });
}

/**
 * Creates a single application element for the admin panel.
 * @param {object} application - The application data.
 * @returns {HTMLElement} The application DOM element.
 */
function createApplicationElement(application) {
    const appDiv = document.createElement('div');
    appDiv.className = 'flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-700';
    let statusColor = '';
    if (application.status === 'approved') statusColor = 'text-green-500';
    else if (application.status === 'declined') statusColor = 'text-red-500';
    else statusColor = 'text-yellow-500';

    appDiv.innerHTML = `
        <div>
            <div class="font-bold text-white">${application.applicantName}</div>
            <div class="text-sm text-gray-400">${application.applicantEmail}</div>
            <div class="text-sm mt-1">Status: <span class="font-bold ${statusColor}">${application.status.toUpperCase()}</span></div>
        </div>
        <button class="view-app-btn px-4 py-2 bg-red-600 rounded-lg text-white font-bold hover:bg-red-700 transition duration-300" data-app-id="${application.id}">
            View & Review
        </button>
    `;

    appDiv.querySelector('.view-app-btn').addEventListener('click', (e) => {
        const appId = e.target.dataset.appId;
        const appToReview = _partnerApplicationsList.find(a => a.id === appId);
        if (appToReview) {
            showReviewApplicationModal(appToReview);
        }
    });

    return appDiv;
}

/**
 * Renders the Admin page for managing videos.
 */
export function renderManageVideosPage() {
    if (!_userData || (_userData.role !== 'admin' && _userData.role !== 'founder')) {
        _navigateTo('home');
        showMessageModal('You do not have permission to view this page.', 'error');
        return;
    }
    updateBodyBackground('https://placehold.co/1920x1080/121212/E0E0E0?text=Manage+Videos');
    const contentArea = document.getElementById('content-area');
    contentArea.className = 'flex-grow p-4 md:p-8 flex items-start justify-center';
    contentArea.innerHTML = `
        <div class="w-full max-w-4xl bg-gray-800 p-6 rounded-lg shadow-xl border-t-4 border-red-500">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-3xl font-bold text-red-500">Manage Videos</h2>
                <div class="flex space-x-2">
                    <button id="add-video-btn" class="px-4 py-2 bg-red-600 rounded-lg text-white font-bold hover:bg-red-700 transition duration-300">
                        <i class="fas fa-plus mr-2"></i>Add Video
                    </button>
                    <button id="back-to-admin-btn" class="px-4 py-2 bg-gray-700 rounded-lg text-white font-bold hover:bg-gray-600 transition duration-300">
                        <i class="fas fa-arrow-left mr-2"></i>Back to Admin
                    </button>
                </div>
            </div>
            <div id="videos-list-container" class="space-y-4">
                <!-- Videos will be loaded here dynamically -->
            </div>
        </div>
    `;
    
    document.getElementById('back-to-admin-btn').addEventListener('click', () => _navigateTo('admin'));
    document.getElementById('add-video-btn').addEventListener('click', () => showAddEditVideoModal());
    
    fetchVideosFirestore((videos) => {
        _videosList = videos;
        const videosListContainer = document.getElementById('videos-list-container');
        if (!videosListContainer) return;
        videosListContainer.innerHTML = '';
        if (videos.length === 0) {
            videosListContainer.innerHTML = `<p class="text-center text-gray-400">No videos found. Click 'Add Video' to add one.</p>`;
        }
        videos.forEach(video => {
            const videoElement = createVideoElement(video);
            videosListContainer.appendChild(videoElement);
        });
    });
}


/**
 * Creates a single video element for the video management page.
 * @param {object} video - The video data.
 * @returns {HTMLElement} The video DOM element.
 */
function createVideoElement(video) {
    const videoDiv = document.createElement('div');
    videoDiv.className = 'flex items-center justify-between p-4 bg-gray-900 rounded-lg border border-gray-700';
    videoDiv.innerHTML = `
        <div>
            <div class="font-bold text-white">${video.name}</div>
            <a href="${video.youtubeLink}" target="_blank" class="text-sm text-red-400 hover:underline break-all">${video.youtubeLink}</a>
        </div>
        <div class="flex space-x-2">
            <button class="edit-video-btn px-4 py-2 bg-blue-600 rounded-lg text-white font-bold hover:bg-blue-700 transition duration-300" data-video-id="${video.id}">
                Edit
            </button>
            <button class="delete-video-btn px-4 py-2 bg-red-600 rounded-lg text-white font-bold hover:bg-red-700 transition duration-300" data-video-id="${video.id}">
                Delete
            </button>
        </div>
    `;

    videoDiv.querySelector('.edit-video-btn').addEventListener('click', (e) => {
        const videoId = e.target.dataset.videoId;
        const videoToEdit = _videosList.find(v => v.id === videoId);
        if (videoToEdit) {
            showAddEditVideoModal(videoToEdit);
        }
    });

    videoDiv.querySelector('.delete-video-btn').addEventListener('click', (e) => {
        const videoId = e.target.dataset.videoId;
        showMessageModal('Are you sure you want to delete this video?', 'confirm', async () => {
            try {
                await deleteVideoFirestore(videoId, _currentUser);
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
        });
    });

    return videoDiv;
}


