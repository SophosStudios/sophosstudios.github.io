// src/modals.js
// This file contains functions for rendering and managing various application modals.

import { showMessageModal, extractYouTubeVideoId } from './utils.js';
import {
    createPostFirestore, updateProfileData, setUserBanStatusFirestore,
    deleteUserFirestore, updatePartnerApplicationStatusFirestore, updatePartnerApplicationQuestionsFirestore,
    updatePartnerTOSFirestore, addVideoFirestore, updateVideoFirestore,
    submitCodeSnippet, updateCodeSubmissionStatus
} from './firebase-service.js'; // Import Firebase service functions

// Global variables from App.js that modals need access to
let _currentUser = null;
let _userData = null;
let _currentPartnerQuestions = []; // Cached questions for editing
let _navigateToCallback = null; // Callback to navigate function in App.js
let _refreshAdminPageCallback = null;
let _refreshForumPageCallback = null;
let _refreshPartnersPageCallback = null;
let _refreshPartnerTOSPageCallback = null;
let _refreshManagePartnerQuestionsPageCallback = null;
let _refreshVideosPageCallback = null;
let _refreshApprovedCodePageCallback = null;
let _refreshReviewCodeSubmissionsPageCallback = null;


/**
 * Initializes the modals module with necessary global state and functions.
 * This should be called once from App.js.
 * @param {object} currentUser - The current Firebase Auth user object.
 * @param {object} userData - The current Firestore user data.
 * @param {function} navigateTo - The main navigation function from App.js.
 * @param {function} refreshAdminPage - Callback to refresh admin page.
 * @param {function} refreshForumPage - Callback to refresh forum page.
 * @param {function} refreshPartnersPage - Callback to refresh partners page.
 * @param {function} refreshPartnerTOSPage - Callback to refresh partner TOS page.
 * @param {function} refreshManagePartnerQuestionsPage - Callback to refresh manage partner questions page.
 * @param {function} refreshVideosPage - Callback to refresh videos page.
 * @param {function} refreshApprovedCodePage - Callback to refresh approved code page.
 * @param {function} refreshReviewCodeSubmissionsPage - Callback to refresh review code submissions page.
 */
export function initializeModals(
    currentUser, userData, navigateTo,
    refreshAdminPage, refreshForumPage, refreshPartnersPage, refreshPartnerTOSPage,
    refreshManagePartnerQuestionsPage, refreshVideosPage, refreshApprovedCodePage, refreshReviewCodeSubmissionsPage
) {
    _currentUser = currentUser;
    _userData = userData;
    _navigateToCallback = navigateTo;
    _refreshAdminPageCallback = refreshAdminPage;
    _refreshForumPageCallback = refreshForumPage;
    _refreshPartnersPageCallback = refreshPartnersPage;
    _refreshPartnerTOSPageCallback = refreshPartnerTOSPage;
    _refreshManagePartnerQuestionsPageCallback = refreshManagePartnerQuestionsPage;
    _refreshVideosPageCallback = refreshVideosPage;
    _refreshApprovedCodePageCallback = refreshApprovedCodePage;
    _refreshReviewCodeSubmissionsPageCallback = refreshReviewCodeSubmissionsPage;
}

/**
 * Updates the global state references in the modals module.
 * Call this whenever currentUser or userData changes in App.js.
 * @param {object} currentUser - The current Firebase Auth user object.
 * @param {object} userData - The current Firestore user data.
 * @param {Array<object>} [currentPartnerQuestions=[]] - The current list of partner questions (optional, for specific modals).
 */
export function updateModalState(currentUser, userData, currentPartnerQuestions = []) {
    _currentUser = currentUser;
    _userData = userData;
    _currentPartnerQuestions = currentPartnerQuestions;
}

/**
 * Renders a generic modal with a given title and content.
 * @param {string} title - The modal title.
 * @param {string} contentHtml - The HTML content for the modal body.
 * @param {function} [onCloseCallback=null] - Function to call when modal is closed.
 */
