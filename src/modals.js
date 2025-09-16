// src/modals.js
// Handles displaying and managing various application modals.

import {
    createPostFirestore, updatePostFirestore, updateProfileData,
    updatePartnerApplicationStatusFirestore, updatePartnerTOSFirestore,
    updatePartnerApplicationQuestionsFirestore, addVideoFirestore, updateVideoFirestore
} from './firebase-service.js';
import { showMessageModal, showLoadingSpinner, hideLoadingSpinner, extractYouTubeVideoId } from './utils.js';

// Global state and functions passed from App.js (initialized by App.js)
let _currentUser = null;
let _userData = null;
let _navigateTo = null;
let _renderAdminPanelPage = null; // Callback to re-render admin page
let _renderForumPage = null; // Callback to re-render forum page
let _renderPartnersPage = null; // Callback to re-render partners page
let _renderPartnerTOSPage = null; // Callback to re-render partner TOS page
let _renderManagePartnerQuestionsPage = null; // Callback to re-render manage partner questions page
let _renderVideosPage = null; // Callback to re-render videos page

/**
 * Initializes the modals module with necessary global state and functions.
 * This should be called once from App.js.
 * @param {object} currentUser - The current Firebase Auth user object.
 * @param {object} userData - The current Firestore user data.
 * @param {function} navigateTo - The main navigation function from App.js.
 * @param {function} renderAdminPanelPage - Callback to re-render the admin panel.
 * @param {function} renderForumPage - Callback to re-render the forum page.
 * @param {function} renderPartnersPage - Callback to re-render the partners page.
 * @param {function} renderPartnerTOSPage - Callback to re-render the partner TOS page.
 * @param {function} renderManagePartnerQuestionsPage - Callback to re-render the manage partner questions page.
 * @param {function} renderVideosPage - Callback to re-render the videos page.
 */
export function initializeModals(currentUser, userData, navigateTo,
    renderAdminPanelPage, renderForumPage, renderPartnersPage, renderPartnerTOSPage,
    renderManagePartnerQuestionsPage, renderVideosPage) {
    _currentUser = currentUser;
    _userData = userData;
    _navigateTo = navigateTo;
    _renderAdminPanelPage = renderAdminPanelPage;
    _renderForumPage = renderForumPage;
    _renderPartnersPage = renderPartnersPage;
    _renderPartnerTOSPage = renderPartnerTOSPage;
    _renderManagePartnerQuestionsPage = renderManagePartnerQuestionsPage;
    _renderVideosPage = renderVideosPage;
}

/**
 * Updates the global state references in the modals module.
 * Call this whenever currentUser or userData changes in App.js.
 * @param {object} currentUser - The current Firebase Auth user object.
 * @param {object} userData - The current Firestore user data.
 */
export function updateModalState(currentUser, userData) {
    _currentUser = currentUser;
    _userData = userData;
}

/**
 * Helper function to create and append a modal to the body.
 * @param {string} id - The ID for the modal container.
 * @param {string} contentHtml - The inner HTML content of the modal.
 * @returns {HTMLElement} The created modal element.
 */
function createModal(id, contentHtml) {
    const existingModal = document.getElementById(id);
    if (existingModal) {
        existingModal.remove(); // Remove old modal if it exists
    }

    const modal = document.createElement('div');
    modal.id = id;
    modal.className = 'fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-50 p-4';
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-lg backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90 border border-gray-200 dark:border-gray-700 text-white dark:text-white relative">
            <button class="absolute top-4 right-4 text-white hover:text-white dark:hover:text-white text-2xl" onclick="this.closest('.fixed').remove()">
                <i class="fas fa-times"></i>
            </button>
            ${contentHtml}
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
}

/**
 * Displays the Create/Edit Post modal.
 * @param {object} [post=null] - The post object if editing, null if creating.
 */
