// src/modals.js
// Contains functions for rendering specific interactive modals.

import { showMessageModal, showLoadingSpinner, hideLoadingSpinner, extractYouTubeVideoId } from './utils.js';
import {
    createPostFirestore, updatePostFirestore, deletePostFirestore,
    updateUserRoleFirestore, setUserBanStatusFirestore, deleteUserFirestore,
    updateProfileData, sendEmailToUserFirestore, updatePartnerTOSFirestore,
    fetchPartnerApplicationQuestionsFirestore, updatePartnerApplicationQuestionsFirestore,
    addVideoFirestore, updateVideoFirestore, deleteVideoFirestore
} from './firebase-service.js';

// Global state references for modals to interact with, passed from App.js
let _currentUser = null;
let _userData = null;
let _navigateTo = null;
let _renderAdminPanelPage = null; // Function to re-render admin page
let _renderForumPage = null; // Function to re-render forum page
let _renderPartnersPage = null; // Function to re-render partners page
let _renderPartnerTOSPage = null; // Function to re-render partner TOS page
let _renderManagePartnerQuestionsPage = null; // Function to re-render partner questions page
let _renderVideosPage = null; // Function to re-render videos page

/**
 * Initializes the modal module with necessary global state and functions.
 * This should be called once from App.js.
 * @param {object} currentUser - The current Firebase Auth user object.
 * @param {object} userData - The current Firestore user data.
 * @param {function} navigateTo - The main navigation function.
 * @param {function} renderAdminPanelPage - Function to re-render the admin panel.
 * @param {function} renderForumPage - Function to re-render the forum page.
 * @param {function} renderPartnersPage - Function to re-render the partners page.
 * @param {function} renderPartnerTOSPage - Function to re-render the partner TOS page.
 * @param {function} renderManagePartnerQuestionsPage - Function to re-render the manage partner questions page.
 * @param {function} renderVideosPage - Function to re-render the videos page.
 */
export function initializeModals(currentUser, userData, navigateTo, renderAdminPanelPage, renderForumPage, renderPartnersPage, renderPartnerTOSPage, renderManagePartnerQuestionsPage, renderVideosPage) {
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
 * Shows a modal for creating a new post.
 */
export function showCreatePostModal() {
    const modal = document.createElement('div');
    modal.id = 'create-post-modal';
    modal.className = 'fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-50 p-4';
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-lg backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90 border border-gray-200 dark:border-gray-700">
            <h2 class="text-2xl font-extrabold text-center text-gray-800 dark:text-gray-100 mb-6">Create New Post</h2>
            <form id="create-post-modal-form" class="space-y-4">
                <div>
                    <label for="modal-post-title" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Title</label>
                    <input type="text" id="modal-post-title" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="Enter post title" required>
                </div>
                <div>
                    <label for="modal-post-content" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Content</label>
                    <textarea id="modal-post-content" rows="7" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="Write your post content here..." required></textarea>
                </div>
                <div class="flex justify-end space-x-4 mt-6">
                    <button type="button" id="cancel-create-post-modal" class="py-2 px-5 rounded-full bg-gray-500 text-white font-bold hover:bg-gray-600 transition duration-300 transform hover:scale-105 shadow-lg">
                        Cancel
                    </button>
                    <button type="submit" class="py-2 px-5 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                        Publish
                    </button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    // Note: currentModal is a local variable in utils.js, so we don't need to assign it here.
    // The showMessageModal function already handles it.

    document.getElementById('cancel-create-post-modal').addEventListener('click', () => {
        // Since currentModal is managed by utils.js, we just remove the modal element
        // and let utils.js handle the nulling of currentModal if needed.
        modal.remove();
    });

    document.getElementById('create-post-modal-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('modal-post-title').value;
        const content = document.getElementById('modal-post-content').value;

        try {
            await createPostFirestore(title, content, _currentUser, _userData);
            modal.remove();
            if (_renderForumPage) _renderForumPage(); // Re-render forum to show new post
        } catch (error) {
            showMessageModal(error.message, 'error');
        }
    });
}

