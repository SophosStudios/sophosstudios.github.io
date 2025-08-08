// src/firebase-service.js
// Handles all Firebase Authentication and Firestore operations.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, query, onSnapshot, deleteDoc, orderBy, serverTimestamp, addDoc, where } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// Import utilities for showing loading and messages
import { showLoadingSpinner, hideLoadingSpinner, showMessageModal } from './utils.js';
import CONFIG from './config.js';

// These will be initialized by the main App.js
let appInstance;
let authInstance;
let dbInstance;
let APP_ID;

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
    APP_ID = appConfig.firebaseConfig.projectId;
}

/**
 * Updates a user's role in Firestore.
 * @param {string} userId - The ID of the user to update.
 * @param {string} newRole - The new role for the user.
 * @param {object} currentUser - The currently authenticated user.
 */
export async function updateUserRoleFirestore(userId, newRole, currentUser) {
    if (!currentUser) {
        throw new Error("You must be logged in to update user roles.");
    }
    showLoadingSpinner();
    try {
        const userDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/users`, userId);
        await updateDoc(userDocRef, { role: newRole });
        showMessageModal(`User role updated to ${newRole} successfully!`, 'success');
    } catch (error) {
        console.error("Error updating user role:", error.message);
        showMessageModal("Failed to update user role: " + error.message, 'error');
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Sends a direct message to another user.
 * @param {string} senderId - The ID of the sending user.
 * @param {string} receiverId - The ID of the receiving user.
 * @param {string} messageText - The content of the message.
 */
export async function sendDirectMessage(senderId, receiverId, messageText) {
    showLoadingSpinner();
    try {
        // Create a unique chat room ID by sorting the two user IDs
        const chatId = [senderId, receiverId].sort().join('_');
        const chatRoomRef = collection(dbInstance, `/artifacts/${APP_ID}/public/data/dms/${chatId}/messages`);
        
        await addDoc(chatRoomRef, {
            senderId: senderId,
            text: messageText,
            timestamp: serverTimestamp(),
            read: false,
        });

    } catch (error) {
        console.error("Error sending message:", error.message);
        showMessageModal("Failed to send message: " + error.message, 'error');
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Sets up a real-time listener for direct messages in a chat.
 * @param {string} user1Id - The ID of the first user.
 * @param {string} user2Id - The ID of the second user.
 * @param {function} callback - Callback function to handle new messages.
 * @returns {function} - The unsubscribe function for the listener.
 */
export function getDirectMessages(user1Id, user2Id, callback) {
    const chatId = [user1Id, user2Id].sort().join('_');
    const messagesQuery = query(
        collection(dbInstance, `/artifacts/${APP_ID}/public/data/dms/${chatId}/messages`),
        orderBy('timestamp', 'asc')
    );

    return onSnapshot(messagesQuery, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(messages);
    });
}

/**
 * Updates the 'read' status of a message.
 * @param {string} chatId - The ID of the chat.
 * @param {string} messageId - The ID of the message to update.
 */
export async function updateDirectMessageSeenStatus(chatId, messageId) {
    try {
        const messageDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/dms/${chatId}/messages`, messageId);
        await updateDoc(messageDocRef, { read: true });
    } catch (error) {
        console.error("Error updating message read status:", error.message);
    }
}

