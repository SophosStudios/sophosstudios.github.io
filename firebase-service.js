// src/firebase-service.js
// Handles all Firebase Authentication and Firestore operations.

import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, query, onSnapshot, deleteDoc, orderBy, serverTimestamp, deleteField, addDoc, where } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// Import utilities for showing loading and messages
import { showLoadingSpinner, hideLoadingSpinner, showMessageModal } from './utils.js';

// These will be initialized by the main App.js
let appInstance;
let authInstance;
let dbInstance;
let APP_ID;
let CONFIG;

/**
 * Initializes Firebase services for this module.
 * Call this once from your main App.js file.
 * @param {object} firebaseConfig - Your Firebase configuration object.
 * @param {object} appConfig - Your application's CONFIG object (from config.js).
 */
export function initializeFirebaseServices(firebaseConfig, appConfig) {
    appInstance = initializeApp(firebaseConfig);
    authInstance = getAuth(appInstance);
    dbInstance = getFirestore(appInstance);
    APP_ID = firebaseConfig.projectId;
    CONFIG = appConfig;
}

/**
 * Updates a user's role in Firestore.
 * @param {string} userId - The UID of the user to update.
 * @param {string} newRole - The new role ('member' or 'admin').
 * @param {object} currentAuthUser - The current authenticated Firebase user.
 */
export async function updateUserRoleFirestore(userId, newRole, currentAuthUser) {
    if (!currentAuthUser) {
        showMessageModal('You must be logged in to perform this action.', 'error');
        return;
    }
    showLoadingSpinner();
    try {
        const userDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/users`, userId);
        await updateDoc(userDocRef, { role: newRole });
        showMessageModal(`User role updated to ${newRole} successfully!`);
    } catch (error) {
        console.error("Error updating user role:", error.message);
        showMessageModal("Failed to update user role: " + error.message, 'error');
    } finally {
        hideLoadingSpinner();
    }
}

// --- Forum Functions ---

/**
 * Creates a new forum post.
 * @param {string} title
 * @param {string} content
 * @param {object} currentUser - The current authenticated user.
 */
export async function createForumPost(title, content, currentUser) {
    if (!currentUser) {
        showMessageModal('You must be logged in to create a post.', 'error');
        return;
    }
    showLoadingSpinner();
    try {
        await addDoc(collection(dbInstance, `/artifacts/${APP_ID}/public/data/posts`), {
            title,
            content,
            authorId: currentUser.uid,
            authorName: currentUser.displayName || 'Anonymous',
            createdAt: serverTimestamp(),
            comments: []
        });
        showMessageModal('Post created successfully!');
    } catch (error) {
        showMessageModal('Failed to create post: ' + error.message, 'error');
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Adds a comment to a forum post.
 * @param {string} postId
 * @param {string} commentText
 * @param {object} currentUser - The current authenticated user.
 */
export async function addCommentToPost(postId, commentText, currentUser) {
    if (!currentUser) {
        showMessageModal('You must be logged in to comment.', 'error');
        return;
    }
    showLoadingSpinner();
    try {
        const postDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/posts`, postId);
        await updateDoc(postDocRef, {
            comments: arrayUnion({
                text: commentText,
                authorId: currentUser.uid,
                authorName: currentUser.displayName || 'Anonymous',
                createdAt: serverTimestamp()
            })
        });
        showMessageModal('Comment added successfully!');
    } catch (error) {
        showMessageModal('Failed to add comment: ' + error.message, 'error');
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Deletes a forum post.
 * @param {string} postId
 * @param {object} currentUser - The current authenticated user.
 */
export async function deleteForumPost(postId, currentUser) {
    if (!currentUser) {
        showMessageModal('You must be logged in to delete a post.', 'error');
        return;
    }
    showLoadingSpinner();
    try {
        await deleteDoc(doc(dbInstance, `/artifacts/${APP_ID}/public/data/posts`, postId));
        showMessageModal('Post deleted successfully!');
    } catch (error) {
        showMessageModal('Failed to delete post: ' + error.message, 'error');
    } finally {
        hideLoadingSpinner();
    }
}

// --- Direct Messaging Functions ---

/**
 * Sends a direct message.
 * @param {string} senderId
 * @param {string} receiverId
 * @param {string} text
 */
export async function sendDirectMessage(senderId, receiverId, text) {
    showLoadingSpinner();
    try {
        const messageCollectionRef = collection(dbInstance, `/artifacts/${APP_ID}/public/data/messages`);
        await addDoc(messageCollectionRef, {
            senderId,
            receiverId,
            text,
            timestamp: serverTimestamp(),
            seen: false
        });
        hideLoadingSpinner();
    } catch (error) {
        console.error("Error sending message:", error);
        hideLoadingSpinner();
    }
}

/**
 * Sets up a real-time listener for direct messages between two users.
 * @param {string} userId1
 * @param {string} userId2
 * @param {function} callback - Function to call with the new messages array.
 * @returns {function} - Unsubscribe function.
 */
export function getDirectMessages(userId1, userId2, callback) {
    const q = query(
        collection(dbInstance, `/artifacts/${APP_ID}/public/data/messages`),
        orderBy('timestamp', 'asc'),
        where('senderId', 'in', [userId1, userId2]),
        where('receiverId', 'in', [userId1, userId2])
    );

    return onSnapshot(q, (querySnapshot) => {
        const messages = [];
        querySnapshot.forEach((doc) => {
            messages.push({ id: doc.id, ...doc.data() });
        });
        callback(messages);
    });
}

/**
 * Updates the 'seen' status of a message.
 * @param {string} messageId
 */
export async function updateDirectMessageSeenStatus(messageId) {
    try {
        const messageDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/messages`, messageId);
        await updateDoc(messageDocRef, { seen: true });
    } catch (error) {
        console.error("Error updating message seen status:", error);
    }
}