/**
 * Shows a modal for taking action on a user (Ban/Unban/Delete/Send Email/Edit Partner Card/Edit User Info).
 * @param {object} user - The user object to display and act upon.
 */
export function showTakeActionModal(user) {
    const modal = document.createElement('div');
    modal.id = 'take-action-modal';
    modal.className = 'fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-50 p-4';

    const profileIconSrc = user.profilePicUrl || `https://placehold.co/100x100/F0F0F0/000000?text=${(user.username || user.email || 'U').charAt(0).toUpperCase()}`;
    const isDisabledForSelf = user.id === _currentUser.uid ? 'disabled' : '';
    const isPartner = user.role === 'partner';
    const isAdminOrFounderOrCoFounder = _userData.role === 'admin' || _userData.role === 'founder' || _userData.role === 'co-founder';

    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl text-center max-w-md w-full relative">
            <button class="absolute top-4 right-4 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 text-2xl font-bold" id="close-take-action-modal">&times;</button>
            <h3 class="text-2xl font-extrabold text-gray-800 dark:text-gray-100 mb-6">User Actions</h3>

            <div class="flex flex-col items-center mb-6">
                <img src="${profileIconSrc}" alt="User Profile" class="w-24 h-24 rounded-full object-cover border-4 border-blue-500 shadow-md mb-3">
                <p class="text-xl font-semibold text-gray-900 dark:text-gray-100">${user.username}</p>
                <p class="text-md text-gray-600 dark:text-gray-300">${user.email}</p>
                <p class="text-md font-medium text-gray-700 dark:text-gray-200 mt-2">Role: <span class="font-bold ${user.isBanned ? 'text-red-600' : 'text-green-600'}">${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span></p>
                <p class="text-md font-medium text-gray-700 dark:text-gray-200">Status: <span class="font-bold ${user.isBanned ? 'text-red-600' : 'text-green-600'}">${user.isBanned ? 'Banned' : 'Active'}</span></p>
            </div>

            <div class="space-y-4">
                <button id="ban-user-btn" class="w-full py-3 rounded-full bg-red-600 text-white font-bold text-lg hover:bg-red-700 transition duration-300 transform hover:scale-105 shadow-lg ${user.isBanned ? 'hidden' : ''} ${isDisabledForSelf}">
                    Ban Account
                </button>
                <button id="unban-user-btn" class="w-full py-3 rounded-full bg-green-600 text-white font-bold text-lg hover:bg-green-700 transition duration-300 transform hover:scale-105 shadow-lg ${!user.isBanned ? 'hidden' : ''} ${isDisabledForSelf}">
                    Unban Account
                </button>
                <button id="send-email-btn" class="w-full py-3 rounded-full bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg ${isDisabledForSelf}">
                    Send Email
                </button>
                ${isAdminOrFounderOrCoFounder ? `
                    <button id="edit-user-info-admin-btn" class="w-full py-3 rounded-full bg-orange-600 text-white font-bold text-lg hover:bg-orange-700 transition duration-300 transform hover:scale-105 shadow-lg ${isDisabledForSelf}">
                        Edit User Info
                    </button>
                ` : ''}
                ${(isPartner && isAdminOrFounderOrCoFounder) ? `
                    <button id="edit-partner-card-admin-btn" class="w-full py-3 rounded-full bg-indigo-600 text-white font-bold text-lg hover:bg-indigo-700 transition duration-300 transform hover:scale-105 shadow-lg ${isDisabledForSelf}">
                        Edit Partner Card
                    </button>
                ` : ''}
                <button id="delete-user-btn" class="w-full py-3 rounded-full bg-gray-500 text-white font-bold text-lg hover:bg-gray-600 transition duration-300 transform hover:scale-105 shadow-lg ${isDisabledForSelf}">
                    Delete Account
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('close-take-action-modal').addEventListener('click', () => {
        modal.remove();
    });

    const banBtn = document.getElementById('ban-user-btn');
    const unbanBtn = document.getElementById('unban-user-btn');
    const sendEmailBtn = document.getElementById('send-email-btn');
    const editUserInfoAdminBtn = document.getElementById('edit-user-info-admin-btn');
    const editPartnerCardAdminBtn = document.getElementById('edit-partner-card-admin-btn');
    const deleteBtn = document.getElementById('delete-user-btn');

    if (banBtn) {
        banBtn.addEventListener('click', () => {
            showMessageModal(`Are you sure you want to BAN user "${user.username}"? They will no longer be able to log in.`, 'confirm', async () => {
                try {
                    const success = await setUserBanStatusFirestore(user.id, true, _currentUser, _userData);
                    if (success) {
                        showMessageModal(`User "${user.username}" has been banned.`);
                        modal.remove();
                        if (_renderAdminPanelPage) _renderAdminPanelPage();
                    }
                } catch (error) {
                    showMessageModal(error.message, 'error');
                }
            });
        });
    }

    if (unbanBtn) {
        unbanBtn.addEventListener('click', () => {
            showMessageModal(`Are you sure you want to UNBAN user "${user.username}"? They will regain login access.`, 'confirm', async () => {
                try {
                    const success = await setUserBanStatusFirestore(user.id, false, _currentUser, _userData);
                    if (success) {
                        showMessageModal(`User "${user.username}" has been unbanned.`);
                        modal.remove();
                        if (_renderAdminPanelPage) _renderAdminPanelPage();
                    }
                } catch (error) {
                    showMessageModal(error.message, 'error');
                }
            });
        });
    }

    if (sendEmailBtn) {
        sendEmailBtn.addEventListener('click', () => {
            modal.remove();
            if (_navigateTo) _navigateTo('send-email', user.id);
        });
    }

    if (editUserInfoAdminBtn) {
        editUserInfoAdminBtn.addEventListener('click', () => {
            modal.remove();
            showEditUserInfoModal(user);
        });
    }

    if (editPartnerCardAdminBtn) {
        editPartnerCardAdminBtn.addEventListener('click', () => {
            modal.remove();
            showEditPartnerCardModal(user);
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            showMessageModal(`Are you sure you want to DELETE user "${user.username}"? This action cannot be undone and will only remove their data from Firestore.`, 'confirm', async () => {
                try {
                    const success = await deleteUserFirestore(user.id, _currentUser, _userData);
                    if (success) {
                        showMessageModal(`User "${user.username}" data deleted successfully!`);
                        modal.remove();
                        if (_renderAdminPanelPage) _renderAdminPanelPage();
                    }
                } catch (error) {
                    showMessageModal(error.message, 'error');
                }
            });
        });
    }
}

/**
 * Shows a modal for admins/founders/co-founders to edit a user's basic info.
 * @param {object} userToEdit - The user object whose info is being edited.
 */
export function showEditUserInfoModal(userToEdit) {
    const modal = document.createElement('div');
    modal.id = 'edit-user-info-modal';
    modal.className = 'fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-50 p-4';

    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-lg backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90 border border-gray-200 dark:border-gray-700 relative">
            <button class="absolute top-4 right-4 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 text-2xl font-bold" id="close-edit-user-info-modal">&times;</button>
            <h2 class="text-2xl font-extrabold text-center text-gray-800 dark:text-gray-100 mb-6">Edit User Info: ${userToEdit.username}</h2>
            <form id="edit-user-info-form" class="space-y-4">
                <div>
                    <label for="edit-user-username" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Username</label>
                    <input type="text" id="edit-user-username" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" value="${userToEdit.username || ''}" required>
                </div>
                <div>
                    <label for="edit-user-email" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Email</label>
                    <input type="email" id="edit-user-email" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" value="${userToEdit.email || ''}" required>
                </div>
                <div>
                    <label for="edit-user-profile-pic-url" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Profile Picture URL</label>
                    <input type="url" id="edit-user-profile-pic-url" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="e.g., https://example.com/image.jpg" value="${userToEdit.profilePicUrl || ''}">
                </div>
                <div>
                    <label for="edit-user-background-url" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Background URL (or Tailwind Class)</label>
                    <input type="text" id="edit-user-background-url" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="e.g., bg-red-500 or https://example.com/bg.gif" value="${userToEdit.backgroundUrl || ''}">
                </div>
                <div class="flex justify-end space-x-4 mt-6">
                    <button type="button" id="cancel-edit-user-info-modal" class="py-2 px-5 rounded-full bg-gray-500 text-white font-bold hover:bg-gray-600 transition duration-300 transform hover:scale-105 shadow-lg">
                        Cancel
                    </button>
                    <button type="submit" class="py-2 px-5 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('close-edit-user-info-modal').addEventListener('click', () => {
        modal.remove();
        if (_renderAdminPanelPage) _renderAdminPanelPage();
    });
    document.getElementById('cancel-edit-user-info-modal').addEventListener('click', () => {
        modal.remove();
        if (_renderAdminPanelPage) _renderAdminPanelPage();
    });

    document.getElementById('edit-user-info-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newUsername = document.getElementById('edit-user-username').value.trim();
        const newEmail = document.getElementById('edit-user-email').value.trim();
        const newProfilePicUrl = document.getElementById('edit-user-profile-pic-url').value.trim();
        const newBackgroundUrl = document.getElementById('edit-user-background-url').value.trim();

        try {
            await updateProfileData(userToEdit.id, {
                username: newUsername,
                email: newEmail,
                profilePicUrl: newProfilePicUrl,
                backgroundUrl: newBackgroundUrl
            }, _currentUser, _userData);
            showMessageModal('User info updated successfully!');
            modal.remove();
            if (_renderAdminPanelPage) _renderAdminPanelPage();
        } catch (error) {
            showMessageModal(error.message, 'error');
        }
    });
}