export function renderGenericModal(title, contentHtml, onCloseCallback = null) {
    const mainModalsContainer = document.getElementById('main-modals-container');
    if (!mainModalsContainer) {
        console.error("Main modals container not found.");
        return;
    }

    mainModalsContainer.innerHTML = `
        <div class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-auto p-6 relative backdrop-blur-sm bg-opacity-90 dark:bg-opacity-90 border border-gray-200 dark:border-gray-700">
                <button class="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-2xl" id="close-modal-btn">
                    <i class="fas fa-times"></i>
                </button>
                <h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6 text-center">${title}</h3>
                <div id="modal-content-body">
                    ${contentHtml}
                </div>
            </div>
        </div>
    `;
    mainModalsContainer.classList.remove('hidden');

    const closeModalBtn = mainModalsContainer.querySelector('#close-modal-btn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            mainModalsContainer.classList.add('hidden');
            mainModalsContainer.innerHTML = ''; // Clear content
            if (onCloseCallback) {
                onCloseCallback();
            }
        });
    }
}

/**
 * Shows the Create Post modal.
 */
export function showCreatePostModal() {
    const contentHtml = `
        <form id="create-post-form" class="space-y-4">
            <div>
                <label for="post-title" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Title</label>
                <input type="text" id="post-title" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" required>
            </div>
            <div>
                <label for="post-content" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Content</label>
                <textarea id="post-content" rows="8" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" required></textarea>
            </div>
            <div class="flex justify-end space-x-4 mt-6">
                <button type="button" id="cancel-create-post-btn" class="py-2 px-5 rounded-full bg-gray-500 text-white font-bold hover:bg-gray-600 transition duration-300 transform hover:scale-105 shadow-lg">
                    Cancel
                </button>
                <button type="submit" class="py-2 px-5 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                    Create Post
                </button>
            </div>
        </form>
    `;
    renderGenericModal('Create New Post', contentHtml, () => _refreshForumPageCallback());

    document.getElementById('create-post-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('post-title').value;
        const content = document.getElementById('post-content').value;
        try {
            await createPostFirestore(title, content, _currentUser, _userData);
            document.getElementById('main-modals-container').classList.add('hidden');
            _refreshForumPageCallback(); // Re-render forum after creation
        } catch (error) {
            showMessageModal(error.message, 'error');
        }
    });
    document.getElementById('cancel-create-post-btn').addEventListener('click', () => {
        document.getElementById('main-modals-container').classList.add('hidden');
    });
}

/**
 * Shows the Take Action modal for a specific user (admin panel).
 * @param {object} user - The user object to take action on.
 */