export function showCreatePostModal(post = null) {
    const isEditing = !!post;
    const modal = createModal('create-post-modal', `
        <h2 class="text-2xl font-extrabold text-center text-white dark:text-white mb-6">${isEditing ? 'Edit Post' : 'Create New Post'}</h2>
        <form id="post-form" class="space-y-4">
            <div>
                <label for="post-title" class="block text-white dark:text-white text-sm font-semibold mb-2">Title</label>
                <input type="text" id="post-title" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white" value="${post ? post.title : ''}" required>
            </div>
            <div>
                <label for="post-content" class="block text-white dark:text-white text-sm font-semibold mb-2">Content</label>
                <textarea id="post-content" rows="10" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white" required>${post ? post.content : ''}</textarea>
            </div>
            <div class="flex justify-end space-x-4 mt-6">
                <button type="button" class="py-2 px-5 rounded-full bg-gray-500 text-white font-bold hover:bg-gray-600 transition duration-300 transform hover:scale-105 shadow-lg" onclick="this.closest('.fixed').remove()">
                    Cancel
                </button>
                <button type="submit" class="py-2 px-5 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                    ${isEditing ? 'Save Changes' : 'Create Post'}
                </button>
            </div>
        </form>
    `);

    modal.querySelector('#post-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = modal.querySelector('#post-title').value;
        const content = modal.querySelector('#post-content').value;

        try {
            if (isEditing) {
                await updatePostFirestore(post.id, title, content, _currentUser, _userData);
            } else {
                await createPostFirestore(title, content, _currentUser, _userData);
            }
            modal.remove();
            _renderForumPage(); // Re-render forum page after action
        } catch (error) {
            showMessageModal(error.message, 'error');
        }
    });
}

/**
 * Displays the "Take Action" modal for a specific user in the Admin Panel.
 * @param {object} user - The user object to take action on.
 */