/**
 * Shows a modal for editing a partner's card information (description and links).
 * @param {object} partnerUser - The user object (who has the 'partner' role) to edit.
 */
export function showEditPartnerCardModal(partnerUser) {
    const modal = document.createElement('div');
    modal.id = 'edit-partner-card-modal';
    modal.className = 'fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-50 p-4';

    const currentPartnerInfo = partnerUser.partnerInfo || { description: '', links: {} };

    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-lg backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90 border border-gray-200 dark:border-gray-700 relative">
            <button class="absolute top-4 right-4 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 text-2xl font-bold" id="close-edit-partner-card-modal">&times;</button>
            <h2 class="text-2xl font-extrabold text-center text-gray-800 dark:text-gray-100 mb-6">Edit Partner Card for ${partnerUser.username}</h2>
            <form id="edit-partner-card-form" class="space-y-4">
                <div>
                    <label for="modal-partner-description" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Partner Description</label>
                    <textarea id="modal-partner-description" rows="5" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="A short description for their partner card...">${currentPartnerInfo.description || ''}</textarea>
                </div>

                <div class="space-y-3">
                    <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100">Partner Links</h3>
                    ${['discord', 'roblox', 'fivem', 'codingCommunity', 'minecraft', 'website'].map(platform => `
                        <div>
                            <label for="modal-partner-link-${platform}" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2 capitalize">${platform.replace(/([A-Z])/g, ' $1').trim()} Link</label>
                            <input type="url" id="modal-partner-link-${platform}" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="Enter URL for ${platform} profile/community" value="${currentPartnerInfo.links[platform] || ''}">
                        </div>
                    `).join('')}
                </div>

                <div class="flex justify-end space-x-4 mt-6">
                    <button type="button" id="cancel-edit-partner-card-modal" class="py-2 px-5 rounded-full bg-gray-500 text-white font-bold hover:bg-gray-600 transition duration-300 transform hover:scale-105 shadow-lg">
                        Cancel
                    </button>
                    <button type="submit" class="py-2 px-5 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('close-edit-partner-card-modal').addEventListener('click', () => {
        modal.remove();
        if (_navigateTo) _navigateTo('partners');
    });
    document.getElementById('cancel-edit-partner-card-modal').addEventListener('click', () => {
        modal.remove();
        if (_navigateTo) _navigateTo('partners');
    });

    document.getElementById('edit-partner-card-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newDescription = document.getElementById('modal-partner-description').value;
        const newLinks = {};
        ['discord', 'roblox', 'fivem', 'codingCommunity', 'minecraft', 'website'].forEach(platform => {
            newLinks[platform] = document.getElementById(`modal-partner-link-${platform}`).value;
        });

        showLoadingSpinner();
        try {
            await updateProfileData(partnerUser.id, {
                partnerInfo: {
                    description: newDescription,
                    links: newLinks
                }
            }, _currentUser, _userData);
            showMessageModal('Partner card updated successfully!');
            modal.remove();
            if (_renderPartnersPage) _renderPartnersPage();
        } catch (error) {
            showMessageModal("Failed to update partner card: " + error.message, 'error');
        } finally {
            hideLoadingSpinner();
        }
    });
}