export function showTakeActionModal(user) {
    const contentHtml = `
        <div class="space-y-4 text-center">
            <p class="text-gray-700 dark:text-gray-300 text-lg">Actions for <span class="font-semibold">${user.username}</span>:</p>
            <button id="send-email-user-btn" class="w-full py-2 px-4 rounded-full bg-blue-500 text-white font-bold hover:bg-blue-600 transition duration-300 transform hover:scale-105 shadow-md">
                Send Email
            </button>
            <button id="ban-user-btn" class="w-full py-2 px-4 rounded-full ${user.isBanned ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white font-bold transition duration-300 transform hover:scale-105 shadow-md">
                ${user.isBanned ? 'Unban User' : 'Ban User'}
            </button>
            <button id="delete-user-btn" class="w-full py-2 px-4 rounded-full bg-gray-500 text-white font-bold hover:bg-gray-600 transition duration-300 transform hover:scale-105 shadow-md">
                Delete User Data
            </button>
        </div>
    `;
    renderGenericModal('User Actions', contentHtml);

    document.getElementById('send-email-user-btn').addEventListener('click', () => {
        document.getElementById('main-modals-container').classList.add('hidden');
        if (_navigateToCallback) {
            _navigateToCallback('send-email', user.id);
        }
    });

    document.getElementById('ban-user-btn').addEventListener('click', async () => {
        const newBanStatus = !user.isBanned;
        showMessageModal(`Are you sure you want to ${newBanStatus ? 'ban' : 'unban'} ${user.username}?`, 'confirm', async () => {
            try {
                await setUserBanStatusFirestore(user.id, newBanStatus, _userData);
                document.getElementById('main-modals-container').classList.add('hidden');
                showMessageModal(`${user.username} has been ${newBanStatus ? 'banned' : 'unbanned'}.`);
                _refreshAdminPageCallback(); // Re-render admin panel
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
        });
    });

    document.getElementById('delete-user-btn').addEventListener('click', async () => {
        showMessageModal(`Are you sure you want to delete all data for ${user.username}? This action is irreversible.`, 'confirm', async () => {
            try {
                await deleteUserFirestore(user.id, _userData);
                document.getElementById('main-modals-container').classList.add('hidden');
                showMessageModal(`Data for ${user.username} has been deleted.`);
                _refreshAdminPageCallback(); // Re-render admin panel
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
        });
    });
}

/**
 * Shows the Edit Partner Card modal for a specific partner.
 * @param {object} partnerUser - The partner user object whose card is being edited.
 */
export function showEditPartnerCardModal(partnerUser) {
    const partnerLinks = partnerUser.partnerInfo?.links || {};
    const contentHtml = `
        <form id="edit-partner-card-form" class="space-y-4">
            <div>
                <label for="partner-description-modal" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Partner Description</label>
                <textarea id="partner-description-modal" rows="4" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="A short description for the partner card...">${partnerUser.partnerInfo?.description || ''}</textarea>
            </div>
            <h4 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mt-4">Partner Links</h4>
            ${['discord', 'roblox', 'fivem', 'codingCommunity', 'minecraft', 'website'].map(platform => `
                <div>
                    <label for="partner-link-modal-${platform}" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2 capitalize">${platform.replace(/([A-Z])/g, ' $1').trim()} Link</label>
                    <input type="url" id="partner-link-modal-${platform}" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="Enter URL for ${platform} profile/community" value="${partnerLinks[platform] || ''}">
                </div>
            `).join('')}
            <div class="flex justify-end space-x-4 mt-6">
                <button type="button" id="cancel-edit-partner-card-btn" class="py-2 px-5 rounded-full bg-gray-500 text-white font-bold hover:bg-gray-600 transition duration-300 transform hover:scale-105 shadow-lg">
                    Cancel
                </button>
                <button type="submit" class="py-2 px-5 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                    Save Changes
                </button>
            </div>
        </form>
    `;
    renderGenericModal(`Edit Partner Card for ${partnerUser.username}`, contentHtml, () => _refreshPartnersPageCallback());

    const editPartnerCardForm = document.getElementById('edit-partner-card-form');
    const partnerDescriptionInput = document.getElementById('partner-description-modal');
    const partnerLinkInputs = {};
    ['discord', 'roblox', 'fivem', 'codingCommunity', 'minecraft', 'website'].forEach(platform => {
        partnerLinkInputs[platform] = document.getElementById(`partner-link-modal-${platform}`);
    });

    editPartnerCardForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newDescription = partnerDescriptionInput.value;
        const newLinks = {};
        ['discord', 'roblox', 'fivem', 'codingCommunity', 'minecraft', 'website'].forEach(platform => {
            newLinks[platform] = partnerLinkInputs[platform].value;
        });

        const updatedPartnerInfo = {
            description: newDescription,
            links: newLinks
        };

        try {
            await updateProfileData(partnerUser.id, { partnerInfo: updatedPartnerInfo });
            document.getElementById('main-modals-container').classList.add('hidden');
            showMessageModal('Partner card updated successfully!');
            _refreshPartnersPageCallback(); // Re-render partners page
        } catch (error) {
            showMessageModal(error.message, 'error');
        }
    });

    document.getElementById('cancel-edit-partner-card-btn').addEventListener('click', () => {
        document.getElementById('main-modals-container').classList.add('hidden');
    });
}

