// src/modals.js
// Contains functions for rendering all application modals.

import {
    createPostFirestore,
    updatePostFirestore,
    updateProfileData,
    sendEmailToUserFirestore,
    updatePartnerApplicationStatusFirestore,
    fetchPartnerTOSFirestore,
    addVideoFirestore,
    updateVideoFirestore,
    updatePartnerApplicationQuestionsFirestore
} from './firebase-service.js';
import { showLoadingSpinner, hideLoadingSpinner, showMessageModal, extractYouTubeVideoId, getRoleVFX } from './utils.js';

// Global state passed from App.js
let _currentUser = null;
let _userData = null;
let _navigateTo = null;
let _currentPartnerQuestions = null;
let _CONFIG = null;

export function initializeModalModule(currentUser, userData, navigateTo, currentPartnerQuestions, CONFIG) {
    _currentUser = currentUser;
    _userData = userData;
    _navigateTo = navigateTo;
    _currentPartnerQuestions = currentPartnerQuestions;
    _CONFIG = CONFIG;
}

/**
 * Renders the Create/Edit Post modal.
 * @param {object|null} postData - Existing post data if editing, or null for a new post.
 */
export function showCreatePostModal(postData = null) {
    const isEditing = !!postData;
    const modalContainer = document.getElementById('create-post-modal-container');
    modalContainer.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
            <div class="bg-gray-800 text-white p-6 rounded-lg shadow-2xl max-w-lg w-full mx-4 border-t-4 border-red-500">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-bold">${isEditing ? 'Edit Post' : 'Create New Post'}</h2>
                    <button id="close-post-modal-btn" class="text-red-500 hover:text-red-300 text-3xl">&times;</button>
                </div>
                <form id="post-form" class="space-y-4">
                    <div>
                        <label for="post-title" class="block text-sm font-medium mb-1">Title</label>
                        <input type="text" id="post-title" name="post-title" value="${postData ? postData.title : ''}"
                               class="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:ring-red-500 focus:border-red-500" required>
                    </div>
                    <div>
                        <label for="post-content" class="block text-sm font-medium mb-1">Content</label>
                        <textarea id="post-content" name="post-content" rows="6"
                                  class="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:ring-red-500 focus:border-red-500" required>${postData ? postData.content : ''}</textarea>
                    </div>
                    <div class="flex justify-end">
                        <button type="submit" id="submit-post-btn"
                                class="px-6 py-2 bg-red-600 rounded-lg text-white font-bold hover:bg-red-700 transition duration-300">
                            ${isEditing ? 'Update Post' : 'Create Post'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const closeBtn = document.getElementById('close-post-modal-btn');
    closeBtn.addEventListener('click', () => modalContainer.innerHTML = '');

    const form = document.getElementById('post-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('post-title').value;
        const content = document.getElementById('post-content').value;

        showLoadingSpinner();
        try {
            if (isEditing) {
                await updatePostFirestore(postData.id, title, content);
            } else {
                await createPostFirestore(title, content, _currentUser);
            }
            modalContainer.innerHTML = '';
        } catch (error) {
            showMessageModal(error.message, 'error');
        } finally {
            hideLoadingSpinner();
        }
    });
}

/**
 * Renders the Edit User Info modal.
 * @param {object} userToEdit - The user data to pre-fill the form.
 */
export function showEditUserInfoModal(userToEdit) {
    const modalContainer = document.getElementById('edit-profile-modal-container');
    modalContainer.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
            <div class="bg-gray-800 text-white p-6 rounded-lg shadow-2xl max-w-sm w-full mx-4 border-t-4 border-red-500">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-bold">Edit User Info</h2>
                    <button id="close-profile-modal-btn" class="text-red-500 hover:text-red-300 text-3xl">&times;</button>
                </div>
                <form id="edit-profile-form" class="space-y-4">
                    <div>
                        <label for="display-name" class="block text-sm font-medium mb-1">Display Name</label>
                        <input type="text" id="display-name" name="display-name" value="${userToEdit.displayName}"
                               class="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:ring-red-500 focus:border-red-500" required>
                    </div>
                    <div class="flex justify-end">
                        <button type="submit" class="px-6 py-2 bg-red-600 rounded-lg text-white font-bold hover:bg-red-700 transition duration-300">
                            Update Profile
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    const closeBtn = document.getElementById('close-profile-modal-btn');
    closeBtn.addEventListener('click', () => modalContainer.innerHTML = '');

    const form = document.getElementById('edit-profile-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const displayName = document.getElementById('display-name').value;

        showLoadingSpinner();
        try {
            await updateProfileData(userToEdit.uid, { displayName });
            modalContainer.innerHTML = '';
        } catch (error) {
            showMessageModal(error.message, 'error');
        } finally {
            hideLoadingSpinner();
        }
    });
}

