// src/firebase-service.js
// This file encapsulates all Firebase (Auth and Firestore) related functions.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import {
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
    onAuthStateChanged, updateProfile, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup,
    deleteUser // For account deletion
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import {
    getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove,
    collection, query, onSnapshot, deleteDoc, serverTimestamp, deleteField, addDoc, getDocs, where, orderBy
} from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// Import utilities for loading spinner and modals
import { showLoadingSpinner, hideLoadingSpinner, showMessageModal } from './utils.js';

let authInstance = null;
let dbInstance = null;
let googleProviderInstance = null;
let appId = null; // Firebase Project ID

/**
 * Initializes Firebase services.
 * @param {object} firebaseConfig - Firebase configuration object.
 */
export function initializeFirebaseServices(firebaseConfig) {
    const app = initializeApp(firebaseConfig);
    authInstance = getAuth(app);
    dbInstance = getFirestore(app);
    googleProviderInstance = new GoogleAuthProvider();
    appId = firebaseConfig.projectId; // Use projectId as APP_ID
    console.log("Firebase services initialized.");
}

/**
 * Returns the Firebase Auth instance.
 * @returns {object} The Firebase Auth instance.
 */
export function getFirebaseAuth() {
    return authInstance;
}

/**
 * Returns the Firestore instance.
 * @returns {object} The Firestore instance.
 */
export function getFirestoreDb() {
    return dbInstance;
}

/**
 * Returns the Google Auth Provider instance.
 * @returns {object} The Google Auth Provider instance.
 */
export function getGoogleAuthProvider() {
    return googleProviderInstance;
}

/**
 * Returns the APP_ID (Firebase Project ID).
 * @returns {string} The APP_ID.
 */
export function getAppId() {
    return appId;
}

/**
 * Authenticates a user (login, signup, or Google sign-in).
 * @param {'login'|'signup'|'google'} type - Type of authentication.
 * @param {object} credentials - User credentials (email, password, username).
 * @returns {Promise<void>}
 */