/**
 * Shows the Review Application modal for a specific partner application.
 * @param {object} application - The application object to review.
 */
export function showReviewApplicationModal(application) {
    const answersHtml = Object.keys(application)
        .filter(key => !['id', 'applicantId', 'applicantUsername', 'applicantEmail', 'status', 'timestamp', 'reviewedBy', 'reviewedAt'].includes(key))
        .map(key => `
            <div class="mb-3">
                <p class="font-semibold text-gray-800 dark:text-gray-100 capitalize">${key.replace(/([A-Z])/g, ' $1').trim()}:</p>
                <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">${application[key]}</p>
            </div>
        `).join('');

    const contentHtml = `
        <div class="space-y-4">
            <p class="text-gray-700 dark:text-gray-300">Applicant: <span class="font-semibold">${application.applicantUsername} (${application.applicantEmail})</span></p>
            <p class="text-gray-700 dark:text-gray-300">Status: <span class="font-semibold capitalize">${application.status}</span></p>
            <p class="text-gray-700 dark:text-gray-300">Submitted: <span class="font-semibold">${application.timestamp}</span></p>

            <h4 class="text-xl font-bold text-gray-800 dark:text-gray-100 mt-6 mb-4">Application Answers:</h4>
            <div class="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                ${answersHtml || '<p class="text-gray-600 dark:text-gray-400">No answers provided.</p>'}
            </div>

            <div class="flex justify-center space-x-4 mt-6">
                ${application.status === 'pending' ? `
                    <button id="approve-application-btn" class="py-2 px-5 rounded-full bg-green-600 text-white font-bold hover:bg-green-700 transition duration-300 transform hover:scale-105 shadow-lg">
                        Approve
                    </button>
                    <button id="deny-application-btn" class="py-2 px-5 rounded-full bg-red-600 text-white font-bold hover:bg-red-700 transition duration-300 transform hover:scale-105 shadow-lg">
                        Deny
                    </button>
                ` : `
                    <p class="text-gray-600 dark:text-gray-400">Application already ${application.status}.</p>
                `}
            </div>
        </div>
    `;
    renderGenericModal('Review Partner Application', contentHtml);

    if (application.status === 'pending') {
        document.getElementById('approve-application-btn').addEventListener('click', async () => {
            try {
                await updatePartnerApplicationStatusFirestore(application.id, 'approved', _currentUser, _userData);
                document.getElementById('main-modals-container').classList.add('hidden');
                _refreshAdminPageCallback(); // Refresh the list
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
        });

        document.getElementById('deny-application-btn').addEventListener('click', async () => {
            try {
                await updatePartnerApplicationStatusFirestore(application.id, 'denied', _currentUser, _userData);
                document.getElementById('main-modals-container').classList.add('hidden');
                _refreshAdminPageCallback(); // Refresh the list
            } catch (error)
            {
                showMessageModal(error.message, 'error');
            }
        });
    }
}

/**
 * Shows the Edit Question modal for a specific partner application question.
 * @param {number} index - The index of the question in the `_currentPartnerQuestions` array.
 * @param {object} question - The question object to edit.
 */
export function showEditQuestionModal(index, question) {
    const contentHtml = `
        <form id="edit-question-form" class="space-y-4">
            <div>
                <label for="question-label" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Question Text</label>
                <input type="text" id="question-label" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" value="${question.label}" required>
            </div>
            <div>
                <label for="question-type" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Input Type</label>
                <select id="question-type" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100">
                    <option value="text" ${question.type === 'text' ? 'selected' : ''}>Text Input</option>
                    <option value="textarea" ${question.type === 'textarea' ? 'selected' : ''}>Text Area</option>
                    <option value="email" ${question.type === 'email' ? 'selected' : ''}>Email Input</option>
                    <option value="url" ${question.type === 'url' ? 'selected' : ''}>URL Input</option>
                    <option value="number" ${question.type === 'number' ? 'selected' : ''}>Number Input</option>
                </select>
            </div>
            <div class="flex items-center space-x-2">
                <input type="checkbox" id="question-required" class="rounded text-blue-600 focus:ring-blue-500" ${question.required ? 'checked' : ''}>
                <label for="question-required" class="text-gray-700 dark:text-gray-300 text-sm font-semibold">Required</label>
            </div>
            <div class="flex justify-end space-x-4 mt-6">
                <button type="button" id="cancel-edit-question-btn" class="py-2 px-5 rounded-full bg-gray-500 text-white font-bold hover:bg-gray-600 transition duration-300 transform hover:scale-105 shadow-lg">
                    Cancel
                </button>
                <button type="submit" class="py-2 px-5 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                    Save Changes
                </button>
            </div>
        </form>
    `;
    renderGenericModal('Edit Question', contentHtml);

    const editQuestionForm = document.getElementById('edit-question-form');
    const questionLabelInput = document.getElementById('question-label');
    const questionTypeSelect = document.getElementById('question-type');
    const questionRequiredCheckbox = document.getElementById('question-required');

    editQuestionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const updatedQuestion = {
            id: question.id, // Keep original ID
            label: questionLabelInput.value,
            type: questionTypeSelect.value,
            required: questionRequiredCheckbox.checked
        };
        _currentPartnerQuestions[index] = updatedQuestion; // Update the array passed by reference

        try {
            await updatePartnerApplicationQuestionsFirestore(_currentPartnerQuestions, _currentUser, _userData);
            document.getElementById('main-modals-container').classList.add('hidden');
            showMessageModal('Question updated successfully!');
            _refreshManagePartnerQuestionsPageCallback(); // Re-render the page
        } catch (error) {
            showMessageModal(error.message, 'error');
        }
    });

    document.getElementById('cancel-edit-question-btn').addEventListener('click', () => {
        document.getElementById('main-modals-container').classList.add('hidden');
    });
}