export function showTakeActionModal(user) {
    const modal = createModal('take-action-modal', `
        <h2 class="text-2xl font-extrabold text-center text-white dark:text-white mb-6">Take Action on ${user.username}</h2>
        <div class="space-y-4">
            <p class="text-white dark:text-white text-center">What action would you like to take for ${user.username} (${user.email})?</p>
            <div class="flex flex-col space-y-3 mt-6">
                <button id="edit-user-info-btn" class="w-full py-3 rounded-full bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                    Edit User Info
                </button>
                <button id="send-email-btn" class="w-full py-3 rounded-full bg-purple-600 text-white font-bold text-lg hover:bg-purple-700 transition duration-300 transform hover:scale-105 shadow-lg">
                    Send Email
                </button>
                <button id="toggle-ban-btn" class="w-full py-3 rounded-full ${user.isBanned ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'} text-white font-bold text-lg transition duration-300 transform hover:scale-105 shadow-lg">
                    ${user.isBanned ? 'Unban User' : 'Ban User'}
                </button>
                <button id="delete-user-btn" class="w-full py-3 rounded-full bg-red-600 text-white font-bold text-lg hover:bg-red-700 transition duration-300 transform hover:scale-105 shadow-lg">
                    Delete User
                </button>
            </div>
        </div>
    `);

    modal.querySelector('#edit-user-info-btn').addEventListener('click', () => {
        modal.remove();
        showEditUserInfoModal(user);
    });
    modal.querySelector('#send-email-btn').addEventListener('click', () => {
        modal.remove();
        _navigateTo('send-email', user.id);
    });
    modal.querySelector('#toggle-ban-btn').addEventListener('click', async () => {
        const confirmMessage = user.isBanned ? `Are you sure you want to unban ${user.username}?` : `Are you sure you want to ban ${user.username}? This will prevent them from logging in.`;
        showMessageModal(confirmMessage, 'confirm', async () => {
            try {
                const success = await firebaseService.setUserBanStatusFirestore(user.id, !user.isBanned, _currentUser, _userData);
                if (success) {
                    showMessageModal(`${user.username} has been ${user.isBanned ? 'unbanned' : 'banned'}.`);
                    modal.remove();
                    _renderAdminPanelPage(); // Re-render admin panel to update status
                }
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
        });
    });
    modal.querySelector('#delete-user-btn').addEventListener('click', async () => {
        showMessageModal(`Are you sure you want to delete ${user.username}'s account? This action cannot be undone.`, 'confirm', async () => {
            try {
                const success = await firebaseService.deleteUserFirestore(user.id, _currentUser, _userData);
                if (success) {
                    showMessageModal(`${user.username}'s account has been deleted.`);
                    modal.remove();
                    _renderAdminPanelPage(); // Re-render admin panel to update list
                }
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
        });
    });
}

/**
 * Displays the modal for editing a user's information (username, profile pic, bio, background).
 * @param {object} user - The user object to edit.
 */
export function showEditUserInfoModal(user) {
    const modal = createModal('edit-user-info-modal', `
        <h2 class="text-2xl font-extrabold text-center text-white dark:text-white mb-6">Edit User Info: ${user.username}</h2>
        <form id="edit-user-form" class="space-y-4">
            <div>
                <label for="edit-username" class="block text-white dark:text-white text-sm font-semibold mb-2">Username</label>
                <input type="text" id="edit-username" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white" value="${user.username || ''}" required>
            </div>
            <div>
                <label for="edit-profile-pic-url" class="block text-white dark:text-white text-sm font-semibold mb-2">Profile Picture URL</label>
                <input type="url" id="edit-profile-pic-url" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white" value="${user.profilePicUrl || ''}">
            </div>
            <div>
                <label for="edit-bio" class="block text-white dark:text-white text-sm font-semibold mb-2">Bio</label>
                <textarea id="edit-bio" rows="5" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white">${user.bio || ''}</textarea>
            </div>
            <div>
                <label for="edit-background-url" class="block text-white dark:text-white text-sm font-semibold mb-2">Background URL/Class</label>
                <input type="text" id="edit-background-url" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white" value="${user.backgroundUrl || ''}">
                <p class="text-xs text-white dark:text-white mt-1">Can be a Tailwind CSS class (e.g., 'bg-blue-500') or a direct image/GIF URL.</p>
            </div>
            <div class="flex justify-end space-x-4 mt-6">
                <button type="button" class="py-2 px-5 rounded-full bg-gray-500 text-white font-bold hover:bg-gray-600 transition duration-300 transform hover:scale-105 shadow-lg" onclick="this.closest('.fixed').remove()">
                    Cancel
                </button>
                <button type="submit" class="py-2 px-5 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                    Save Changes
                </button>
            </div>
        </form>
    `);

    modal.querySelector('#edit-user-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newUsername = modal.querySelector('#edit-username').value;
        const newProfilePicUrl = modal.querySelector('#edit-profile-pic-url').value;
        const newBio = modal.querySelector('#edit-bio').value;
        const newBackgroundUrl = modal.querySelector('#edit-background-url').value;

        try {
            await updateProfileData(user.id, {
                username: newUsername,
                profilePicUrl: newProfilePicUrl,
                bio: newBio,
                backgroundUrl: newBackgroundUrl
            }, _currentUser, _userData);
            showMessageModal('User info updated successfully!');
            modal.remove();
            _renderAdminPanelPage(); // Re-render admin panel to update UI
        } catch (error) {
            showMessageModal(error.message, 'error');
        }
    });
}

/**
 * Displays the modal for editing a partner's card information.
 * @param {object} partnerUser - The partner user object to edit.
 */
export function showEditPartnerCardModal(partnerUser) {
    const partnerLinks = partnerUser.partnerInfo?.links || {};
    const modal = createModal('edit-partner-card-modal', `
        <h2 class="text-2xl font-extrabold text-center text-white dark:text-white mb-6">Edit Partner Card: ${partnerUser.username}</h2>
        <form id="edit-partner-card-form" class="space-y-4">
            <div>
                <label for="partner-description" class="block text-white dark:text-white text-sm font-semibold mb-2">Partner Description</label>
                <textarea id="partner-description" rows="4" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white" placeholder="A short description for this partner...">${partnerUser.partnerInfo?.description || ''}</textarea>
            </div>
            <h4 class="text-lg font-semibold text-white dark:text-white mt-4">Partner Links</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label for="partner-link-discord" class="block text-white dark:text-white text-sm font-semibold mb-2">Discord Link</label>
                    <input type="url" id="partner-link-discord" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white" value="${partnerLinks.discord || ''}">
                </div>
                <div>
                    <label for="partner-link-roblox" class="block text-white dark:text-white text-sm font-semibold mb-2">Roblox Link</label>
                    <input type="url" id="partner-link-roblox" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white" value="${partnerLinks.roblox || ''}">
                </div>
                <div>
                    <label for="partner-link-fivem" class="block text-white dark:text-white text-sm font-semibold mb-2">FiveM Link</label>
                    <input type="url" id="partner-link-fivem" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white" value="${partnerLinks.fivem || ''}">
                </div>
                <div>
                    <label for="partner-link-codingCommunity" class="block text-white dark:text-white text-sm font-semibold mb-2">Coding Community Link</label>
                    <input type="url" id="partner-link-codingCommunity" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white" value="${partnerLinks.codingCommunity || ''}">
                </div>
                <div>
                    <label for="partner-link-minecraft" class="block text-white dark:text-white text-sm font-semibold mb-2">Minecraft Link</label>
                    <input type="url" id="partner-link-minecraft" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white" value="${partnerLinks.minecraft || ''}">
                </div>
                <div>
                    <label for="partner-link-website" class="block text-white dark:text-white text-sm font-semibold mb-2">Website Link</label>
                    <input type="url" id="partner-link-website" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white" value="${partnerLinks.website || ''}">
                </div>
            </div>
            <div class="flex justify-end space-x-4 mt-6">
                <button type="button" class="py-2 px-5 rounded-full bg-gray-500 text-white font-bold hover:bg-gray-600 transition duration-300 transform hover:scale-105 shadow-lg" onclick="this.closest('.fixed').remove()">
                    Cancel
                </button>
                <button type="submit" class="py-2 px-5 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                    Save Changes
                </button>
            </div>
        </form>
    `);

    modal.querySelector('#edit-partner-card-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newDescription = modal.querySelector('#partner-description').value;
        const newLinks = {};
        ['discord', 'roblox', 'fivem', 'codingCommunity', 'minecraft', 'website'].forEach(platform => {
            newLinks[platform] = modal.querySelector(`#partner-link-${platform}`).value;
        });

        try {
            await updateProfileData(partnerUser.id, {
                partnerInfo: {
                    description: newDescription,
                    links: newLinks
                }
            }, _currentUser, _userData);
            showMessageModal('Partner card updated successfully!');
            modal.remove();
            _renderPartnersPage(); // Re-render partners page to update UI
        } catch (error) {
            showMessageModal(error.message, 'error');
        }
    });
}