/**
 * Renders the Admin Take Action modal for a specific user.
 * @param {object} userToActOn - The user data for the action.
 * @param {object} currentUserData - The current user's data.
 */
export function showTakeActionModal(userToActOn, currentUserData) {
    if (userToActOn.uid === currentUserData.uid) {
        showMessageModal('You cannot take action on yourself.', 'error');
        return;
    }

    const modalContainer = document.getElementById('take-action-modal-container');
    modalContainer.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
            <div class="bg-gray-800 text-white p-6 rounded-lg shadow-2xl max-w-sm w-full mx-4 border-t-4 border-red-500">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-bold">Take Action on ${userToActOn.displayName}</h2>
                    <button id="close-action-modal-btn" class="text-red-500 hover:text-red-300 text-3xl">&times;</button>
                </div>
                <form id="take-action-form" class="space-y-4">
                    <div>
                        <label for="new-role" class="block text-sm font-medium mb-1">Change Role</label>
                        <select id="new-role" name="new-role" class="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white">
                            <option value="member" ${userToActOn.role === 'member' ? 'selected' : ''}>Member</option>
                            <option value="partner" ${userToActOn.role === 'partner' ? 'selected' : ''}>Partner</option>
                            <option value="admin" ${userToActOn.role === 'admin' ? 'selected' : ''}>Admin</option>
                            <option value="founder" ${userToActOn.role === 'founder' ? 'selected' : ''}>Founder</option>
                            <option value="co-founder" ${userToActOn.role === 'co-founder' ? 'selected' : ''}>Co-Founder</option>
                        </select>
                    </div>
                    <div>
                        <label for="action-message" class="block text-sm font-medium mb-1">Message to User</label>
                        <textarea id="action-message" name="action-message" rows="4" placeholder="Enter a message for the user..."
                                  class="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:ring-red-500 focus:border-red-500"></textarea>
                    </div>
                    <div class="flex justify-end space-x-4">
                        <button type="submit" id="update-role-btn" class="px-6 py-2 bg-red-600 rounded-lg text-white font-bold hover:bg-red-700 transition duration-300">
                            Update Role
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    const closeBtn = document.getElementById('close-action-modal-btn');
    closeBtn.addEventListener('click', () => modalContainer.innerHTML = '');

    const form = document.getElementById('take-action-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newRole = document.getElementById('new-role').value;
        const actionMessage = document.getElementById('action-message').value;

        showLoadingSpinner();
        try {
            await updateProfileData(userToActOn.uid, { role: newRole });
            if (actionMessage) {
                await sendEmailToUserFirestore(userToActOn.uid, 'Update from SophosWRLD Admin', actionMessage);
            }
            modalContainer.innerHTML = '';
        } catch (error) {
            showMessageModal(error.message, 'error');
        } finally {
            hideLoadingSpinner();
        }
    });
}

/**
 * Renders the modal for reviewing a partner application.
 * @param {object} application - The application data to review.
 */
