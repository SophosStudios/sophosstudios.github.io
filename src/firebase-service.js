// src/firebase-service.js
// Handles all Firebase Authentication and Firestore operations.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, query, onSnapshot, deleteDoc, orderBy, serverTimestamp, deleteField, addDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

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
 * Returns the Firebase Auth instance.
 * @returns {Auth}
 */
export function getFirebaseAuth() {
    return authInstance;
}

/**
 * Returns the Firebase Firestore instance.
 * @returns {Firestore}
 */
export function getFirebaseFirestore() {
    return dbInstance;
}

/**
 * Returns the application ID.
 * @returns {string}
 */
export function getAppId() {
    return APP_ID;
}

/**
 * Returns the Google Auth Provider instance.
 * @returns {GoogleAuthProvider}
 */
export function getGoogleAuthProvider() {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    return provider;
}

/**
 * Updates a user's role in Firestore based on configured admin/founder emails.
 * This function is called during authentication to automatically grant roles.
 * @param {string} userId - The UID of the user.
 * @param {string} userEmail - The email of the user.
 * @param {string} currentRole - The user's current role from Firestore.
 * @returns {Promise<string>} - The updated role or the current role if no change.
 */
async function updateUserRoleFromConfig(userId, userEmail, currentRole) {
    let newRole = currentRole;
    const userDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/users`, userId);

    // Check for founder role first (highest privilege)
    if (CONFIG.founderEmails && CONFIG.founderEmails.includes(userEmail)) {
        if (currentRole !== 'founder') {
            newRole = 'founder';
            await updateDoc(userDocRef, { role: newRole });
            console.log(`User ${userEmail} automatically promoted to founder.`);
        }
    }
    // Then check for admin role, only if not already a founder or higher
    else if (CONFIG.adminEmails && CONFIG.adminEmails.includes(userEmail)) {
        if (currentRole !== 'admin' && currentRole !== 'founder' && currentRole !== 'co-founder') {
            newRole = 'admin';
            await updateDoc(userDocRef, { role: newRole });
            console.log(`User ${userEmail} automatically promoted to admin.`);
        }
    }
    return newRole;
}

/**
 * Authenticates a user (login or signup) with Firebase Auth and stores user data in Firestore.
 * Handles Email/Password and Google authentication.
 * @param {string} type - 'login', 'signup', or 'google'.
 * @param {object} formData - { email, password, username (for signup) }.
 * @returns {Promise<object>} - User data or throws error.
 */
export async function authenticateUser(type, formData) {
    showLoadingSpinner();
    try {
        let userCredential;
        let user;
        const googleProvider = getGoogleAuthProvider();

        if (type === 'google') {
            userCredential = await signInWithPopup(authInstance, googleProvider);
            user = userCredential.user;
        } else if (type === 'signup') {
            userCredential = await createUserWithEmailAndPassword(authInstance, formData.email, formData.password);
            user = userCredential.user;
        } else { // login
            userCredential = await signInWithEmailAndPassword(authInstance, formData.email, formData.password);
            user = userCredential.user;
        }

        const userDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/users`, user.uid);
        const docSnap = await getDoc(userDocRef);

        let fetchedUserData;
        if (docSnap.exists()) {
            fetchedUserData = docSnap.data();
            if (fetchedUserData.isBanned) {
                await signOut(authInstance);
                throw new Error("Your account has been banned. Please contact support for more information.");
            }
            fetchedUserData.role = await updateUserRoleFromConfig(user.uid, user.email, fetchedUserData.role);
        } else {
            const usernameToUse = formData.username || user.displayName || user.email?.split('@')[0] || 'User';
            const profilePicToUse = user.photoURL || `https://placehold.co/100x100/F0F0F0/000000?text=${usernameToUse.charAt(0).toUpperCase()}`;

            let initialRole = 'member';
            if (CONFIG.founderEmails && CONFIG.founderEmails.includes(user.email)) {
                initialRole = 'founder';
            } else if (CONFIG.adminEmails && CONFIG.adminEmails.includes(user.email)) {
                initialRole = 'admin';
            }

            await setDoc(userDocRef, {
                email: user.email,
                username: usernameToUse,
                role: initialRole,
                profilePicUrl: profilePicToUse,
                backgroundUrl: 'bg-gradient-to-r from-blue-400 to-purple-600',
                bio: '',
                partnerInfo: {
                    description: '',
                    links: {}
                },
                theme: 'light'
            });
            const newDocSnap = await getDoc(userDocRef);
            fetchedUserData = newDocSnap.data();
        }
        return fetchedUserData;

    } catch (error) {
        console.error("Firebase Auth error:", error.message);
        let errorMessage = "An unknown error occurred.";
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'This email is already in use.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password should be at least 6 characters.';
        } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            errorMessage = 'Invalid email or password.';
        } else if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'Authentication popup closed.';
        } else if (error.code === 'auth/cancelled-popup-request') {
            errorMessage = 'Authentication request cancelled.';
        } else if (error.code === 'auth/unauthorized-domain') {
            errorMessage = 'Unauthorized domain. Add your website URL to Firebase Authentication Authorized Domains.';
        } else if (error.code === 'auth/invalid-api-key') {
            errorMessage = 'Invalid Firebase API Key. Please check your firebaseConfig.';
        } else if (error.code === 'auth/account-exists-with-different-credential') {
            errorMessage = 'Account already exists with a different login method. Try signing in with that method.';
        } else if (error.message.includes("Your account has been banned")) {
            errorMessage = error.message;
        }
        throw new Error(errorMessage);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Sends a password reset email.
 * @param {string} email - User's email for password reset.
 * @returns {Promise<void>}
 */