export async function authenticateUser(type, credentials = {}) {
    showLoadingSpinner();
    try {
        if (type === 'signup') {
            const userCredential = await createUserWithEmailAndPassword(authInstance, credentials.email, credentials.password);
            await updateProfile(userCredential.user, { displayName: credentials.username });
            // Create a user document in Firestore with default role 'member'
            const userRef = doc(dbInstance, `artifacts/${appId}/public/data/users`, userCredential.user.uid);
            await setDoc(userRef, {
                username: credentials.username,
                email: credentials.email,
                role: 'member',
                createdAt: serverTimestamp(),
                profilePicUrl: '', // Default empty
                bio: '', // Default empty
                theme: 'light', // Default theme
                backgroundUrl: 'bg-gradient-to-r from-blue-400 to-purple-600', // Default background
                isBanned: false,
                partnerInfo: {} // Default empty partner info
            }, { merge: true }); // Use merge to avoid overwriting if doc somehow exists
        } else if (type === 'login') {
            await signInWithEmailAndPassword(authInstance, credentials.email, credentials.password);
        } else if (type === 'google') {
            await signInWithPopup(authInstance, googleProviderInstance);
            // After Google sign-in, ensure user data is in Firestore
            await fetchCurrentUserFirestoreData(authInstance.currentUser);
        }
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Sends a password reset email.
 * @param {string} email - User's email address.
 * @returns {Promise<void>}
 */
export async function sendPasswordReset(email) {
    showLoadingSpinner();
    try {
        await sendPasswordResetEmail(authInstance, email);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Fetches current user's Firestore data, creating a document if it doesn't exist.
 * @param {object} user - The Firebase Auth user object.
 * @returns {Promise<object|null>} The user's Firestore data or null on error.
 */
export async function fetchCurrentUserFirestoreData(user) {
    if (!user) return null;

    const userRef = doc(dbInstance, `artifacts/${appId}/public/data/users`, user.uid);
    try {
        const docSnap = await getDoc(userRef);
        if (!docSnap.exists()) {
            // Create user document if it doesn't exist (e.g., for new Google sign-ins)
            const defaultUserData = {
                username: user.displayName || user.email.split('@')[0],
                email: user.email,
                role: 'member',
                createdAt: serverTimestamp(),
                profilePicUrl: user.photoURL || '',
                bio: '',
                theme: 'light',
                backgroundUrl: 'bg-gradient-to-r from-blue-400 to-purple-600',
                isBanned: false,
                partnerInfo: {}
            };
            await setDoc(userRef, defaultUserData, { merge: true });
            return defaultUserData; // Return the newly created data
        }
        return docSnap.data();
    } catch (error) {
        console.error("Error fetching or creating user data:", error);
        return null;
    }
}

/**
 * Updates a user's profile data in Firestore.
 * @param {string} userId - The ID of the user to update.
 * @param {object} data - The data to update.
 * @returns {Promise<void>}
 */
export async function updateProfileData(userId, data) {
    showLoadingSpinner();
    try {
        const userRef = doc(dbInstance, `artifacts/${appId}/public/data/users`, userId);
        await updateDoc(userRef, data);
    } catch (error) {
        console.error("Error updating profile data:", error);
        throw new Error("Failed to update profile: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Fetches all users from Firestore.
 * @returns {Promise<Array<object>>} An array of user data objects.
 */
export async function fetchAllUsersFirestore() {
    showLoadingSpinner();
    try {
        const usersCol = collection(dbInstance, `artifacts/${appId}/public/data/users`);
        const q = query(usersCol); // No orderBy to avoid index issues
        const querySnapshot = await getDocs(q);
        const users = [];
        querySnapshot.forEach((doc) => {
            users.push({ id: doc.id, ...doc.data() });
        });
        // Sort in memory if needed (e.g., by username)
        users.sort((a, b) => (a.username || '').localeCompare(b.username || ''));
        return users;
    } catch (error) {
        console.error("Error fetching all users:", error);
        throw new Error("Failed to fetch users: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Updates a user's role in Firestore.
 * @param {string} userId - The ID of the user to update.
 * @param {string} newRole - The new role.
 * @param {object} currentUserData - The current user's Firestore data.
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */
export async function updateUserRoleFirestore(userId, newRole, currentUserData) {
    showLoadingSpinner();
    try {
        // Prevent a user from changing their own role to something lower than founder/co-founder
        if (userId === authInstance.currentUser.uid && (newRole !== 'founder' && newRole !== 'co-founder')) {
            if (currentUserData.role === 'founder' || currentUserData.role === 'co-founder') {
                showMessageModal("Founders/Co-Founders cannot demote themselves.", 'error');
                return false;
            }
        }

        // Only founders/co-founders can assign founder/co-founder roles
        if ((newRole === 'founder' || newRole === 'co-founder') && !(currentUserData.role === 'founder' || currentUserData.role === 'co-founder')) {
            showMessageModal("Only Founders or Co-Founders can assign Founder/Co-Founder roles.", 'error');
            return false;
        }

        const userRef = doc(dbInstance, `artifacts/${appId}/public/data/users`, userId);
        await updateDoc(userRef, { role: newRole });
        return true;
    } catch (error) {
        console.error("Error updating user role:", error);
        throw new Error("Failed to update user role: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Sets a user's banned status in Firestore.
 * @param {string} userId - The ID of the user to ban/unban.
 * @param {boolean} isBanned - True to ban, false to unban.
 * @param {object} currentUserData - The current user's Firestore data.
 * @returns {Promise<void>}
 */
export async function setUserBanStatusFirestore(userId, isBanned, currentUserData) {
    showLoadingSpinner();
    try {
        if (userId === authInstance.currentUser.uid) {
            showMessageModal("You cannot ban/unban your own account.", 'error');
            return;
        }
        // Founders/Co-Founders cannot be banned by anyone other than another founder/co-founder
        const targetUserDoc = await getDoc(doc(dbInstance, `artifacts/${appId}/public/data/users`, userId));
        const targetUserRole = targetUserDoc.exists() ? targetUserDoc.data().role : 'member';

        if ((targetUserRole === 'founder' || targetUserRole === 'co-founder') && !(currentUserData.role === 'founder' || currentUserData.role === 'co-founder')) {
            showMessageModal("Only Founders or Co-Founders can ban/unban other Founders/Co-Founders.", 'error');
            return;
        }

        const userRef = doc(dbInstance, `artifacts/${appId}/public/data/users`, userId);
        await updateDoc(userRef, { isBanned: isBanned });
    } catch (error) {
        console.error("Error setting user ban status:", error);
        throw new Error("Failed to update ban status: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Deletes a user account from Firebase Auth and Firestore.
 * @param {string} userId - The ID of the user to delete.
 * @param {object} currentUserData - The current user's Firestore data.
 * @returns {Promise<void>}
 */
export async function deleteUserFirestore(userId, currentUserData) {
    showLoadingSpinner();
    try {
        if (userId === authInstance.currentUser.uid) {
            showMessageModal("You cannot delete your own account from here. Please use the Firebase console for self-deletion if absolutely necessary.", 'error');
            return;
        }

        const targetUserDoc = await getDoc(doc(dbInstance, `artifacts/${appId}/public/data/users`, userId));
        const targetUserRole = targetUserDoc.exists() ? targetUserDoc.data().role : 'member';

        if ((targetUserRole === 'founder' || targetUserRole === 'co-founder') && !(currentUserData.role === 'founder' || currentUserData.role === 'co-founder')) {
            showMessageModal("Only Founders or Co-Founders can delete other Founders/Co-Founders.", 'error');
            return;
        }

        // Delete user document from Firestore first
        const userRef = doc(dbInstance, `artifacts/${appId}/public/data/users`, userId);
        await deleteDoc(userRef);

        // Note: Deleting from Firebase Auth requires special admin SDK or the user themselves.
        // For a client-side app, direct deletion of *other* users from Auth is not possible.
        // This function will only delete the Firestore document.
        // A Cloud Function would be needed to delete the Auth user.
        showMessageModal("User's Firestore data deleted. Note: Firebase Auth user deletion requires server-side operations or self-deletion by the user.", 'info');

    } catch (error) {
        console.error("Error deleting user:", error);
        throw new Error("Failed to delete user: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}


/**
 * Creates a new forum post.
 * @param {string} title - The post title.
 * @param {string} content - The post content.
 * @param {object} currentUser - The current Firebase Auth user.
 * @param {object} userData - The current user's Firestore data.
 * @returns {Promise<void>}
 */
export async function createPostFirestore(title, content, currentUser, userData) {
    showLoadingSpinner();
    try {
        const postsCol = collection(dbInstance, `artifacts/${appId}/public/data/posts`);
        await addDoc(postsCol, {
            title,
            content,
            authorId: currentUser.uid,
            authorUsername: userData.username || currentUser.email,
            timestamp: serverTimestamp(),
            reactions: {}, // { emoji: count }
            comments: [] // { authorId, authorUsername, text, timestamp }
        });
    } catch (error) {
        console.error("Error creating post:", error);
        throw new Error("Failed to create post: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Updates an existing forum post.
 * @param {string} postId - The ID of the post to update.
 * @param {string} title - The new title.
 * @param {string} content - The new content.
 * @param {object} currentUser - The current Firebase Auth user.
 * @param {object} userData - The current user's Firestore data.
 * @returns {Promise<void>}
 */
export async function updatePostFirestore(postId, title, content, currentUser, userData) {
    showLoadingSpinner();
    try {
        const postRef = doc(dbInstance, `artifacts/${appId}/public/data/posts`, postId);
        await updateDoc(postRef, {
            title,
            content,
            lastEditedAt: serverTimestamp(),
            lastEditedBy: userData.username || currentUser.email
        });
    } catch (error) {
        console.error("Error updating post:", error);
        throw new Error("Failed to update post: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Deletes a forum post.
 * @param {string} postId - The ID of the post to delete.
 * @returns {Promise<void>}
 */
export async function deletePostFirestore(postId) {
    showLoadingSpinner();
    try {
        const postRef = doc(dbInstance, `artifacts/${appId}/public/data/posts`, postId);
        await deleteDoc(postRef);
    } catch (error) {
        console.error("Error deleting post:", error);
        throw new Error("Failed to delete post: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Adds a reaction to a post.
 * @param {string} postId - The ID of the post.
 * @param {string} emoji - The emoji reaction.
 * @returns {Promise<void>}
 */
export async function addReactionToPost(postId, emoji) {
    showLoadingSpinner();
    try {
        const postRef = doc(dbInstance, `artifacts/${appId}/public/data/posts`, postId);
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) {
            const currentReactions = postSnap.data().reactions || {};
            const newReactions = { ...currentReactions };

            // Increment the count for the emoji
            newReactions[emoji] = (newReactions[emoji] || 0) + 1;

            await updateDoc(postRef, { reactions: newReactions });
        }
    } catch (error) {
        console.error("Error adding reaction:", error);
        throw new Error("Failed to add reaction: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Adds a comment to a post.
 * @param {string} postId - The ID of the post.
 * @param {string} commentText - The comment text.
 * @param {object} currentUser - The current Firebase Auth user.
 * @param {object} userData - The current user's Firestore data.
 * @returns {Promise<void>}
 */
export async function addCommentToPost(postId, commentText, currentUser, userData) {
    showLoadingSpinner();
    try {
        const postRef = doc(dbInstance, `artifacts/${appId}/public/data/posts`, postId);
        const newComment = {
            authorId: currentUser.uid,
            authorUsername: userData.username || currentUser.email,
            text: commentText,
            timestamp: new Date().toISOString() // Use ISO string for consistent sorting/display
        };
        await updateDoc(postRef, {
            comments: arrayUnion(newComment)
        });
    } catch (error) {
        console.error("Error adding comment:", error);
        throw new Error("Failed to add comment: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Fetches all forum posts from Firestore.
 * @returns {Promise<Array<object>>} An array of post data objects.
 */
export async function fetchAllPostsFirestore() {
    showLoadingSpinner();
    try {
        const postsCol = collection(dbInstance, `artifacts/${appId}/public/data/posts`);
        // Order by timestamp descending to show newest first
        const q = query(postsCol, orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        const posts = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // Convert Firebase Timestamp to a readable string if it exists
            const timestamp = data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate().toLocaleString() : new Date(data.timestamp).toLocaleString()) : 'N/A';
            posts.push({ id: doc.id, ...data, timestamp });
        });
        return posts;
    } catch (error) {
        console.error("Error fetching all posts:", error);
        throw new Error("Failed to fetch posts: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Sends an email to a specified user (simulated, as direct email sending from client is not possible).
 * @param {string} recipientEmail - The email address of the recipient.
 * @param {string} subject - The email subject.
 * @param {string} message - The email message body.
 * @param {string} imageUrl - Optional image URL to include.
 * @param {object} currentUser - The current Firebase Auth user.
 * @param {object} userData - The current user's Firestore data.
 * @returns {Promise<void>}
 */
export async function sendEmailToUserFirestore(recipientEmail, subject, message, imageUrl, currentUser, userData) {
    showLoadingSpinner();
    try {
        // In a real application, this would trigger a Cloud Function
        // that uses a transactional email service (e.g., SendGrid, Mailgun).
        // For this client-side demo, we'll simulate it by logging and storing a record.
        console.log(`Simulating email send to: ${recipientEmail}`);
        console.log(`Subject: ${subject}`);
        console.log(`Message: ${message}`);
        if (imageUrl) console.log(`Image URL: ${imageUrl}`);
        console.log(`Sent by: ${userData.username || currentUser.email} (${currentUser.uid})`);

        // Store a record of the sent email in Firestore (optional, for auditing)
        const sentEmailsCol = collection(dbInstance, `artifacts/${appId}/public/data/sentEmails`);
        await addDoc(sentEmailsCol, {
            senderId: currentUser.uid,
            senderEmail: currentUser.email,
            recipientEmail: recipientEmail,
            subject: subject,
            message: message,
            imageUrl: imageUrl || null,
            sentAt: serverTimestamp()
        });
        showMessageModal("Email simulated and logged successfully!");
    } catch (error) {
        console.error("Error sending email:", error);
        throw new Error("Failed to send email: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Fetches the Partner Terms of Service content.
 * @returns {Promise<string>} The TOS content.
 */
export async function fetchPartnerTOSFirestore() {
    showLoadingSpinner();
    try {
        const tosRef = doc(dbInstance, `artifacts/${appId}/public/data/settings/partnerTOS`);
        const docSnap = await getDoc(tosRef);
        if (docSnap.exists() && docSnap.data().content) {
            return docSnap.data().content;
        } else {
            // Default content if not found
            return "No Partner Terms of Service defined yet. Please check back later.";
        }
    } catch (error) {
        console.error("Error fetching Partner TOS:", error);
        throw new Error("Failed to fetch Partner TOS: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Updates the Partner Terms of Service content.
 * @param {string} newContent - The new TOS content.
 * @param {object} currentUser - The current Firebase Auth user.
 * @param {object} userData - The current user's Firestore data.
 * @returns {Promise<void>}
 */
export async function updatePartnerTOSFirestore(newContent, currentUser, userData) {
    showLoadingSpinner();
    try {
        const tosRef = doc(dbInstance, `artifacts/${appId}/public/data/settings/partnerTOS`);
        await setDoc(tosRef, {
            content: newContent,
            lastUpdatedBy: userData.username || currentUser.email,
            lastUpdatedAt: serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error("Error updating Partner TOS:", error);
        throw new Error("Failed to update Partner TOS: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}


/**
 * Fetches partner application questions.
 * @returns {Promise<Array<object>>} An array of question objects.
 */
export async function fetchPartnerApplicationQuestionsFirestore() {
    showLoadingSpinner();
    try {
        const questionsRef = doc(dbInstance, `artifacts/${appId}/public/data/settings/partnerApplicationQuestions`);
        const docSnap = await getDoc(questionsRef);
        if (docSnap.exists() && docSnap.data().questions) {
            return docSnap.data().questions;
        }
        return []; // Return empty array if no questions defined
    } catch (error) {
        console.error("Error fetching partner application questions:", error);
        throw new Error("Failed to fetch partner application questions: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Updates partner application questions.
 * @param {Array<object>} questions - Array of question objects.
 * @param {object} currentUser - The current Firebase Auth user.
 * @param {object} userData - The current user's Firestore data.
 * @returns {Promise<void>}
 */
export async function updatePartnerApplicationQuestionsFirestore(questions, currentUser, userData) {
    showLoadingSpinner();
    try {
        const questionsRef = doc(dbInstance, `artifacts/${appId}/public/data/settings/partnerApplicationQuestions`);
        await setDoc(questionsRef, {
            questions: questions,
            lastUpdatedBy: userData.username || currentUser.email,
            lastUpdatedAt: serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error("Error updating partner application questions:", error);
        throw new Error("Failed to update partner application questions: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}


/**
 * Submits a new partner application.
 * @param {object} applicationData - The application form data.
 * @param {object} currentUser - The current Firebase Auth user.
 * @param {object} userData - The current user's Firestore data.
 * @returns {Promise<void>}
 */
export async function submitPartnerApplicationFirestore(applicationData, currentUser, userData) {
    showLoadingSpinner();
    try {
        const applicationsCol = collection(dbInstance, `artifacts/${appId}/public/data/partnerApplications`);
        await addDoc(applicationsCol, {
            applicantId: currentUser.uid,
            applicantUsername: userData.username || currentUser.email,
            applicantEmail: currentUser.email,
            status: 'pending', // 'pending', 'approved', 'denied'
            timestamp: serverTimestamp(),
            ...applicationData
        });
        showMessageModal("Your partner application has been submitted successfully!");
    } catch (error) {
        console.error("Error submitting partner application:", error);
        throw new Error("Failed to submit application: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Fetches all partner applications.
 * @returns {Promise<Array<object>>} An array of application objects.
 */
export async function fetchAllPartnerApplicationsFirestore() {
    showLoadingSpinner();
    try {
        const applicationsCol = collection(dbInstance, `artifacts/${appId}/public/data/partnerApplications`);
        const q = query(applicationsCol, orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        const applications = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const timestamp = data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate().toLocaleString() : new Date(data.timestamp).toLocaleString()) : 'N/A';
            applications.push({ id: doc.id, ...data, timestamp });
        });
        return applications;
    } catch (error) {
        console.error("Error fetching partner applications:", error);
        throw new Error("Failed to fetch partner applications: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Updates the status of a partner application.
 * @param {string} applicationId - The ID of the application.
 * @param {'approved'|'denied'} status - The new status.
 * @param {object} currentUser - The current Firebase Auth user.
 * @param {object} userData - The current user's Firestore data.
 * @returns {Promise<void>}
 */
export async function updatePartnerApplicationStatusFirestore(applicationId, status, currentUser, userData) {
    showLoadingSpinner();
    try {
        const applicationRef = doc(dbInstance, `artifacts/${appId}/public/data/partnerApplications`, applicationId);
        await updateDoc(applicationRef, {
            status: status,
            reviewedBy: userData.username || currentUser.email,
            reviewedAt: serverTimestamp()
        });
        showMessageModal(`Application status updated to ${status}.`);
    } catch (error) {
        console.error("Error updating application status:", error);
        throw new Error("Failed to update application status: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Fetches all videos from Firestore.
 * @returns {Promise<Array<object>>} An array of video objects.
 */
export async function fetchVideosFirestore() {
    showLoadingSpinner();
    try {
        const videosCol = collection(dbInstance, `artifacts/${appId}/public/data/videos`);
        const q = query(videosCol, orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        const videos = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const timestamp = data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate().toLocaleString() : new Date(data.timestamp).toLocaleString()) : 'N/A';
            videos.push({ id: doc.id, ...data, timestamp });
        });
        return videos;
    } catch (error) {
        console.error("Error fetching videos:", error);
        throw new Error("Failed to fetch videos: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Adds a new video to Firestore.
 * @param {object} videoData - The video data (name, youtubeLink, description, thumbnailUrl).
 * @param {object} currentUser - The current Firebase Auth user.
 * @param {object} userData - The current user's Firestore data.
 * @returns {Promise<void>}
 */
export async function addVideoFirestore(videoData, currentUser, userData) {
    showLoadingSpinner();
    try {
        const videosCol = collection(dbInstance, `artifacts/${appId}/public/data/videos`);
        await addDoc(videosCol, {
            ...videoData,
            authorId: currentUser.uid,
            authorUsername: userData.username || currentUser.email,
            timestamp: serverTimestamp()
        });
        showMessageModal("Video added successfully!");
    } catch (error) {
        console.error("Error adding video:", error);
        throw new Error("Failed to add video: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Updates an existing video in Firestore.
 * @param {string} videoId - The ID of the video to update.
 * @param {object} videoData - The updated video data.
 * @param {object} currentUser - The current Firebase Auth user.
 * @param {object} userData - The current user's Firestore data.
 * @returns {Promise<void>}
 */
export async function updateVideoFirestore(videoId, videoData, currentUser, userData) {
    showLoadingSpinner();
    try {
        const videoRef = doc(dbInstance, `artifacts/${appId}/public/data/videos`, videoId);
        await updateDoc(videoRef, {
            ...videoData,
            lastEditedBy: userData.username || currentUser.email,
            lastEditedAt: serverTimestamp()
        });
        showMessageModal("Video updated successfully!");
    } catch (error) {
        console.error("Error updating video:", error);
        throw new Error("Failed to update video: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Deletes a video from Firestore.
 * @param {string} videoId - The ID of the video to delete.
 * @returns {Promise<void>}
 */
export async function deleteVideoFirestore(videoId) {
    showLoadingSpinner();
    try {
        const videoRef = doc(dbInstance, `artifacts/${appId}/public/data/videos`, videoId);
        await deleteDoc(videoRef);
        showMessageModal("Video deleted successfully!");
    } catch (error) {
        console.error("Error deleting video:", error);
        throw new Error("Failed to delete video: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Submits a code snippet for review.
 * @param {object} snippetData - The snippet data (title, language, code).
 * @param {object} currentUser - The current Firebase Auth user.
 * @param {object} userData - The current user's Firestore data.
 * @returns {Promise<void>}
 */
export async function submitCodeSnippet(snippetData, currentUser, userData) {
    showLoadingSpinner();
    try {
        const codeSubmissionsCol = collection(dbInstance, `artifacts/${appId}/public/data/codeSubmissions`);
        await addDoc(codeSubmissionsCol, {
            ...snippetData,
            authorId: currentUser.uid,
            authorUsername: userData.username || currentUser.email,
            timestamp: serverTimestamp(),
            status: 'pending' // 'pending', 'approved', 'denied'
        });
        showMessageModal("Code snippet submitted for review!");
    } catch (error) {
        console.error("Error submitting code snippet:", error);
        throw new Error("Failed to submit code: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Fetches all code submissions (for admin review).
 * @returns {Promise<Array<object>>} An array of code submission objects.
 */
export async function fetchAllCodeSubmissions() {
    showLoadingSpinner();
    try {
        const submissionsCol = collection(dbInstance, `artifacts/${appId}/public/data/codeSubmissions`);
        const q = query(submissionsCol, orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        const submissions = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const timestamp = data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate().toLocaleString() : new Date(data.timestamp).toLocaleString()) : 'N/A';
            submissions.push({ id: doc.id, ...data, timestamp });
        });
        return submissions;
    } catch (error) {
        console.error("Error fetching code submissions:", error);
        throw new Error("Failed to fetch code submissions: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Updates the status of a code submission.
 * @param {string} submissionId - The ID of the submission.
 * @param {'approved'|'denied'} status - The new status.
 * @param {object} currentUser - The current Firebase Auth user.
 * @param {object} userData - The current user's Firestore data.
 * @returns {Promise<void>}
 */
export async function updateCodeSubmissionStatus(submissionId, status, currentUser, userData) {
    showLoadingSpinner();
    try {
        const submissionRef = doc(dbInstance, `artifacts/${appId}/public/data/codeSubmissions`, submissionId);
        await updateDoc(submissionRef, {
            status: status,
            reviewedBy: userData.username || currentUser.email,
            reviewedAt: serverTimestamp()
        });
        showMessageModal(`Code submission status updated to ${status}.`);
    } catch (error) {
        console.error("Error updating code submission status:", error);
        throw new Error("Failed to update submission status: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Fetches all approved code snippets.
 * @returns {Promise<Array<object>>} An array of approved code snippet objects.
 */
export async function fetchAllApprovedCodeSnippets() {
    showLoadingSpinner();
    try {
        const submissionsCol = collection(dbInstance, `artifacts/${appId}/public/data/codeSubmissions`);
        const q = query(submissionsCol, where('status', '==', 'approved'), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        const snippets = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const timestamp = data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate().toLocaleString() : new Date(data.timestamp).toLocaleString()) : 'N/A';
            snippets.push({ id: doc.id, ...data, timestamp });
        });
        return snippets;
    } catch (error) {
        console.error("Error fetching approved code snippets:", error);
        throw new Error("Failed to fetch approved code snippets: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}