/**
 * Shows a modal for reviewing a partner application.
 * @param {object} application - The application object to review.
 */
export async function showReviewApplicationModal(application) {
    const modal = document.createElement('div');
    modal.id = 'review-application-modal';
    modal.className = 'fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-50 p-4';

    let questions = [];
    try {
        questions = await fetchPartnerApplicationQuestionsFirestore();
    } catch (error) {
        console.error("Error fetching questions for review modal:", error.message);
        questions = [];
    }

    const applicationAnswers = application.applicationAnswers || {};

    const answersHtml = questions.map(q => {
        const answer = applicationAnswers[q.id] || 'No answer provided.';
        return `
            <p><span class="font-semibold">${q.label}:</span></p>
            <p class="bg-gray-100 dark:bg-gray-700 p-3 rounded-md whitespace-pre-wrap">${answer}</p>
        `;
    }).join('');


    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-lg backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90 border border-gray-200 dark:border-gray-700 relative">
            <button class="absolute top-4 right-4 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 text-2xl font-bold" id="close-review-application-modal">&times;</button>
            <h2 class="text-2xl font-extrabold text-center text-gray-800 dark:text-gray-100 mb-6">Review Partner Application</h2>

            <div class="space-y-4 text-gray-800 dark:text-gray-200 text-left mb-6">
                <p><span class="font-semibold">Applicant:</span> ${application.applicantUsername} (${application.applicantEmail})</p>
                <p><span class="font-semibold">Status:</span> <span class="capitalize ${application.status === 'pending' ? 'text-yellow-600' : (application.status === 'approved' ? 'text-green-600' : 'text-red-600')}">${application.status}</span></p>
                <p><span class="font-semibold">Submitted:</span> ${application.timestamp ? (typeof application.timestamp === 'string' ? new Date(application.timestamp).toLocaleString() : application.timestamp.toDate().toLocaleString()) : 'N/A'}</p>
                <hr class="border-gray-200 dark:border-gray-600">
                ${answersHtml}
                ${application.reviewNotes ? `
                    <p><span class="font-semibold">Review Notes:</span></p>
                    <p class="bg-gray-100 dark:bg-gray-700 p-3 rounded-md whitespace-pre-wrap">${application.reviewNotes}</p>
                ` : ''}
                ${application.reviewedBy ? `
                    <p class="text-sm text-gray-500 dark:text-gray-400">Reviewed by: ${application.reviewedByUsername || application.reviewedBy} on ${application.reviewTimestamp ? (typeof application.reviewTimestamp === 'string' ? new Date(application.reviewTimestamp).toLocaleString() : application.reviewTimestamp.toDate().toLocaleString()) : 'N/A'}</p>
                ` : ''}
            </div>

            ${application.status === 'pending' ? `
                <div class="mt-6">
                    <label for="review-notes" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Add Review Notes (optional)</label>
                    <textarea id="review-notes" rows="3" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="Add notes for this application..."></textarea>
                </div>
                <div class="flex justify-end space-x-4 mt-6">
                    <button type="button" id="reject-application-btn" class="py-2 px-5 rounded-full bg-red-600 text-white font-bold hover:bg-red-700 transition duration-300 transform hover:scale-105 shadow-lg">
                        Reject
                    </button>
                    <button type="button" id="approve-application-btn" class="py-2 px-5 rounded-full bg-green-600 text-white font-bold hover:bg-green-700 transition duration-300 transform hover:scale-105 shadow-lg">
                        Approve
                    </button>
                </div>
            ` : `
                <div class="text-center mt-6">
                    <p class="text-lg font-semibold text-gray-700 dark:text-gray-200">This application has already been ${application.status}.</p>
                </div>
            `}
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('close-review-application-modal').addEventListener('click', () => {
        modal.remove();
        if (_renderPartnerApplicationsAdminPage) _renderPartnerApplicationsAdminPage();
    });

    if (application.status === 'pending') {
        const reviewNotesInput = document.getElementById('review-notes');
        document.getElementById('approve-application-btn').addEventListener('click', async () => {
            const notes = reviewNotesInput.value;
            showMessageModal(`Are you sure you want to APPROVE this application and make ${application.applicantUsername} a partner?`, 'confirm', async () => {
                try {
                    await updatePartnerApplicationStatusFirestore(application.id, 'approved', notes, application.applicantId, _currentUser, _userData);
                    modal.remove();
                    if (_renderPartnerApplicationsAdminPage) _renderPartnerApplicationsAdminPage();
                } catch (error) {
                    showMessageModal(error.message, 'error');
                }
            });
        });

        document.getElementById('reject-application-btn').addEventListener('click', async () => {
            const notes = reviewNotesInput.value;
            showMessageModal(`Are you sure you want to REJECT this application?`, 'confirm', async () => {
                try {
                    await updatePartnerApplicationStatusFirestore(application.id, 'rejected', notes, application.applicantId, _currentUser, _userData);
                    modal.remove();
                    if (_renderPartnerApplicationsAdminPage) _renderPartnerApplicationsAdminPage();
                } catch (error) {
                    showMessageModal(error.message, 'error');
                }
            });
        });
    }
}