/**
 * Shows the Add/Edit Video modal.
 * @param {object} [videoToEdit=null] - The video object if editing, null if adding.
 */
export function showAddEditVideoModal(videoToEdit = null) {
    const isEditing = videoToEdit !== null;
    const title = isEditing ? 'Edit Video' : 'Add New Video';

    const contentHtml = `
        <form id="add-edit-video-form" class="space-y-4">
            <div>
                <label for="video-name" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Video Name</label>
                <input type="text" id="video-name" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" value="${videoToEdit?.name || ''}" required>
            </div>
            <div>
                <label for="youtube-link" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">YouTube Link</label>
                <input type="url" id="youtube-link" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ" value="${videoToEdit?.youtubeLink || ''}" required>
            </div>
            <div>
                <label for="video-description" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Description (Optional)</label>
                <textarea id="video-description" rows="4" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="A short description of the video...">${videoToEdit?.description || ''}</textarea>
            </div>
            <div>
                <label for="thumbnail-url" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Custom Thumbnail URL (Optional)</label>
                <input type="url" id="thumbnail-url" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="e.g., https://example.com/custom-thumb.jpg" value="${videoToEdit?.thumbnailUrl || ''}">
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">If empty, YouTube's default thumbnail will be used.</p>
            </div>
            <div class="flex justify-end space-x-4 mt-6">
                <button type="button" id="cancel-video-modal-btn" class="py-2 px-5 rounded-full bg-gray-500 text-white font-bold hover:bg-gray-600 transition duration-300 transform hover:scale-105 shadow-lg">
                    Cancel
                </button>
                <button type="submit" class="py-2 px-5 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                    ${isEditing ? 'Save Changes' : 'Add Video'}
                </button>
            </div>
        </form>
    `;
    renderGenericModal(title, contentHtml);

    const addEditVideoForm = document.getElementById('add-edit-video-form');
    const videoNameInput = document.getElementById('video-name');
    const youtubeLinkInput = document.getElementById('youtube-link');
    const videoDescriptionInput = document.getElementById('video-description');
    const thumbnailUrlInput = document.getElementById('thumbnail-url');

    addEditVideoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = videoNameInput.value;
        const youtubeLink = youtubeLinkInput.value;
        const description = videoDescriptionInput.value;
        const thumbnailUrl = thumbnailUrlInput.value;

        const youtubeVideoId = extractYouTubeVideoId(youtubeLink);
        if (!youtubeVideoId) {
            showMessageModal("Invalid YouTube link. Please provide a valid YouTube video URL.", 'error');
            return;
        }

        const videoData = {
            name,
            youtubeLink,
            youtubeVideoId, // Store extracted ID for easy embedding/linking
            description,
            thumbnailUrl
        };

        try {
            if (isEditing) {
                await updateVideoFirestore(videoToEdit.id, videoData, _currentUser, _userData);
            } else {
                await addVideoFirestore(videoData, _currentUser, _userData);
            }
            document.getElementById('main-modals-container').classList.add('hidden');
            _refreshVideosPageCallback(); // Re-render the page
        } catch (error) {
            showMessageModal(error.message, 'error');
        }
    });

    document.getElementById('cancel-video-modal-btn').addEventListener('click', () => {
        document.getElementById('main-modals-container').classList.add('hidden');
    });
}

