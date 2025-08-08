// src/page-renderers.js
// Contains functions for rendering the main content of each page.

// Import necessary functions and utilities
import { showLoadingSpinner, hideLoadingSpinner, showMessageModal } from './utils.js';

// Global state variables for caching data
let _usersList = [];
let _partnerApplicationsList = [];
let _currentPartnerQuestions = [];
let _videosList = [];

// Keep track of the active message listener to unsubscribe
let currentMessageUnsubscribe = null;

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
 * @param {array} userList - The list of all users.
 * @param {object} currentUser - The current authenticated user.
 * @param {function} updateUserRoleFirestore - The function to update user roles.
 */
export function renderAdminPage(container, userList, currentUser, updateUserRoleFirestore) {
    if (!currentUser || currentUser?.role !== 'admin') {
        container.innerHTML = `<h1 class="text-3xl text-center text-red-500">Access Denied</h1>`;
        return;
    }

    const userCards = userList.map(user => `
        <div class="bg-gray-700 p-4 rounded-lg flex items-center justify-between shadow-md">
            <div>
                <p class="text-xl font-semibold text-gray-100">${user.username}</p>
                <p class="text-sm text-gray-400">UID: ${user.id}</p>
                <p class="text-sm text-gray-400">Role: <span class="text-red-400 font-bold">${user.role}</span></p>
            </div>
            <div class="flex space-x-2">
                <button data-user-id="${user.id}" data-new-role="member" class="update-role-btn bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-semibold hover:bg-blue-700 transition">Member</button>
                <button data-user-id="${user.id}" data-new-role="admin" class="update-role-btn bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold hover:bg-red-700 transition">Admin</button>
            </div>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="bg-gray-800 p-8 rounded-lg shadow-xl border-t-4 border-red-500 w-full max-w-4xl">
            <h2 class="text-3xl font-bold text-red-500 mb-6">Admin Dashboard</h2>
            <h3 class="text-xl font-semibold text-gray-200 mb-4">Manage Users</h3>
            <div id="user-list" class="space-y-4 max-h-96 overflow-y-auto">
                ${userCards}
            </div>
        </div>
    `;

    document.querySelectorAll('.update-role-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const userId = e.target.dataset.userId;
            const newRole = e.target.dataset.newRole;
            updateUserRoleFirestore(userId, newRole, currentUser);
        });
    });
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
 * Renders the direct messages page.
 * @param {HTMLElement} container - The DOM element to render into.
 * @param {array} userList - The list of all users.
 * @param {object} currentUser - The current authenticated user.
 * @param {function} sendDirectMessage - The function to send a message.
 * @param {function} getDirectMessages - The function to get messages.
 * @param {function} updateDirectMessageSeenStatus - The function to update seen status.
 */
export function renderDMsPage(container, userList, currentUser, sendDirectMessage, getDirectMessages, updateDirectMessageSeenStatus) {
    if (!currentUser) {
        container.innerHTML = `<h1 class="text-3xl text-center text-red-500">You must be logged in to view messages.</h1>`;
        return;
    }

    const otherUsers = userList.filter(user => user.id !== currentUser.uid);

    container.innerHTML = `
        <div class="bg-gray-800 p-4 md:p-8 rounded-lg shadow-xl border-t-4 border-red-500 w-full max-w-5xl flex flex-col md:flex-row h-full">
            <!-- User List for DMs -->
            <div class="w-full md:w-1/3 border-r border-gray-700 pr-4 overflow-y-auto max-h-screen-minus-header">
                <h3 class="text-xl font-bold text-red-500 mb-4">Contacts</h3>
                <div id="dm-contact-list" class="space-y-2">
                    ${otherUsers.map(user => `
                        <div data-user-id="${user.id}" class="dm-contact p-3 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors duration-200">
                            <p class="text-lg font-semibold text-white">${user.username}</p>
                            <p class="text-sm text-gray-400">UID: ${user.id}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
            <!-- Message Area -->
            <div id="dm-message-area" class="w-full md:w-2/3 pl-4 flex flex-col h-full mt-4 md:mt-0">
                <div id="dm-chat-window" class="flex-grow bg-gray-900 p-4 rounded-lg overflow-y-auto flex flex-col-reverse space-y-4">
                    <p class="text-center text-gray-500">Select a user to start chatting.</p>
                </div>
                <form id="dm-send-form" class="mt-4 hidden">
                    <div class="flex space-x-2">
                        <input type="text" id="dm-message-input" placeholder="Type a message..." class="flex-grow p-3 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500">
                        <button type="submit" class="bg-red-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-red-700 transition-colors duration-300">Send</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const chatWindow = document.getElementById('dm-chat-window');
    const sendForm = document.getElementById('dm-send-form');
    const messageInput = document.getElementById('dm-message-input');
    let selectedUserId = null;

    document.querySelectorAll('.dm-contact').forEach(contact => {
        contact.addEventListener('click', (e) => {
            const userId = e.currentTarget.dataset.userId;
            const user = otherUsers.find(u => u.id === userId);
            selectedUserId = userId;

            // Update chat window header and show form
            chatWindow.innerHTML = `<p class="text-center text-gray-400">Chat with ${user.username}</p>`;
            sendForm.classList.remove('hidden');

            // Unsubscribe from previous listener if it exists
            if (currentMessageUnsubscribe) {
                currentMessageUnsubscribe();
            }

            // Set up real-time listener for messages
            currentMessageUnsubscribe = getDirectMessages(currentUser.uid, selectedUserId, (messages) => {
                chatWindow.innerHTML = '';
                messages.forEach(message => {
                    const messageElement = document.createElement('div');
                    const isSender = message.senderId === currentUser.uid;
                    messageElement.className = `p-3 rounded-xl max-w-sm ${isSender ? 'bg-red-600 text-white self-end rounded-br-none' : 'bg-gray-700 text-white self-start rounded-bl-none'}`;
                    messageElement.textContent = message.text;
                    chatWindow.appendChild(messageElement);

                    // Scroll to bottom
                    chatWindow.scrollTop = chatWindow.scrollHeight;
                });
            });
        });
    });

    sendForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const messageText = messageInput.value.trim();
        if (messageText && selectedUserId) {
            await sendDirectMessage(currentUser.uid, selectedUserId, messageText);
            messageInput.value = '';
        }
    });
}