/**
 * Displays the modal for reviewing a partner application.
 * @param {object} application - The partner application object.
 * @param {function} refreshCallback - Function to call to refresh the applications list.
 */
export function showReviewApplicationModal(application, refreshCallback) {
    const applicationAnswersHtml = Object.entries(application.applicationAnswers || {}).map(([key, value]) => `
        <p class="text-white dark:text-white mb-2"><span class="font-semibold capitalize">${key.replace('q_', '').replace(/([A-Z])/g, ' $1').trim()}:</span> ${value}</p>
    `).join('');

    const modal = createModal('review-application-modal', `
        <h2 class="text-2xl font-extrabold text-center text-white dark:text-white mb-6">Review Application from ${application.applicantUsername}</h2>
        <div class="space-y-4 mb-6">
            <p class="text-white dark:text-white"><span class="font-semibold">Applicant:</span> ${application.applicantUsername}</p>
            <p class="text-white dark:text-white"><span class="font-semibold">Email:</span> ${application.applicantEmail}</p>
            <p class="text-white dark:text-white"><span class="font-semibold">Status:</span> <span class="capitalize">${application.status}</span></p>
            <p class="text-white dark:text-white"><span class="font-semibold">Submitted:</span> ${application.timestamp ? new Date(application.timestamp.toDate()).toLocaleString() : 'N/A'}</p>
            <div class="border-t border-b border-gray-200 dark:border-gray-700 py-4 mt-4">
                <h3 class="text-xl font-bold text-white dark:text-white mb-3">Application Answers:</h3>
                ${applicationAnswersHtml}
            </div>
            ${application.status !== 'pending' ? `
                <div class="mt-4">
                    <p class="text-white dark:text-white"><span class="font-semibold">Reviewer:</span> ${application.reviewerUsername || 'N/A'}</p>
                    <p class="text-white dark:text-white"><span class="font-semibold">Review Date:</span> ${application.reviewTimestamp ? new Date(application.reviewTimestamp.toDate()).toLocaleString() : 'N/A'}</p>
                    <p class="text-white dark:text-white"><span class="font-semibold">Notes:</span> ${application.reviewNotes || 'No notes.'}</p>
                </div>
            ` : ''}
        </div>
        ${application.status === 'pending' ? `
            <form id="review-form" class="space-y-4">
                <div>
                    <label for="review-notes" class="block text-white dark:text-white text-sm font-semibold mb-2">Review Notes (Optional)</label>
                    <textarea id="review-notes" rows="3" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white" placeholder="Add notes about your review..."></textarea>
                </div>
                <div class="flex justify-end space-x-4 mt-6">
                    <button type="button" id="reject-btn" class="py-2 px-5 rounded-full bg-red-600 text-white font-bold hover:bg-red-700 transition duration-300 transform hover:scale-105 shadow-lg">
                        Reject
                    </button>
                    <button type="button" id="approve-btn" class="py-2 px-5 rounded-full bg-green-600 text-white font-bold hover:bg-green-700 transition duration-300 transform hover:scale-105 shadow-lg">
                        Approve
                    </button>
                </div>
            </form>
        ` : `
            <div class="text-center mt-6">
                <button type="button" class="py-2 px-5 rounded-full bg-gray-500 text-white font-bold hover:bg-gray-600 transition duration-300 transform hover:scale-105 shadow-lg" onclick="this.closest('.fixed').remove()">
                    Close
                </button>
            </div>
        `}
    `);

    if (application.status === 'pending') {
        const reviewNotesInput = modal.querySelector('#review-notes');
        modal.querySelector('#approve-btn').addEventListener('click', async () => {
            try {
                await updatePartnerApplicationStatusFirestore(application.id, 'approved', reviewNotesInput.value, application.applicantId, _currentUser, _userData);
                modal.remove();
                refreshCallback();
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
        });

        modal.querySelector('#reject-btn').addEventListener('click', async () => {
            try {
                await updatePartnerApplicationStatusFirestore(application.id, 'rejected', reviewNotesInput.value, application.applicantId, _currentUser, _userData);
                modal.remove();
                refreshCallback();
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
        });
    }
}

/**
 * Displays the modal for editing the Partner TOS content.
 * @param {string} currentTOSContent - The current content of the Partner TOS.
 */
export function showEditPartnerTOSModal(currentTOSContent) {
    const modal = createModal('edit-partner-tos-modal', `
        <h2 class="text-2xl font-extrabold text-center text-white dark:text-white mb-6">Edit Partner Terms of Service</h2>
        <form id="edit-tos-form" class="space-y-4">
            <div>
                <label for="tos-content" class="block text-white dark:text-white text-sm font-semibold mb-2">Terms of Service Content (Markdown supported)</label>
                <textarea id="tos-content" rows="15" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white" required>${currentTOSContent}</textarea>
            </div>
            <div class="flex justify-end space-x-4 mt-6">
                <button type="button" class="py-2 px-5 rounded-full bg-gray-500 text-white font-bold hover:bg-gray-600 transition duration-300 transform hover:scale-105 shadow-lg" onclick="this.closest('.fixed').remove()">
                    Cancel
                </button>
                <button type="submit" class="py-2 px-5 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                    Save Changes
                </button>
            </div>
        </form>
    `);

    modal.querySelector('#edit-tos-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newContent = modal.querySelector('#tos-content').value;
        try {
            await updatePartnerTOSFirestore(newContent, _currentUser, _userData);
            modal.remove();
            _renderPartnerTOSPage(); // Re-render the TOS page to show updates
        } catch (error) {
            showMessageModal(error.message, 'error');
        }
    });
}

/**
 * Displays the modal for editing a single partner application question.
 * @param {number} index - The index of the question in the array.
 * @param {object} question - The question object to edit.
 * @param {Array<object>} allQuestions - The array of all questions (for direct modification).
 */
export function showEditQuestionModal(index, question, allQuestions) {
    const modal = createModal('edit-question-modal', `
        <h2 class="text-2xl font-extrabold text-center text-white dark:text-white mb-6">Edit Question</h2>
        <form id="edit-question-form" class="space-y-4">
            <div>
                <label for="question-label" class="block text-white dark:text-white text-sm font-semibold mb-2">Question Text</label>
                <input type="text" id="question-label" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white" value="${question.label}" required>
            </div>
            <div>
                <label for="question-type" class="block text-white dark:text-white text-sm font-semibold mb-2">Input Type</label>
                <select id="question-type" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white" required>
                    <option value="text" ${question.type === 'text' ? 'selected' : ''}>Text Input</option>
                    <option value="textarea" ${question.type === 'textarea' ? 'selected' : ''}>Text Area</option>
                    <option value="email" ${question.type === 'email' ? 'selected' : ''}>Email Input</option>
                    <option value="date" ${question.type === 'date' ? 'selected' : ''}>Date Input</option>
                </select>
            </div>
            <div class="flex items-center space-x-2">
                <input type="checkbox" id="question-required" class="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500" ${question.required ? 'checked' : ''}>
                <label for="question-required" class="text-white dark:text-white text-sm font-semibold">Required Question</label>
            </div>
            <div class="flex justify-end space-x-4 mt-6">
                <button type="button" class="py-2 px-5 rounded-full bg-gray-500 text-white font-bold hover:bg-gray-600 transition duration-300 transform hover:scale-105 shadow-lg" onclick="this.closest('.fixed').remove()">
                    Cancel
                </button>
                <button type="submit" class="py-2 px-5 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                    Save Changes
                </button>
            </div>
        </form>
    `);

    modal.querySelector('#edit-question-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newLabel = modal.querySelector('#question-label').value;
        const newType = modal.querySelector('#question-type').value;
        const newRequired = modal.querySelector('#question-required').checked;

        // Update the question directly in the passed array
        allQuestions[index].label = newLabel;
        allQuestions[index].type = newType;
        allQuestions[index].required = newRequired;

        try {
            await updatePartnerApplicationQuestionsFirestore(allQuestions, _currentUser, _userData);
            showMessageModal('Question updated successfully!');
            modal.remove();
            _renderManagePartnerQuestionsPage(); // Re-render to update UI
        } catch (error) {
            showMessageModal(error.message, 'error');
            _renderManagePartnerQuestionsPage(); // Re-render to revert if save fails
        }
    });
}