/**
 * Shows a modal for editing an existing partner application question.
 * @param {number} index - The index of the question in the currentQuestions array.
 * @param {object} question - The question object to edit.
 * @param {Array<object>} currentQuestions - The current list of questions (mutable).
 */
export function showEditQuestionModal(index, question, currentQuestions) {
    const modal = document.createElement('div');
    modal.id = 'edit-question-modal';
    modal.className = 'fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-50 p-4';

    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-lg backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90 border border-gray-200 dark:border-gray-700 relative">
            <button class="absolute top-4 right-4 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 text-2xl font-bold" id="close-edit-question-modal">&times;</button>
            <h2 class="text-2xl font-extrabold text-center text-gray-800 dark:text-gray-100 mb-6">Edit Question</h2>
            <form id="edit-question-form" class="space-y-4">
                <div>
                    <label for="edit-question-label" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Question Label</label>
                    <input type="text" id="edit-question-label" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" value="${question.label}" required>
                </div>
                <div>
                    <label for="edit-question-type" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Question Type</label>
                    <select id="edit-question-type" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" required>
                        <option value="text" ${question.type === 'text' ? 'selected' : ''}>Text Input</option>
                        <option value="textarea" ${question.type === 'textarea' ? 'selected' : ''}>Long Text Area</option>
                        <option value="email" ${question.type === 'email' ? 'selected' : ''}>Email Input</option>
                        <option value="date" ${question.type === 'date' ? 'selected' : ''}>Date Input</option>
                    </select>
                </div>
                <div class="flex items-center space-x-2">
                    <input type="checkbox" id="edit-question-required" class="form-checkbox h-5 w-5 text-blue-600 rounded" ${question.required ? 'checked' : ''}>
                    <label for="edit-question-required" class="text-gray-700 dark:text-gray-300 text-sm font-semibold">Required Question</label>
                </div>
                <div class="flex justify-end space-x-4 mt-6">
                    <button type="button" id="cancel-edit-question-modal" class="py-2 px-5 rounded-full bg-gray-500 text-white font-bold hover:bg-gray-600 transition duration-300 transform hover:scale-105 shadow-lg">
                        Cancel
                    </button>
                    <button type="submit" class="py-2 px-5 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('close-edit-question-modal').addEventListener('click', () => {
        modal.remove();
        if (_renderManagePartnerQuestionsPage) _renderManagePartnerQuestionsPage();
    });
    document.getElementById('cancel-edit-question-modal').addEventListener('click', () => {
        modal.remove();
        if (_renderManagePartnerQuestionsPage) _renderManagePartnerQuestionsPage();
    });

    document.getElementById('edit-question-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newLabel = document.getElementById('edit-question-label').value.trim();
        const newType = document.getElementById('edit-question-type').value;
        const newRequired = document.getElementById('edit-question-required').checked;

        if (!newLabel) {
            showMessageModal("Question label cannot be empty.", 'error');
            return;
        }

        currentQuestions[index] = {
            id: question.id,
            label: newLabel,
            type: newType,
            required: newRequired
        };

        try {
            await updatePartnerApplicationQuestionsFirestore(currentQuestions, _currentUser, _userData);
            modal.remove();
            if (_renderManagePartnerQuestionsPage) _renderManagePartnerQuestionsPage();
        } catch (error) {
            showMessageModal(error.message, 'error');
            if (_renderManagePartnerQuestionsPage) _renderManagePartnerQuestionsPage();
        }
    });
}