export async function sendPasswordReset(email) {
    showLoadingSpinner();
    try {
        await sendPasswordResetEmail(authInstance, email);
    } catch (error) {
        console.error("Password reset error:", error.message);
        let errorMessage = "Failed to send password reset email. Please try again.";
        if (error.code === 'auth/user-not-found') {
            errorMessage = "No account found with that email address.";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "Invalid email format.";
        }
        throw new Error(errorMessage);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Fetches the current user's data from Firestore.
 * If the user exists in Firebase Auth but not Firestore, a new user document is created.
 * @param {object} currentUser - The Firebase Auth user object.
 * @returns {Promise<object|null>} - User data or null if not authenticated/found.
 */
export async function fetchCurrentUserFirestoreData(currentUser) {
    if (!currentUser) return null;

    showLoadingSpinner();
    try {
        const userDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/users`, currentUser.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            const fetchedData = docSnap.data();
            // Check and update role based on config for existing users
            fetchedData.role = await updateUserRoleFromConfig(currentUser.uid, currentUser.email, fetchedData.role);
            return fetchedData;
        } else {
            // User exists in Auth but not Firestore (e.g., first login after database reset, or a new Google user)
            console.warn("Firestore document for user not found for existing auth user. Creating default entry.");
            const usernameToUse = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
            const profilePicToUse = currentUser.photoURL || `https://placehold.co/100x100/F0F0F0/000000?text=${usernameToUse.charAt(0).toUpperCase()}`;

            let initialRole = 'member';
            if (CONFIG.founderEmails && CONFIG.founderEmails.includes(currentUser.email)) {
                initialRole = 'founder';
            } else if (CONFIG.adminEmails && CONFIG.adminEmails.includes(currentUser.email)) {
                initialRole = 'admin';
            }

            await setDoc(userDocRef, {
                email: currentUser.email,
                username: usernameToUse,
                role: initialRole,
                profilePicUrl: profilePicToUse,
                backgroundUrl: 'bg-gradient-to-r from-blue-400 to-purple-600',
                bio: '',
                partnerInfo: {
                    description: '',
                    links: {}
                },
                theme: 'light'
            });
            const newDocSnap = await getDoc(userDocRef);
            return newDocSnap.exists() ? newDocSnap.data() : null; // Return newly created data
        }
    } catch (error) {
        console.error("Error fetching/creating user data from Firestore:", error.message);
        return null;
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Updates a user's profile data in Firestore.
 * Can be used by the user themselves or by an admin/founder/co-founder for other users.
 * @param {string} userIdToUpdate - The UID of the user whose profile is being updated.
 * @param {object} newUserData - Data to update (username, profilePicUrl, backgroundUrl, bio, partnerInfo, theme).
 * @param {object} currentAuthUser - The current authenticated Firebase user.
 * @param {object} currentLoggedInUserData - The Firestore data of the currently logged-in user (for role checks).
 * @returns {Promise<object>} - Updated user data.
 */
export async function updateProfileData(userIdToUpdate, newUserData, currentAuthUser, currentLoggedInUserData) {
    if (!currentAuthUser) {
        throw new Error("You must be logged in to update profiles.");
    }

    const isAuthorized = (currentAuthUser.uid === userIdToUpdate) ||
                         (currentLoggedInUserData.role === 'admin' || currentLoggedInUserData.role === 'founder' || currentLoggedInUserData.role === 'co-founder');

    if (!isAuthorized) {
        throw new Error("Not authorized to update this profile.");
    }

    showLoadingSpinner();
    try {
        const userDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/users`, userIdToUpdate);

        if (currentAuthUser.uid === userIdToUpdate && authInstance.currentUser && newUserData.username && authInstance.currentUser.displayName !== newUserData.username) {
            await updateProfile(authInstance.currentUser, { displayName: newUserData.username });
        }

        await updateDoc(userDocRef, newUserData);

        if (currentAuthUser.uid === userIdToUpdate) {
            const docSnap = await getDoc(userDocRef);
            return docSnap.exists() ? docSnap.data() : null;
        } else {
            return { success: true };
        }
    } catch (error) {
        console.error("Error updating profile in Firestore:", error.message);
        throw new Error("Failed to update profile. Please try again: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Fetches all users for the admin panel from Firestore.
 * @returns {Promise<Array<object>>} - List of all users.
 */
export async function fetchAllUsersFirestore() {
    showLoadingSpinner();
    try {
        const usersCollectionRef = collection(dbInstance, `/artifacts/${APP_ID}/public/data/users`);
        const q = query(usersCollectionRef);

        const querySnapshot = await new Promise((resolve, reject) => {
            const unsubscribe = onSnapshot(q, (snapshot) => {
                unsubscribe();
                resolve(snapshot);
            }, (error) => {
                reject(error);
            });
        });

        const usersData = [];
        querySnapshot.forEach((doc) => {
            usersData.push({ id: doc.id, ...doc.data() });
        });
        return usersData;
    } catch (error) {
        console.error("Error fetching all users:", error.message);
        throw new Error("Failed to fetch users list: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Updates a user's role by an admin/founder/co-founder in Firestore.
 * @param {string} userId - ID of the user to update.
 * @param {string} newRole - The new role.
 * @param {object} currentAuthUser - The current authenticated Firebase user.
 * @param {object} currentLoggedInUserData - The Firestore data of the currently logged-in user (for role checks).
 * @returns {Promise<boolean>} - True on success.
 */
export async function updateUserRoleFirestore(userId, newRole, currentAuthUser, currentLoggedInUserData) {
    if (!currentAuthUser || (currentLoggedInUserData.role !== 'admin' && currentLoggedInUserData.role !== 'founder' && currentLoggedInUserData.role !== 'co-founder')) {
        throw new Error("Not authorized to change roles.");
    }

    if ((newRole === 'founder' || newRole === 'co-founder') && (currentLoggedInUserData.role !== 'founder' && currentLoggedInUserData.role !== 'co-founder')) {
        throw new Error("Only a founder or co-founder can assign the 'founder' or 'co-founder' role.");
    }

    if (userId === currentAuthUser.uid) {
        showMessageModal("You cannot change your own role or delete your own account from the admin panel. Please manage your own profile in the 'Profile' section.", 'info');
        return false;
    }

    showLoadingSpinner();
    try {
        const userDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/users`, userId);
        await updateDoc(userDocRef, { role: newRole });
        return true;
    } catch (error) {
        console.error("Error updating user role in Firestore:", error.message);
        throw new Error("Failed to update user role: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Sets a user's banned status.
 * @param {string} userId - The ID of the user to ban/unban.
 * @param {boolean} isBanned - True to ban, false to unban.
 * @param {object} currentAuthUser - The current authenticated Firebase user.
 * @param {object} currentLoggedInUserData - The Firestore data of the currently logged-in user (for role checks).
 * @returns {Promise<boolean>} - True on success.
 */
export async function setUserBanStatusFirestore(userId, isBanned, currentAuthUser, currentLoggedInUserData) {
    if (!currentAuthUser || (currentLoggedInUserData.role !== 'admin' && currentLoggedInUserData.role !== 'founder' && currentLoggedInUserData.role !== 'co-founder')) {
        throw new Error("Not authorized to ban/unban users.");
    }
    if (userId === currentAuthUser.uid) {
        showMessageModal("You cannot ban or unban your own account.", 'info');
        return false;
    }

    showLoadingSpinner();
    try {
        const userDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/users`, userId);
        await updateDoc(userDocRef, { isBanned: isBanned });
        return true;
    } catch (error) {
        console.error("Error setting user ban status in Firestore:", error.message);
        throw new Error("Failed to update user ban status: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Deletes a user's data from Firestore by an admin/founder/co-founder.
 * @param {string} userId - ID of the user to delete.
 * @param {object} currentAuthUser - The current authenticated Firebase user.
 * @param {object} currentLoggedInUserData - The Firestore data of the currently logged-in user (for role checks).
 * @returns {Promise<boolean>} - True on success.
 */
export async function deleteUserFirestore(userId, currentAuthUser, currentLoggedInUserData) {
    if (!currentAuthUser || (currentLoggedInUserData.role !== 'admin' && currentLoggedInUserData.role !== 'founder' && currentLoggedInUserData.role !== 'co-founder')) {
        throw new Error("Not authorized to delete users.");
    }
    if (userId === currentAuthUser.uid) {
        showMessageModal("You cannot delete your own account from the admin panel.", 'info');
        return false;
    }

    showLoadingSpinner();
    try {
        const userDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/users`, userId);
        await deleteDoc(userDocRef);
        return true;
    } catch (error) {
        console.error("Error deleting user from Firestore:", error.message);
        throw new Error("Failed to delete user: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Creates a new post in Firestore.
 * @param {string} title - The title of the post.
 * @param {string} content - The content of the post.
 * @param {object} currentAuthUser - The current authenticated Firebase user.
 * @param {object} currentLoggedInUserData - The Firestore data of the currently logged-in user.
 * @returns {Promise<void>}
 */
export async function createPostFirestore(title, content, currentAuthUser, currentLoggedInUserData) {
    if (!currentAuthUser || (currentLoggedInUserData.role !== 'admin' && currentLoggedInUserData.role !== 'founder' && currentLoggedInUserData.role !== 'co-founder')) {
        throw new Error("Only admins, founders, and co-founders can create posts.");
    }
    showLoadingSpinner();
    try {
        const postsCollectionRef = collection(dbInstance, `/artifacts/${APP_ID}/public/data/posts`);
        await setDoc(doc(postsCollectionRef), {
            title: title,
            content: content,
            authorId: currentAuthUser.uid,
            authorUsername: currentLoggedInUserData.username || currentAuthUser.displayName || currentAuthUser.email,
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
 * Updates an existing post in Firestore.
 * @param {string} postId - The ID of the post to update.
 * @param {string} title - The new title.
 * @param {string} content - The new content.
 * @param {object} currentAuthUser - The current authenticated Firebase user.
 * @param {object} currentLoggedInUserData - The Firestore data of the currently logged-in user.
 * @returns {Promise<void>}
 */
export async function updatePostFirestore(postId, title, content, currentAuthUser, currentLoggedInUserData) {
    if (!currentAuthUser || (currentLoggedInUserData.role !== 'admin' && currentLoggedInUserData.role !== 'founder' && currentLoggedInUserData.role !== 'co-founder')) {
        throw new Error("Only admins, founders, and co-founders can edit posts.");
    }
    showLoadingSpinner();
    try {
        const postDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/posts`, postId);
        await updateDoc(postDocRef, {
            title: title,
            content: content,
        });
        showMessageModal('Post updated successfully!');
    } catch (error) {
        console.error("Error updating post:", error.message);
        throw new Error("Failed to update post: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Deletes a post from Firestore.
 * @param {string} postId - The ID of the post to delete.
 * @param {object} currentAuthUser - The current authenticated Firebase user.
 * @param {object} currentLoggedInUserData - The Firestore data of the currently logged-in user.
 * @returns {Promise<void>}
 */
export async function deletePostFirestore(postId, currentAuthUser, currentLoggedInUserData) {
    if (!currentAuthUser || (currentLoggedInUserData.role !== 'admin' && currentLoggedInUserData.role !== 'founder' && currentLoggedInUserData.role !== 'co-founder')) {
        throw new Error("Only admins, founders, and co-founders can delete posts.");
    }
    showLoadingSpinner();
    try {
        const postDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/posts`, postId);
        await deleteDoc(postDocRef);
        showMessageModal('Post deleted successfully!');
    } catch (error) {
        console.error("Error deleting post:", error.message);
        throw new Error("Failed to delete post: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Adds/updates a reaction to a post.
 * @param {string} postId - The ID of the post.
 * @param {string} emoji - The emoji character.
 * @param {object} currentAuthUser - The current authenticated Firebase user.
 * @returns {Promise<void>}
 */
export async function addReactionToPost(postId, emoji, currentAuthUser) {
    if (!currentAuthUser) {
        showMessageModal("You must be logged in to react to posts.", 'info');
        return;
    }
    showLoadingSpinner();
    try {
        const postDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/posts`, postId);
        const postSnap = await getDoc(postDocRef);

        if (postSnap.exists()) {
            const postData = postSnap.data();
            const currentReactions = postData.reactions || {};
            const userPreviousReaction = postData.userReactions ? postData.userReactions[currentAuthUser.uid] : null;

            const updates = {};

            if (userPreviousReaction && userPreviousReaction !== emoji) {
                updates[`reactions.${userPreviousReaction}`] = Math.max(0, (currentReactions[userPreviousReaction] || 0) - 1);
                if (updates[`reactions.${userPreviousReaction}`] <= 0) {
                    updates[`reactions.${userPreviousReaction}`] = deleteField();
                }
            }

            if (userPreviousReaction === emoji) {
                updates[`reactions.${emoji}`] = Math.max(0, (currentReactions[emoji] || 0) - 1);
                if (updates[`reactions.${emoji}`] <= 0) {
                    updates[`reactions.${emoji}`] = deleteField();
                }
                updates[`userReactions.${currentAuthUser.uid}`] = deleteField();
            } else {
                updates[`reactions.${emoji}`] = (currentReactions[emoji] || 0) + 1;
                updates[`userReactions.${currentAuthUser.uid}`] = emoji;
            }

            await updateDoc(postDocRef, updates);
        }
    } catch (error) {
        console.error("Error adding reaction:", error.message);
        showMessageModal("Failed to add reaction: " + error.message, 'error');
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Adds a comment to a post.
 * @param {string} postId - The ID of the post.
 * @param {string} commentText - The comment content.
 * @param {object} currentAuthUser - The current authenticated Firebase user.
 * @param {object} currentLoggedInUserData - The Firestore data of the currently logged-in user.
 * @returns {Promise<void>}
 */
export async function addCommentToPost(postId, commentText, currentAuthUser, currentLoggedInUserData) {
    if (!currentAuthUser) {
        showMessageModal("You must be logged in to comment on posts.", 'info');
        return;
    }
    if (!commentText.trim()) {
        showMessageModal("Comment cannot be empty.", 'info');
        return;
    }

    showLoadingSpinner();
    try {
        const postDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/posts`, postId);
        const newComment = {
            authorId: currentAuthUser.uid,
            authorUsername: currentLoggedInUserData.username || currentAuthUser.displayName || currentAuthUser.email,
            text: commentText,
            timestamp: new Date().toISOString()
        };
        await updateDoc(postDocRef, {
            comments: arrayUnion(newComment)
        });
        showMessageModal('Comment added successfully!');
    } catch (error) {
        console.error("Error adding comment:", error.message);
        showMessageModal("Failed to add comment: " + error.message, 'error');
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Fetches all posts from Firestore, ordered by timestamp.
 * @returns {Promise<Array<object>>} - List of all posts.
 */
export async function fetchAllPostsFirestore() {
    showLoadingSpinner();
    try {
        const postsCollectionRef = collection(dbInstance, `/artifacts/${APP_ID}/public/data/posts`);
        const q = query(postsCollectionRef, orderBy('timestamp', 'desc'));

        const querySnapshot = await new Promise((resolve, reject) => {
            const unsubscribe = onSnapshot(q, (snapshot) => {
                unsubscribe();
                resolve(snapshot);
            }, (error) => {
                reject(error);
            });
        });

        const postsData = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            postsData.push({
                id: doc.id,
                title: data.title,
                content: data.content,
                authorUsername: data.authorUsername,
                timestamp: data.timestamp ? (typeof data.timestamp === 'string' ? new Date(data.timestamp).toLocaleString() : data.timestamp.toDate().toLocaleString()) : 'N/A',
                reactions: data.reactions || {},
                comments: data.comments || []
            });
        });
        return postsData;
    } catch (error) {
        console.error("Error fetching posts:", error.message);
        throw new Error("Failed to fetch posts: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Simulates sending an email by storing its content in Firestore.
 * @param {string} recipientEmail - The email address of the recipient.
 * @param {string} subject - The subject of the email.
 * @param {string} message - The body of the email.
 * @param {string} [imageUrl=null] - Optional URL of an image attachment.
 * @param {object} currentAuthUser - The current authenticated Firebase user.
 * @param {object} currentLoggedInUserData - The Firestore data of the currently logged-in user.
 * @returns {Promise<void>}
 */
export async function sendEmailToUserFirestore(recipientEmail, subject, message, imageUrl = null, currentAuthUser, currentLoggedInUserData) {
    if (!currentAuthUser || (currentLoggedInUserData.role !== 'admin' && currentLoggedInUserData.role !== 'founder' && currentLoggedInUserData.role !== 'co-founder')) {
        throw new Error("Not authorized to send emails.");
    }
    showLoadingSpinner();
    try {
        const sentEmailsCollectionRef = collection(dbInstance, `/artifacts/${APP_ID}/public/data/sentEmails`);
        await addDoc(sentEmailsCollectionRef, {
            senderId: currentAuthUser.uid,
            senderUsername: currentLoggedInUserData.username || currentAuthUser.displayName || currentAuthUser.email,
            recipientEmail: recipientEmail,
            subject: subject,
            message: message,
            imageUrl: imageUrl,
            timestamp: serverTimestamp()
        });
        showMessageModal('Email content saved to Firestore (simulated send)!');
    } catch (error) {
        console.error("Error simulating email send to Firestore:", error.message);
        throw new Error("Failed to save email content: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Fetches the Partner TOS content from Firestore.
 * @returns {Promise<string>} - The TOS content or a default message.
 */
export async function fetchPartnerTOSFirestore() {
    showLoadingSpinner();
    try {
        const tosDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/settings`, 'partnerTOS');
        const docSnap = await getDoc(tosDocRef);
        if (docSnap.exists() && docSnap.data().content) {
            return docSnap.data().content;
        }
        return "No partnership terms of service have been set yet. Please check back later.";
    } catch (error) {
        console.error("Error fetching Partner TOS:", error.message);
        return "Failed to load partnership terms. Please try again later.";
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Updates the Partner TOS content in Firestore.
 * @param {string} newContent - The new TOS content.
 * @param {object} currentAuthUser - The current authenticated Firebase user.
 * @param {object} currentLoggedInUserData - The Firestore data of the currently logged-in user.
 * @returns {Promise<void>}
 */
export async function updatePartnerTOSFirestore(newContent, currentAuthUser, currentLoggedInUserData) {
    if (!currentAuthUser || (currentLoggedInUserData.role !== 'admin' && currentLoggedInUserData.role !== 'founder' && currentLoggedInUserData.role !== 'co-founder')) {
        throw new Error("Not authorized to update Partner TOS.");
    }
    showLoadingSpinner();
    try {
        const tosDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/settings`, 'partnerTOS');
        await setDoc(tosDocRef, {
            content: newContent,
            lastUpdated: serverTimestamp(),
            updatedBy: currentAuthUser.uid,
            updatedByUsername: currentLoggedInUserData.username || currentAuthUser.displayName || currentAuthUser.email
        }, { merge: true });
        showMessageModal('Partner TOS updated successfully!');
    } catch (error) {
        console.error("Error updating Partner TOS:", error.message);
        throw new Error("Failed to update Partner TOS: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Fetches the partner application questions from Firestore.
 * @returns {Promise<Array<object>>} - An array of question objects.
 */
export async function fetchPartnerApplicationQuestionsFirestore() {
    showLoadingSpinner();
    try {
        const questionsDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/settings`, 'partnerApplicationQuestions');
        const docSnap = await getDoc(questionsDocRef);
        if (docSnap.exists() && docSnap.data().questions) {
            return docSnap.data().questions;
        }
        // Default questions if none are set
        return [
            { id: 'q_name', type: 'text', label: 'Your Full Name', required: true },
            { id: 'q_email', type: 'email', label: 'Your Contact Email', required: true },
            { id: 'q_birthday', type: 'date', label: 'Your Birthday', required: true },
            { id: 'q_why_partner', type: 'textarea', label: 'Why do you want to be a partner?', required: true },
            { id: 'q_information', type: 'textarea', label: 'Any other information you\'d like to share?', required: false }
        ];
    } catch (error) {
        console.error("Error fetching partner application questions:", error.message);
        showMessageModal("Failed to load application questions. Using default.", 'error');
        return [
            { id: 'q_name', type: 'text', label: 'Your Full Name', required: true },
            { id: 'q_email', type: 'email', label: 'Your Contact Email', required: true },
            { id: 'q_birthday', type: 'date', label: 'Your Birthday', required: true },
            { id: 'q_why_partner', type: 'textarea', label: 'Why do you want to be a partner?', required: true },
            { id: 'q_information', type: 'textarea', label: 'Any other information you\'d like to share?', required: false }
        ];
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Updates the partner application questions in Firestore.
 * @param {Array<object>} questions - An array of question objects to save.
 * @param {object} currentAuthUser - The current authenticated Firebase user.
 * @param {object} currentLoggedInUserData - The Firestore data of the currently logged-in user.
 * @returns {Promise<void>}
 */
export async function updatePartnerApplicationQuestionsFirestore(questions, currentAuthUser, currentLoggedInUserData) {
    if (!currentAuthUser || (currentLoggedInUserData.role !== 'founder' && currentLoggedInUserData.role !== 'co-founder')) {
        throw new Error("Only founders and co-founders can manage partner application questions.");
    }
    showLoadingSpinner();
    try {
        const questionsDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/settings`, 'partnerApplicationQuestions');
        await setDoc(questionsDocRef, {
            questions: questions,
            lastUpdated: serverTimestamp(),
            updatedBy: currentAuthUser.uid,
            updatedByUsername: currentLoggedInUserData.username || currentAuthUser.displayName || currentAuthUser.email
        }, { merge: true });
        showMessageModal('Partner application questions updated successfully!');
    } catch (error) {
        console.error("Error updating partner application questions:", error.message);
        throw new Error("Failed to update questions: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}


/**
 * Submits a partner application to Firestore.
 * @param {object} applicationData - The application data including answers to questions.
 * @param {object} currentAuthUser - The current authenticated Firebase user.
 * @param {object} currentLoggedInUserData - The Firestore data of the currently logged-in user.
 * @returns {Promise<void>}
 */
export async function submitPartnerApplicationFirestore(applicationData, currentAuthUser, currentLoggedInUserData) {
    if (!currentAuthUser) {
        throw new Error("You must be logged in to submit a partner application.");
    }
    showLoadingSpinner();
    try {
        const applicationsCollectionRef = collection(dbInstance, `/artifacts/${APP_ID}/public/data/partnerApplications`);
        await addDoc(applicationsCollectionRef, {
            applicantId: currentAuthUser.uid,
            applicantUsername: currentLoggedInUserData.username || currentAuthUser.displayName || currentAuthUser.email,
            applicantEmail: currentAuthUser.email,
            status: 'pending',
            applicationAnswers: applicationData,
            timestamp: serverTimestamp()
        });
        showMessageModal('Partner application submitted successfully! We will review it soon.');
    } catch (error) {
        console.error("Error submitting partner application:", error.message);
        throw new Error("Failed to submit application: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Fetches all partner applications for admin review.
 * @param {object} currentAuthUser - The current authenticated Firebase user.
 * @param {object} currentLoggedInUserData - The Firestore data of the currently logged-in user.
 * @returns {Promise<Array<object>>} - List of partner applications.
 */
export async function fetchAllPartnerApplicationsFirestore(currentAuthUser, currentLoggedInUserData) {
    if (!currentAuthUser || (currentLoggedInUserData.role !== 'admin' && currentLoggedInUserData.role !== 'founder' && currentLoggedInUserData.role !== 'co-founder')) {
        throw new Error("Not authorized to view partner applications.");
    }
    showLoadingSpinner();
    try {
        const applicationsCollectionRef = collection(dbInstance, `/artifacts/${APP_ID}/public/data/partnerApplications`);
        const q = query(applicationsCollectionRef, orderBy('timestamp', 'desc'));

        const querySnapshot = await new Promise((resolve, reject) => {
            const unsubscribe = onSnapshot(q, (snapshot) => {
                unsubscribe();
                resolve(snapshot);
            }, (error) => {
                reject(error);
            });
        });

        const applicationsData = [];
        querySnapshot.forEach((doc) => {
            applicationsData.push({ id: doc.id, ...doc.data() });
        });
        return applicationsData;
    } catch (error) {
        console.error("Error fetching partner applications:", error.message);
        throw new Error("Failed to fetch partner applications: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Updates the status of a partner application and optionally updates user role.
 * @param {string} applicationId - The ID of the application to update.
 * @param {string} status - The new status ('approved', 'rejected').
 * @param {string} reviewNotes - Optional notes from the reviewer.
 * @param {string} applicantId - The UID of the applicant.
 * @param {object} currentAuthUser - The current authenticated Firebase user.
 * @param {object} currentLoggedInUserData - The Firestore data of the currently logged-in user.
 * @returns {Promise<void>}
 */
export async function updatePartnerApplicationStatusFirestore(applicationId, status, reviewNotes, applicantId, currentAuthUser, currentLoggedInUserData) {
    if (!currentAuthUser || (currentLoggedInUserData.role !== 'admin' && currentLoggedInUserData.role !== 'founder' && currentLoggedInUserData.role !== 'co-founder')) {
        throw new Error("Not authorized to review partner applications.");
    }
    showLoadingSpinner();
    try {
        const applicationDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/partnerApplications`, applicationId);
        await updateDoc(applicationDocRef, {
            status: status,
            reviewNotes: reviewNotes,
            reviewedBy: currentAuthUser.uid,
            reviewTimestamp: serverTimestamp()
        });

        if (status === 'approved') {
            const userDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/users`, applicantId);
            await updateDoc(userDocRef, { role: 'partner' });
            showMessageModal('Application approved and user role updated to Partner!');
        } else {
            showMessageModal('Application rejected.');
        }
    } catch (error) {
        console.error("Error updating partner application status:", error.message);
        throw new Error("Failed to update application status: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Adds a new video to Firestore.
 * @param {string} name - The name of the video.
 * @param {string} description - The description of the video.
 * @param {string} iconUrl - URL for the video's icon.
 * @param {string} thumbnailUrl - URL for the video's thumbnail.
 * @param {string} youtubeLink - The YouTube link of the video.
 * @param {string} youtubeVideoId - The extracted YouTube video ID.
 * @param {object} currentAuthUser - The current authenticated Firebase user.
 * @param {object} currentLoggedInUserData - The Firestore data of the currently logged-in user.
 * @returns {Promise<void>}
 */
export async function addVideoFirestore(name, description, iconUrl, thumbnailUrl, youtubeLink, youtubeVideoId, currentAuthUser, currentLoggedInUserData) {
    if (!currentAuthUser) {
        throw new Error("You must be logged in to add videos.");
    }
    showLoadingSpinner();
    try {
        const videosCollectionRef = collection(dbInstance, `/artifacts/${APP_ID}/public/data/videos`);
        await addDoc(videosCollectionRef, {
            name: name,
            description: description,
            iconUrl: iconUrl,
            thumbnailUrl: thumbnailUrl,
            youtubeLink: youtubeLink,
            youtubeVideoId: youtubeVideoId,
            authorId: currentAuthUser.uid,
            authorUsername: currentLoggedInUserData.username || currentAuthUser.displayName || currentAuthUser.email,
            timestamp: serverTimestamp()
        });
        showMessageModal('Video added successfully!');
    } catch (error) {
        console.error("Error adding video:", error.message);
        throw new Error("Failed to add video: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Fetches all videos from Firestore, ordered by timestamp.
 * @returns {Promise<Array<object>>} - List of all videos.
 */
export async function fetchVideosFirestore() {
    showLoadingSpinner();
    try {
        const videosCollectionRef = collection(dbInstance, `/artifacts/${APP_ID}/public/data/videos`);
        const q = query(videosCollectionRef, orderBy('timestamp', 'desc'));

        const querySnapshot = await new Promise((resolve, reject) => {
            const unsubscribe = onSnapshot(q, (snapshot) => {
                unsubscribe();
                resolve(snapshot);
            }, (error) => {
                reject(error);
            });
        });

        const videosData = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            videosData.push({
                id: doc.id,
                name: data.name,
                description: data.description,
                iconUrl: data.iconUrl,
                thumbnailUrl: data.thumbnailUrl,
                youtubeLink: data.youtubeLink,
                youtubeVideoId: data.youtubeVideoId,
                authorUsername: data.authorUsername,
                timestamp: data.timestamp ? (typeof data.timestamp === 'string' ? new Date(data.timestamp).toLocaleString() : data.timestamp.toDate().toLocaleString()) : 'N/A',
            });
        });
        return videosData;
    } catch (error) {
        console.error("Error fetching videos:", error.message);
        throw new Error("Failed to fetch videos: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Updates an existing video in Firestore.
 * @param {string} videoId - The ID of the video to update.
 * @param {string} name - The new name.
 * @param {string} description - The new description.
 * @param {string} iconUrl - The new icon URL.
 * @param {string} thumbnailUrl - The new thumbnail URL.
 * @param {string} youtubeLink - The new YouTube link.
 * @param {string} youtubeVideoId - The new YouTube video ID.
 * @param {object} currentAuthUser - The current authenticated Firebase user.
 * @returns {Promise<void>}
 */
export async function updateVideoFirestore(videoId, name, description, iconUrl, thumbnailUrl, youtubeLink, youtubeVideoId, currentAuthUser) {
    if (!currentAuthUser) {
        throw new Error("You must be logged in to update videos.");
    }
    showLoadingSpinner();
    try {
        const videoDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/videos`, videoId);
        await updateDoc(videoDocRef, {
            name: name,
            description: description,
            iconUrl: iconUrl,
            thumbnailUrl: thumbnailUrl,
            youtubeLink: youtubeLink,
            youtubeVideoId: youtubeVideoId,
        });
        showMessageModal('Video updated successfully!');
    } catch (error) {
        console.error("Error updating video:", error.message);
        throw new Error("Failed to update video: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Deletes a video from Firestore.
 * @param {string} videoId - The ID of the video to delete.
 * @param {object} currentAuthUser - The current authenticated Firebase user.
 * @returns {Promise<void>}
 */
export async function deleteVideoFirestore(videoId, currentAuthUser) {
    if (!currentAuthUser) {
        throw new Error("You must be logged in to delete videos.");
    }
    showLoadingSpinner();
    try {
        const videoDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/videos`, videoId);
        await deleteDoc(videoDocRef);
        showMessageModal('Video deleted successfully!');
    } catch (error) {
        console.error("Error deleting video:", error.message);
        throw new Error("Failed to delete video: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Submits a new code snippet for review.
 * @param {string} title - The title of the code snippet.
 * @param {string} code - The code content.
 * @param {string} platform - The platform/language (e.g., 'javascript', 'python').
 * @param {object} currentAuthUser - The current authenticated Firebase user.
 * @param {object} currentLoggedInUserData - The Firestore data of the currently logged-in user.
 * @returns {Promise<void>}
 */
export async function submitCodeSnippet(title, code, platform, currentAuthUser, currentLoggedInUserData) {
    if (!currentAuthUser) {
        throw new Error("You must be logged in to submit code snippets.");
    }
    showLoadingSpinner();
    try {
        const codeSubmissionsCollectionRef = collection(dbInstance, `/artifacts/${APP_ID}/public/data/codeSubmissions`);
        await addDoc(codeSubmissionsCollectionRef, {
            title: title,
            code: code,
            platform: platform,
            authorId: currentAuthUser.uid,
            authorUsername: currentLoggedInUserData.username || currentAuthUser.displayName || currentAuthUser.email,
            status: 'pending', // 'pending', 'approved', 'denied'
            timestamp: serverTimestamp()
        });
        showMessageModal('Code snippet submitted for review!');
    } catch (error) {
        console.error("Error submitting code snippet:", error.message);
        throw new Error("Failed to submit code snippet: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Fetches all code submissions (for admin review).
 * @param {object} currentAuthUser - The current authenticated Firebase user.
 * @param {object} currentLoggedInUserData - The Firestore data of the currently logged-in user.
 * @returns {Promise<Array<object>>} - List of all code submissions.
 */
export async function fetchAllCodeSubmissions(currentAuthUser, currentLoggedInUserData) {
    if (!currentAuthUser || (currentLoggedInUserData.role !== 'admin' && currentLoggedInUserData.role !== 'founder' && currentLoggedInUserData.role !== 'co-founder')) {
        throw new Error("Not authorized to view code submissions.");
    }
    showLoadingSpinner();
    try {
        const codeSubmissionsCollectionRef = collection(dbInstance, `/artifacts/${APP_ID}/public/data/codeSubmissions`);
        const q = query(codeSubmissionsCollectionRef, orderBy('timestamp', 'desc'));

        const querySnapshot = await new Promise((resolve, reject) => {
            const unsubscribe = onSnapshot(q, (snapshot) => {
                unsubscribe();
                resolve(snapshot);
            }, (error) => {
                reject(error);
            });
        });

        const submissionsData = [];
        querySnapshot.forEach((doc) => {
            submissionsData.push({ id: doc.id, ...doc.data() });
        });
        return submissionsData;
    } catch (error) {
        console.error("Error fetching code submissions:", error.message);
        throw new Error("Failed to fetch code submissions: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Updates the status of a code submission (approved/denied).
 * @param {string} submissionId - The ID of the submission to update.
 * @param {string} status - The new status ('approved' or 'denied').
 * @param {object} currentAuthUser - The current authenticated Firebase user.
 * @param {object} currentLoggedInUserData - The Firestore data of the currently logged-in user.
 * @returns {Promise<void>}
 */
export async function updateCodeSubmissionStatus(submissionId, status, currentAuthUser, currentLoggedInUserData) {
    if (!currentAuthUser || (currentLoggedInUserData.role !== 'admin' && currentLoggedInUserData.role !== 'founder' && currentLoggedInUserData.role !== 'co-founder')) {
        throw new Error("Not authorized to update code submission status.");
    }
    showLoadingSpinner();
    try {
        const submissionDocRef = doc(dbInstance, `/artifacts/${APP_ID}/public/data/codeSubmissions`, submissionId);
        await updateDoc(submissionDocRef, {
            status: status,
            reviewerId: currentAuthUser.uid,
            reviewerUsername: currentLoggedInUserData.username || currentAuthUser.displayName || currentAuthUser.email,
            reviewTimestamp: serverTimestamp()
        });
        showMessageModal(`Code submission ${status} successfully!`);
    } catch (error) {
        console.error("Error updating code submission status:", error.message);
        throw new Error("Failed to update code submission status: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}

/**
 * Fetches all approved code snippets.
 * @returns {Promise<Array<object>>} - List of approved code snippets.
 */
export async function fetchAllApprovedCodeSnippets() {
    showLoadingSpinner();
    try {
        const codeSubmissionsCollectionRef = collection(dbInstance, `/artifacts/${APP_ID}/public/data/codeSubmissions`);
        const q = query(codeSubmissionsCollectionRef, where('status', '==', 'approved'), orderBy('timestamp', 'desc'));

        const querySnapshot = await new Promise((resolve, reject) => {
            const unsubscribe = onSnapshot(q, (snapshot) => {
                unsubscribe();
                resolve(snapshot);
            }, (error) => {
                reject(error);
            });
        });

        const approvedSnippets = [];
        querySnapshot.forEach((doc) => {
            approvedSnippets.push({ id: doc.id, ...doc.data() });
        });
        return approvedSnippets;
    } catch (error) {
        console.error("Error fetching approved code snippets:", error.message);
        throw new Error("Failed to fetch approved code snippets: " + error.message);
    } finally {
        hideLoadingSpinner();
    }
}
