// src/firebase-service.js
// Handles all Firebase Authentication and Firestore operations.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, query, onSnapshot, deleteDoc, orderBy, serverTimestamp, deleteField, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Import utilities for showing loading and messages
import { showLoadingSpinner, hideLoadingSpinner, showMessageModal } from './utils.js';

// These will be initialized by the main App.js
let appInstance;
let authInstance;
let dbInstance;
let APP_ID;
let CONFIG; // To access adminEmails and founderEmails

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
 * Handles user authentication (sign-up, sign-in, etc.).
 * @param {string} email - User's email.
 * @param {string} password - User's password.
 * @param {string} mode - 'signup' or 'signin'.
 * @returns {Promise<object>} - The user credential object.
 */
export async function authenticateUser(email, password, mode) {
    if (!authInstance) {
        throw new Error("Firebase Auth not initialized.");
    }
    showLoadingSpinner();
    try {
        let userCredential;
        if (mode === 'signup') {
            userCredential = await createUserWithEmailAndPassword(authInstance, email, password);
        } else {
            userCredential = await signInWithEmailAndPassword(authInstance, email, password);
        }
        return userCredential;
    } catch (error) {
        console.error("Authentication error:", error.message);
        throw new Error("Authentication failed: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Sends a password reset email.
 * @param {string} email - The user's email.
 * @returns {Promise<void>}
 */
export async function sendPasswordReset(email) {
    if (!authInstance) {
        throw new Error("Firebase Auth not initialized.");
    }
    showLoadingSpinner();
    try {
        await sendPasswordResetEmail(authInstance, email);
        showMessageModal('Password reset email sent!', 'info');
    } catch (error) {
        console.error("Error sending password reset email:", error.message);
        throw new Error("Failed to send password reset email: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Fetches the current user's data from Firestore.
 * @param {string} userId - The UID of the current user.
 * @returns {Promise<object|null>} - The user data object or null if not found.
 */
export async function fetchCurrentUserFirestoreData(userId) {
    if (!dbInstance) {
        throw new Error("Firebase Firestore not initialized.");
    }
    const userDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/users`, userId);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    } else {
        return null;
    }
}

/**
 * Updates a user's profile data in Firestore.
 * @param {string} userId - The UID of the user.
 * @param {object} updates - An object with the fields to update.
 * @returns {Promise<void>}
 */
export async function updateProfileData(userId, updates) {
    if (!dbInstance) {
        throw new Error("Firebase Firestore not initialized.");
    }
    showLoadingSpinner();
    try {
        const userDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/users`, userId);
        await updateDoc(userDocRef, updates);
        showMessageModal('Profile updated successfully!');
    } catch (error) {
        console.error("Error updating profile:", error.message);
        throw new Error("Failed to update profile: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Fetches all users from Firestore.
 * @returns {Promise<Array<object>>} - An array of user data objects.
 */
export async function fetchAllUsersFirestore() {
    if (!dbInstance) {
        throw new Error("Firebase Firestore not initialized.");
    }
    const usersCollection = collection(dbInstance, `/artifacts/${APP_ID}/public/data/users`);
    const usersSnapshot = await getDocs(usersCollection);
    return usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Updates a user's role in Firestore.
 * @param {string} userId - The UID of the user.
 * @param {string} newRole - The new role.
 * @returns {Promise<void>}
 */
export async function updateUserRoleFirestore(userId, newRole) {
    if (!dbInstance) {
        throw new Error("Firebase Firestore not initialized.");
    }
    showLoadingSpinner();
    try {
        const userDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/users`, userId);
        await updateDoc(userDocRef, { role: newRole });
        showMessageModal('User role updated successfully!');
    } catch (error) {
        console.error("Error updating user role:", error.message);
        throw new Error("Failed to update user role: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Creates a new forum post in Firestore.
 * @param {string} title - The title of the post.
 * @param {string} content - The content of the post.
 * @param {object} currentUser - The current user object.
 * @param {object} userData - The current user data object.
 * @returns {Promise<void>}
 */
export async function createPostFirestore(title, content, currentUser, userData) {
    if (!dbInstance || !currentUser) {
        throw new Error("You must be logged in to create a post.");
    }
    showLoadingSpinner();
    try {
        const postsCollectionRef = collection(dbInstance, `/artifacts/${APP_ID}/public/data/posts`);
        await addDoc(postsCollectionRef, {
            title: title,
            content: content,
            authorId: currentUser.uid,
            authorName: userData.username || 'Anonymous',
            timestamp: serverTimestamp(),
            reactions: {},
            comments: []
        });
        showMessageModal('Post created successfully!');
    } catch (error) {
        console.error("Error creating post:", error.message);
        throw new Error("Failed to create post: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Adds a reaction to a forum post.
 * @param {string} postId - The ID of the post.
 * @param {string} userId - The ID of the user.
 * @param {string} reaction - The reaction emoji (e.g., '👍', '❤️').
 * @returns {Promise<void>}
 */
export async function addReactionToPost(postId, userId, reaction) {
    if (!dbInstance || !userId) {
        throw new Error("You must be logged in to react to a post.");
    }
    showLoadingSpinner();
    try {
        const postDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/posts`, postId);
        const postSnapshot = await getDoc(postDocRef);

        if (!postSnapshot.exists()) {
            throw new Error("Post not found.");
        }

        const postData = postSnapshot.data();
        const existingReactions = postData.reactions || {};

        if (existingReactions[reaction] && existingReactions[reaction].includes(userId)) {
            // User has already reacted with this emoji, so remove it
            await updateDoc(postDocRef, {
                [`reactions.${reaction}`]: arrayRemove(userId)
            });
            showMessageModal('Reaction removed.');
        } else {
            // Add the new reaction
            // First, remove the user's previous reaction if any
            for (const key in existingReactions) {
                if (existingReactions[key].includes(userId)) {
                    await updateDoc(postDocRef, {
                        [`reactions.${key}`]: arrayRemove(userId)
                    });
                }
            }
            // Then add the new one
            await updateDoc(postDocRef, {
                [`reactions.${reaction}`]: arrayUnion(userId)
            });
            showMessageModal('Reaction added!');
        }

    } catch (error) {
        console.error("Error adding reaction:", error.message);
        throw new Error("Failed to add reaction: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Adds a comment to a forum post.
 * @param {string} postId - The ID of the post.
 * @param {object} commentData - The comment object.
 * @returns {Promise<void>}
 */
export async function addCommentToPost(postId, commentData) {
    if (!dbInstance || !commentData.authorId) {
        throw new Error("You must be logged in to comment.");
    }
    showLoadingSpinner();
    try {
        const postDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/posts`, postId);
        await updateDoc(postDocRef, {
            comments: arrayUnion({
                ...commentData,
                timestamp: serverTimestamp()
            })
        });
        showMessageModal('Comment added successfully!');
    } catch (error) {
        console.error("Error adding comment:", error.message);
        throw new Error("Failed to add comment: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Fetches all posts from Firestore.
 * @returns {Promise<Array<object>>} - An array of post data objects.
 */
export async function fetchAllPostsFirestore() {
    if (!dbInstance) {
        throw new Error("Firebase Firestore not initialized.");
    }
    const postsCollectionRef = collection(dbInstance, `/artifacts/${APP_ID}/public/data/posts`);
    const postsQuery = query(postsCollectionRef, orderBy('timestamp', 'desc'));
    const postsSnapshot = await getDocs(postsQuery);
    return postsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}


// Placeholder functions for other parts of the app
export async function updatePostFirestore(postId, updates) {
    // Logic for updating a post
}
export async function deletePostFirestore(postId) {
    // Logic for deleting a post
}
export async function sendEmailToUserFirestore(userId, emailContent) {
    // Logic for sending an email
}
export async function fetchPartnerTOSFirestore() {
    // Logic for fetching TOS
}
export async function fetchPartnerApplicationQuestionsFirestore() {
    // Logic for fetching application questions
}
export async function submitPartnerApplicationFirestore(applicationData) {
    // Logic for submitting application
}
export async function fetchAllPartnerApplicationsFirestore() {
    // Logic for fetching applications
}
export async function updatePartnerApplicationStatusFirestore(applicationId, newStatus) {
    // Logic for updating application status
}
export async function fetchVideosFirestore() {
    // Logic for fetching videos
}
export async function addVideoFirestore(videoData) {
    // Logic for adding a video
}
export async function updateVideoFirestore(videoId, videoData) {
    // Logic for updating a video
}
export async function deleteVideoFirestore(videoId) {
    // Logic for deleting a video
}
export async function sendDirectMessage(recipientId, message) {
    // Logic for sending direct messages
}
export async function getDirectMessages(senderId, recipientId) {
    // Logic for getting direct messages
}
export async function updateDirectMessageSeenStatus(messageId) {
    // Logic for updating message seen status
}