/**
 * Shows a modal for adding or editing a video.
 * @param {object} [videoToEdit=null] - The video object to edit, or null for adding a new video.
 */
export function showAddEditVideoModal(videoToEdit = null) {
    const modal = document.createElement('div');
    modal.id = 'add-edit-video-modal';
    modal.className = 'fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-50 p-4';

    const isEditing = videoToEdit !== null;
    const modalTitle = isEditing ? 'Edit Video' : 'Add New Video';
    const submitButtonText = isEditing ? 'Save Changes' : 'Add Video';

    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-lg backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90 border border-gray-200 dark:border-gray-700 relative">
            <button class="absolute top-4 right-4 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 text-2xl font-bold" id="close-add-edit-video-modal">&times;</button>
            <h2 class="text-2xl font-extrabold text-center text-gray-800 dark:text-gray-100 mb-6">${modalTitle}</h2>
            <form id="add-edit-video-form" class="space-y-4">
                <div>
                    <label for="video-name" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Video Name</label>
                    <input type="text" id="video-name" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="Enter video name" value="${videoToEdit?.name || ''}" required>
                </div>
                <div>
                    <label for="video-description" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Description</label>
                    <textarea id="video-description" rows="4" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="Enter video description">${videoToEdit?.description || ''}</textarea>
                </div>
                <div>
                    <label for="video-icon-url" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Icon URL (Optional)</label>
                    <input type="url" id="video-icon-url" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="e.g., https://example.com/icon.png" value="${videoToEdit?.iconUrl || ''}">
                </div>
                <div>
                    <label for="video-thumbnail-url" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Thumbnail URL (Optional)</label>
                    <input type="url" id="video-thumbnail-url" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="e.g., https://example.com/thumbnail.jpg" value="${videoToEdit?.thumbnailUrl || ''}">
                </div>
                <div>
                    <label for="youtube-link" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">YouTube Link</label>
                    <input type="url" id="youtube-link" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="e.g., https://www.youtube.com/watch?v=VIDEO_ID" value="${videoToEdit?.youtubeLink || ''}" required>
                </div>
                <div class="flex justify-end space-x-4 mt-6">
                    <button type="button" id="cancel-add-edit-video-modal" class="py-2 px-5 rounded-full bg-gray-500 text-white font-bold hover:bg-gray-600 transition duration-300 transform hover:scale-105 shadow-lg">
                        Cancel
                    </button>
                    <button type="submit" class="py-2 px-5 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                        ${submitButtonText}
                    </button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('close-add-edit-video-modal').addEventListener('click', () => {
        modal.remove();
    });
    document.getElementById('cancel-add-edit-video-modal').addEventListener('click', () => {
        modal.remove();
    });

    document.getElementById('add-edit-video-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('video-name').value.trim();
        const description = document.getElementById('video-description').value.trim();
        const iconUrl = document.getElementById('video-icon-url').value.trim();
        const thumbnailUrl = document.getElementById('video-thumbnail-url').value.trim();
        const youtubeLink = document.getElementById('youtube-link').value.trim();
        const youtubeVideoId = extractYouTubeVideoId(youtubeLink);

        if (!youtubeVideoId) {
            showMessageModal("Invalid YouTube link. Please provide a valid YouTube video URL.", 'error');
            return;
        }

        try {
            if (isEditing) {
                await updateVideoFirestore(videoToEdit.id, name, description, iconUrl, thumbnailUrl, youtubeLink, youtubeVideoId, _currentUser);
            } else {
                await addVideoFirestore(name, description, iconUrl, thumbnailUrl, youtubeLink, youtubeVideoId, _currentUser, _userData);
            }
            modal.remove();
            if (_renderVideosPage) _renderVideosPage();
        } catch (error) {
            showMessageModal(error.message, 'error');
        }
    });
}