/**
 * Shows the Edit Partner TOS modal.
 * @param {string} currentTosContent - The current content of the Partner TOS.
 */
export function showEditPartnerTOSModal(currentTosContent) {
    const contentHtml = `
        <form id="edit-tos-form" class="space-y-4">
            <div>
                <label for="tos-content-textarea" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Terms of Service Content (Markdown supported)</label>
                <textarea id="tos-content-textarea" rows="15" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" required>${currentTosContent}</textarea>
            </div>
            <div class="flex justify-end space-x-4 mt-6">
                <button type="button" id="cancel-tos-edit-btn" class="py-2 px-5 rounded-full bg-gray-500 text-white font-bold hover:bg-gray-600 transition duration-300 transform hover:scale-105 shadow-lg">
                    Cancel
                </button>
                <button type="submit" class="py-2 px-5 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                    Save Changes
                </button>
            </div>
        </form>
    `;
    renderGenericModal('Edit Partner Terms of Service', contentHtml);

    const editTosForm = document.getElementById('edit-tos-form');
    const tosContentTextarea = document.getElementById('tos-content-textarea');

    editTosForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newTosContent = tosContentTextarea.value;
        try {
            await updatePartnerTOSFirestore(newTosContent, _currentUser, _userData);
            document.getElementById('main-modals-container').classList.add('hidden');
            showMessageModal('Partner TOS updated successfully!');
            _refreshPartnerTOSPageCallback(); // Re-render the page
        } catch (error) {
            showMessageModal(error.message, 'error');
        }
    });

    document.getElementById('cancel-tos-edit-btn').addEventListener('click', () => {
        document.getElementById('main-modals-container').classList.add('hidden');
    });
}

/**
 * Shows the Submit Code modal.
 */