export function showReviewApplicationModal(application) {
    const modalContainer = document.getElementById('review-application-modal-container');
    modalContainer.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
            <div class="bg-gray-800 text-white p-6 rounded-lg shadow-2xl max-w-2xl w-full border-t-4 border-red-500 overflow-y-auto max-h-[90vh]">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-bold">Review Partner Application</h2>
                    <button id="close-review-modal-btn" class="text-red-500 hover:text-red-300 text-3xl">&times;</button>
                </div>
                <div class="space-y-4 mb-6">
                    <p><strong>Applicant:</strong> ${application.applicantName}</p>
                    <p><strong>Email:</strong> ${application.applicantEmail}</p>
                    <p><strong>Status:</strong> <span class="font-bold">${application.status}</span></p>
                    <p><strong>Submitted On:</strong> ${application.createdAt.toDate().toLocaleString()}</p>
                    <div class="space-y-2 mt-4">
                        <h3 class="text-xl font-semibold">Answers:</h3>
                        ${Object.entries(application.answers).map(([question, answer]) => `
                            <div class="p-3 bg-gray-700 rounded-lg">
                                <p class="font-medium">${question}</p>
                                <p class="text-sm text-gray-300">${answer}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="flex justify-end space-x-4">
                    <button id="decline-btn" class="px-6 py-2 bg-gray-600 rounded-lg text-white font-bold hover:bg-gray-500 transition duration-300">Decline</button>
                    <button id="approve-btn" class="px-6 py-2 bg-red-600 rounded-lg text-white font-bold hover:bg-red-700 transition duration-300">Approve</button>
                </div>
            </div>
        </div>
    `;

    const closeBtn = document.getElementById('close-review-modal-btn');
    closeBtn.addEventListener('click', () => modalContainer.innerHTML = '');

    document.getElementById('approve-btn').addEventListener('click', async () => {
        showLoadingSpinner();
        try {
            await updatePartnerApplicationStatusFirestore(application.id, 'approved', application.applicantId);
            modalContainer.innerHTML = '';
        } catch (error) {
            showMessageModal(error.message, 'error');
        } finally {
            hideLoadingSpinner();
        }
    });

    document.getElementById('decline-btn').addEventListener('click', async () => {
        showLoadingSpinner();
        try {
            await updatePartnerApplicationStatusFirestore(application.id, 'declined', application.applicantId);
            modalContainer.innerHTML = '';
        } catch (error) {
            showMessageModal(error.message, 'error');
        } finally {
            hideLoadingSpinner();
        }
    });
}

/**
 * Renders the modal for adding or editing a video.
 * @param {object|null} videoData - Existing video data if editing, or null for a new video.
 */
export function showAddEditVideoModal(videoData = null) {
    const isEditing = !!videoData;
    const modalContainer = document.getElementById('add-edit-video-modal-container');
    modalContainer.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
            <div class="bg-gray-800 text-white p-6 rounded-lg shadow-2xl max-w-md w-full mx-4 border-t-4 border-red-500">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-bold">${isEditing ? 'Edit Video' : 'Add New Video'}</h2>
                    <button id="close-video-modal-btn" class="text-red-500 hover:text-red-300 text-3xl">&times;</button>
                </div>
                <form id="video-form" class="space-y-4">
                    <div>
                        <label for="video-name" class="block text-sm font-medium mb-1">Video Name</label>
                        <input type="text" id="video-name" name="video-name" value="${videoData ? videoData.name : ''}"
                               class="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:ring-red-500 focus:border-red-500" required>
                    </div>
                    <div>
                        <label for="video-link" class="block text-sm font-medium mb-1">YouTube Link</label>
                        <input type="url" id="video-link" name="video-link" value="${videoData ? videoData.youtubeLink : ''}"
                               class="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:ring-red-500 focus:border-red-500" required>
                    </div>
                    <div>
                        <label for="video-description" class="block text-sm font-medium mb-1">Description</label>
                        <textarea id="video-description" name="video-description" rows="4"
                                  class="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:ring-red-500 focus:border-red-500">${videoData ? videoData.description : ''}</textarea>
                    </div>
                    <div class="flex justify-end">
                        <button type="submit" class="px-6 py-2 bg-red-600 rounded-lg text-white font-bold hover:bg-red-700 transition duration-300">
                            ${isEditing ? 'Update Video' : 'Add Video'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const closeBtn = document.getElementById('close-video-modal-btn');
    closeBtn.addEventListener('click', () => modalContainer.innerHTML = '');

    const form = document.getElementById('video-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('video-name').value;
        const youtubeLink = document.getElementById('video-link').value;
        const description = document.getElementById('video-description').value;
        const youtubeVideoId = extractYouTubeVideoId(youtubeLink);

        if (!youtubeVideoId) {
            showMessageModal('Please provide a valid YouTube link.', 'error');
            return;
        }

        showLoadingSpinner();
        try {
            if (isEditing) {
                await updateVideoFirestore(videoData.id, name, youtubeLink, youtubeVideoId, description, _currentUser);
            } else {
                await addVideoFirestore(name, youtubeLink, youtubeVideoId, description, _currentUser);
            }
            modalContainer.innerHTML = '';
        } catch (error) {
            showMessageModal(error.message, 'error');
        } finally {
            hideLoadingSpinner();
        }
    });
}


/**
 * Renders the modal for editing the Partner Application questions.
 */
export function showEditPartnerQuestionsModal() {
    const modalContainer = document.getElementById('edit-partner-questions-modal-container');
    const questionsList = _currentPartnerQuestions.length > 0 ? _currentPartnerQuestions : ['Question 1?', 'Question 2?', 'Question 3?'];
    modalContainer.innerHTML = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
            <div class="bg-gray-800 text-white p-6 rounded-lg shadow-2xl max-w-xl w-full border-t-4 border-red-500 overflow-y-auto max-h-[90vh]">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-bold">Edit Partner Application Questions</h2>
                    <button id="close-questions-modal-btn" class="text-red-500 hover:text-red-300 text-3xl">&times;</button>
                </div>
                <form id="questions-form" class="space-y-4">
                    <div id="questions-list" class="space-y-2">
                        ${questionsList.map((q, index) => `
                            <div class="flex items-center space-x-2">
                                <input type="text" value="${q}" class="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:ring-red-500 focus:border-red-500 question-input" required>
                                <button type="button" class="remove-question-btn text-red-500 hover:text-red-300 text-2xl">&times;</button>
                            </div>
                        `).join('')}
                    </div>
                    <div class="flex justify-between items-center mt-4">
                        <button type="button" id="add-question-btn" class="px-4 py-2 bg-gray-700 rounded-lg text-white font-bold hover:bg-gray-600 transition duration-300">
                            Add Question
                        </button>
                        <button type="submit" class="px-6 py-2 bg-red-600 rounded-lg text-white font-bold hover:bg-red-700 transition duration-300">
                            Save Questions
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    const closeBtn = document.getElementById('close-questions-modal-btn');
    closeBtn.addEventListener('click', () => modalContainer.innerHTML = '');

    const questionsListElement = document.getElementById('questions-list');
    
    document.getElementById('add-question-btn').addEventListener('click', () => {
        const newQuestionDiv = document.createElement('div');
        newQuestionDiv.className = 'flex items-center space-x-2';
        newQuestionDiv.innerHTML = `
            <input type="text" value="" placeholder="New question..." class="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white placeholder-gray-400 focus:ring-red-500 focus:border-red-500 question-input" required>
            <button type="button" class="remove-question-btn text-red-500 hover:text-red-300 text-2xl">&times;</button>
        `;
        questionsListElement.appendChild(newQuestionDiv);
        newQuestionDiv.querySelector('.remove-question-btn').addEventListener('click', (e) => e.target.closest('div').remove());
    });

    questionsListElement.querySelectorAll('.remove-question-btn').forEach(btn => {
        btn.addEventListener('click', (e) => e.target.closest('div').remove());
    });

    const form = document.getElementById('questions-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newQuestions = Array.from(document.querySelectorAll('.question-input')).map(input => input.value);
        if (newQuestions.some(q => !q.trim())) {
            showMessageModal('Please fill in all questions or remove empty ones.', 'error');
            return;
        }

        showLoadingSpinner();
        try {
            await updatePartnerApplicationQuestionsFirestore(newQuestions, _currentUser);
            modalContainer.innerHTML = '';
        } catch (error) {
            showMessageModal(error.message, 'error');
        } finally {
            hideLoadingSpinner();
        }
    });
}