/**
 * Displays the modal for adding or editing a video.
 * @param {object} [video=null] - The video object if editing, null if adding.
 */
export function showAddEditVideoModal(video = null) {
    const isEditing = !!video;
    const modal = createModal('add-edit-video-modal', `
        <h2 class="text-2xl font-extrabold text-center text-white dark:text-white mb-6">${isEditing ? 'Edit Video' : 'Add New Video'}</h2>
        <form id="video-form" class="space-y-4">
            <div>
                <label for="video-name" class="block text-white dark:text-white text-sm font-semibold mb-2">Video Name</label>
                <input type="text" id="video-name" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white" value="${video ? video.name : ''}" required>
            </div>
            <div>
                <label for="video-description" class="block text-white dark:text-white text-sm font-semibold mb-2">Description</label>
                <textarea id="video-description" rows="5" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white" placeholder="A short description of the video...">${video ? video.description : ''}</textarea>
            </div>
            <div>
                <label for="video-icon-url" class="block text-white dark:text-white text-sm font-semibold mb-2">Icon URL (Optional)</label>
                <input type="url" id="video-icon-url" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white" placeholder="e.g., https://example.com/icon.png" value="${video ? video.iconUrl : ''}">
            </div>
            <div>
                <label for="video-thumbnail-url" class="block text-white dark:text-white text-sm font-semibold mb-2">Thumbnail URL (Optional, YouTube default if empty)</label>
                <input type="url" id="video-thumbnail-url" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white" placeholder="e.g., https://example.com/thumbnail.jpg" value="${video ? video.thumbnailUrl : ''}">
            </div>
            <div>
                <label for="video-youtube-link" class="block text-white dark:text-white text-sm font-semibold mb-2">YouTube Link</label>
                <input type="url" id="video-youtube-link" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white" placeholder="e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ" value="${video ? video.youtubeLink : ''}" required>
            </div>
            <div class="flex justify-end space-x-4 mt-6">
                <button type="button" class="py-2 px-5 rounded-full bg-gray-500 text-white font-bold hover:bg-gray-600 transition duration-300 transform hover:scale-105 shadow-lg" onclick="this.closest('.fixed').remove()">
                    Cancel
                </button>
                <button type="submit" class="py-2 px-5 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                    ${isEditing ? 'Save Changes' : 'Add Video'}
                </button>
            </div>
        </form>
    `);

    modal.querySelector('#video-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = modal.querySelector('#video-name').value;
        const description = modal.querySelector('#video-description').value;
        const iconUrl = modal.querySelector('#video-icon-url').value;
        const thumbnailUrl = modal.querySelector('#video-thumbnail-url').value;
        const youtubeLink = modal.querySelector('#video-youtube-link').value;
        const youtubeVideoId = extractYouTubeVideoId(youtubeLink);

        if (!youtubeVideoId) {
            showMessageModal("Invalid YouTube link. Please provide a valid YouTube video URL.", 'error');
            return;
        }

        try {
            if (isEditing) {
                await updateVideoFirestore(video.id, name, description, iconUrl, thumbnailUrl, youtubeLink, youtubeVideoId, _currentUser);
            } else {
                await addVideoFirestore(name, description, iconUrl, thumbnailUrl, youtubeLink, youtubeVideoId, _currentUser, _userData);
            }
            modal.remove();
            _renderManageVideosPage(); // Re-render videos management page
        } catch (error) {
            showMessageModal(error.message, 'error');
        }
    });
}