export function showSubmitCodeModal() {
    const contentHtml = `
        <form id="submit-code-form" class="space-y-4">
            <div>
                <label for="code-title" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Title</label>
                <input type="text" id="code-title" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" required>
            </div>
            <div>
                <label for="code-language" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Language</label>
                <input type="text" id="code-language" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="e.g., JavaScript, Python, HTML" required>
            </div>
            <div>
                <label for="code-snippet" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Code Snippet</label>
                <textarea id="code-snippet" rows="15" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100 font-mono" required></textarea>
            </div>
            <div class="flex justify-end space-x-4 mt-6">
                <button type="button" id="cancel-submit-code-btn" class="py-2 px-5 rounded-full bg-gray-500 text-white font-bold hover:bg-gray-600 transition duration-300 transform hover:scale-105 shadow-lg">
                    Cancel
                </button>
                <button type="submit" class="py-2 px-5 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                    Submit for Review
                </button>
            </div>
        </form>
    `;
    renderGenericModal('Submit Code Snippet', contentHtml);

    const submitCodeForm = document.getElementById('submit-code-form');
    const codeTitleInput = document.getElementById('code-title');
    const codeLanguageInput = document.getElementById('code-language');
    const codeSnippetInput = document.getElementById('code-snippet');

    submitCodeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const snippetData = {
            title: codeTitleInput.value,
            language: codeLanguageInput.value,
            code: codeSnippetInput.value,
        };

        try {
            await submitCodeSnippet(snippetData, _currentUser, _userData);
            document.getElementById('main-modals-container').classList.add('hidden');
            _navigateToCallback('approved-code'); // Optionally navigate to approved code or stay on submit page
        } catch (error) {
            showMessageModal(error.message, 'error');
        }
    });

    document.getElementById('cancel-submit-code-btn').addEventListener('click', () => {
        document.getElementById('main-modals-container').classList.add('hidden');
    });
}

/**
 * Shows the Review Code Submission modal.
 * @param {object} submission - The code submission object to review.
 */
export function showReviewCodeSubmissionModal(submission) {
    const contentHtml = `
        <div class="space-y-4">
            <p class="text-gray-700 dark:text-gray-300">Title: <span class="font-semibold">${submission.title}</span></p>
            <p class="text-gray-700 dark:text-gray-300">Language: <span class="font-semibold">${submission.language}</span></p>
            <p class="text-gray-700 dark:text-gray-300">Submitted by: <span class="font-semibold">${submission.authorUsername}</span> on ${submission.timestamp}</p>
            <p class="text-gray-700 dark:text-gray-300">Status: <span class="font-semibold capitalize">${submission.status}</span></p>

            <h4 class="text-xl font-bold text-gray-800 dark:text-gray-100 mt-6 mb-4">Code Snippet:</h4>
            <div class="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto font-mono text-sm">
                <pre>${submission.code}</pre>
            </div>

            <div class="flex justify-center space-x-4 mt-6">
                ${submission.status === 'pending' ? `
                    <button id="approve-code-btn" class="py-2 px-5 rounded-full bg-green-600 text-white font-bold hover:bg-green-700 transition duration-300 transform hover:scale-105 shadow-lg">
                        Approve
                    </button>
                    <button id="deny-code-btn" class="py-2 px-5 rounded-full bg-red-600 text-white font-bold hover:bg-red-700 transition duration-300 transform hover:scale-105 shadow-lg">
                        Deny
                    </button>
                ` : `
                    <p class="text-gray-600 dark:text-gray-400">Submission already ${submission.status}.</p>
                `}
            </div>
        </div>
    `;
    renderGenericModal('Review Code Submission', contentHtml);

    if (submission.status === 'pending') {
        document.getElementById('approve-code-btn').addEventListener('click', async () => {
            try {
                await updateCodeSubmissionStatus(submission.id, 'approved', _currentUser, _userData);
                document.getElementById('main-modals-container').classList.add('hidden');
                _refreshReviewCodeSubmissionsPageCallback(); // Refresh the list
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
        });

        document.getElementById('deny-code-btn').addEventListener('click', async () => {
            try {
                await updateCodeSubmissionStatus(submission.id, 'denied', _currentUser, _userData);
                document.getElementById('main-modals-container').classList.add('hidden');
                _refreshReviewCodeSubmissionsPageCallback(); // Refresh the list
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
        });
    }
}