/**
 * Shows a modal for editing the Partner TOS content.
 * @param {string} currentContent - The current TOS content.
 */
export function showEditPartnerTOSModal(currentContent) {
    const modal = document.createElement('div');
    modal.id = 'edit-tos-modal';
    modal.className = 'fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-50 p-4';

    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-lg backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90 border border-gray-200 dark:border-gray-700 relative">
            <button class="absolute top-4 right-4 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 text-2xl font-bold" id="close-edit-tos-modal">&times;</button>
            <h2 class="text-2xl font-extrabold text-center text-gray-800 dark:text-gray-100 mb-6">Edit Partner Terms of Service</h2>
            <form id="edit-tos-form" class="space-y-4">
                <div>
                    <label for="modal-tos-content" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Terms of Service Content</label>
                    <textarea id="modal-tos-content" rows="15" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" required>${currentContent}</textarea>
                </div>
                <div class="flex justify-end space-x-4 mt-6">
                    <button type="button" id="cancel-edit-tos-modal" class="py-2 px-5 rounded-full bg-gray-500 text-white font-bold hover:bg-gray-600 transition duration-300 transform hover:scale-105 shadow-lg">
                        Cancel
                    </button>
                    <button type="submit" class="py-2 px-5 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                        Save Rules
                    </button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('close-edit-tos-modal').addEventListener('click', () => {
        modal.remove();
        if (_renderPartnerTOSPage) _renderPartnerTOSPage();
    });
    document.getElementById('cancel-edit-tos-modal').addEventListener('click', () => {
        modal.remove();
        if (_renderPartnerTOSPage) _renderPartnerTOSPage();
    });

    document.getElementById('edit-tos-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newContent = document.getElementById('modal-tos-content').value;
        try {
            await updatePartnerTOSFirestore(newContent, _currentUser, _userData);
            modal.remove();
            if (_renderPartnerTOSPage) _renderPartnerTOSPage();
        } catch (error) {
            showMessageModal(error.message, 'error');
        }
    });
}
