// App.js
// This script contains the entire application logic, including Firebase initialization
// and new features like forum, post management, reactions, comments, enhanced backgrounds,
// and robust authentication state management for proper rendering.

// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, query, onSnapshot, deleteDoc, orderBy, serverTimestamp, deleteField } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

// Import configuration from config.js
import CONFIG from './config.js'; // Make sure config.js is in the same directory

document.addEventListener('DOMContentLoaded', async () => {
    // Use Firebase configuration from config.js
    const firebaseConfig = CONFIG.firebaseConfig;

    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    // Use the projectId as the APP_ID for consistent Firestore collection paths and rules
    const APP_ID = firebaseConfig.projectId;

    // Initialize Auth Provider for Google
    const googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('profile'); // Request profile access
    googleProvider.addScope('email'); // Request email access

    // DOM Elements
    const contentArea = document.getElementById('content-area');
    const navLinks = document.getElementById('nav-links'); // Desktop nav links
    const sideDrawerMenu = document.getElementById('side-drawer-menu'); // New: Side drawer menu container
    const overlayBackdrop = document.getElementById('overlay-backdrop'); // New: Overlay for side drawer
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileMenuIconOpen = document.getElementById('mobile-menu-icon-open');
    const mobileMenuIconClose = document.getElementById('mobile-menu-icon-close');
    const navHomeButton = document.getElementById('nav-home');
    const navAboutButton = document.getElementById('nav-about'); // Desktop about button reference
    const mobileDrawerHomeButton = document.getElementById('mobile-drawer-home'); // New: Home button in side drawer
    const mobileDrawerAboutButton = document.getElementById('mobile-drawer-about'); // New: About button in side drawer

    // Global State Variables
    let currentUser = null; // Firebase Auth user object
    let userData = null; // Firestore user document data (role, background, etc.)
    let usersList = []; // List of all users for admin panel
    let roomsList = []; // List of all rooms for admin panel and rooms page
    let currentModal = null; // To manage active message modal
    let isAuthReady = false; // Flag to indicate if Firebase Auth state has been initialized

    // --- Utility Functions ---

    /**
     * Shows a loading spinner.
     */
    function showLoadingSpinner() {
        let spinner = document.getElementById('loading-spinner');
        if (!spinner) {
            spinner = document.createElement('div');
            spinner.id = 'loading-spinner';
            spinner.className = 'fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-50';
            spinner.innerHTML = `<div class="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-white"></div>`;
            document.body.appendChild(spinner);
        }
        spinner.classList.remove('hidden'); // Ensure it's visible
    }

    /**
     * Hides the loading spinner.
     */
    function hideLoadingSpinner() {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.classList.add('hidden'); // Hide it
        }
    }

    /**
     * Displays a message modal.
     * @param {string} message - The message to display.
     * @param {string} type - 'info', 'error', or 'confirm'.
     * @param {function} onConfirm - Callback for 'confirm' type (only for 'confirm' type).
     */
    function showMessageModal(message, type = 'info', onConfirm = null) {
        if (currentModal) {
            currentModal.remove(); // Remove any existing modal
        }

        const modal = document.createElement('div');
        modal.id = 'message-modal';
        modal.className = 'fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-50 p-4';

        let buttonHtml = '';
        if (type === 'confirm') {
            buttonHtml = `
                <div class="flex justify-center space-x-4">
                    <button id="modal-confirm-btn" class="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-full transition duration-300 transform hover:scale-105">
                        Confirm
                    </button>
                    <button id="modal-cancel-btn" class="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-full transition duration-300 transform hover:scale-105">
                        Cancel
                    </button>
                </div>
            `;
        } else {
            buttonHtml = `
                <button id="modal-ok-btn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full transition duration-300 transform hover:scale-105">
                    OK
                </button>
            `;
        }

        modal.innerHTML = `
            <div class="bg-white p-8 rounded-lg shadow-xl text-center max-w-sm w-full">
                <p class="text-xl mb-6 ${type === 'error' ? 'text-red-600' : 'text-gray-800'}">${message}</p>
                ${buttonHtml}
            </div>
        `;

        document.body.appendChild(modal);
        currentModal = modal; // Set the current modal reference

        const closeModal = () => {
            if (currentModal) {
                currentModal.remove();
                currentModal = null;
            }
        };

        if (type === 'confirm') {
            document.getElementById('modal-confirm-btn').onclick = () => {
                closeModal();
                if (onConfirm) onConfirm();
            };
            document.getElementById('modal-cancel-btn').onclick = closeModal;
        } else {
            document.getElementById('modal-ok-btn').onclick = closeModal;
        }
    }

    /**
     * Updates the body's background. Can be a Tailwind class string or a direct image URL.
     */
    function updateBodyBackground() {
        // Clear all previous body classes and inline styles to avoid conflicts
        document.body.className = ''; 
        document.body.style.backgroundImage = '';
        document.body.style.backgroundSize = '';
        document.body.style.backgroundPosition = '';
        document.body.style.backgroundRepeat = '';
        document.body.style.backgroundAttachment = '';

        if (userData && userData.backgroundUrl) {
            // Check if it's a direct URL (http or https)
            if (userData.backgroundUrl.startsWith('http://') || userData.backgroundUrl.startsWith('https://')) {
                document.body.style.backgroundImage = `url('${userData.backgroundUrl}')`;
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundPosition = 'center';
                document.body.style.backgroundRepeat = 'no-repeat';
                document.body.style.backgroundAttachment = 'fixed'; // Makes background fixed on scroll
            } else {
                // Assume it's a Tailwind CSS class string
                const backgroundClasses = userData.backgroundUrl.split(' ');
                document.body.classList.add(...backgroundClasses);
            }
        } else {
            // Default fallback if no user data or backgroundUrl
            document.body.classList.add('bg-gradient-to-r', 'from-blue-400', 'to-purple-600');
        }
        // Always add core classes for consistent styling
        document.body.classList.add('min-h-screen', 'font-inter');
    }

    // --- Firebase Integration Functions ---

    /**
     * Authenticates a user (login or signup) with Firebase Auth and stores user data in Firestore.
     * Handles Email/Password and Google authentication.
     * @param {string} type - 'login', 'signup', or 'google'.
     * @param {object} formData - { email, password, username (for signup) }.
     * @returns {Promise<object>} - User data or throws error.
     */
    async function authenticateUser(type, formData) {
        showLoadingSpinner();
        try {
            let userCredential;
            let user;

            if (type === 'google') {
                userCredential = await signInWithPopup(auth, googleProvider);
                user = userCredential.user;
            } else if (type === 'signup') {
                userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
                user = userCredential.user;
            } else { // login
                userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
                user = userCredential.user;
            }

            // After authentication, ensure user data exists in Firestore
            const userDocRef = doc(db, `/artifacts/${APP_ID}/public/data/users`, user.uid);
            const docSnap = await getDoc(userDocRef);

            let fetchedUserData;
            if (docSnap.exists()) {
                fetchedUserData = docSnap.data();
            } else {
                // Create user document if it doesn't exist (e.g., new Google user)
                const usernameToUse = user.displayName || user.email?.split('@')[0] || 'User';
                // Prioritize user.photoURL from auth provider, fallback to placeholder
                const profilePicToUse = user.photoURL || `https://placehold.co/100x100/F0F0F0/000000?text=${usernameToUse.charAt(0).toUpperCase()}`;

                await setDoc(userDocRef, {
                    email: user.email,
                    username: usernameToUse,
                    role: 'member', // Default role for new users
                    profilePicUrl: profilePicToUse,
                    backgroundUrl: 'bg-gradient-to-r from-blue-400 to-purple-600' // Default background
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
            }
            throw new Error(errorMessage); // Re-throw with a user-friendly message
        } finally {
            hideLoadingSpinner();
        }
    }

    /**
     * Sends a password reset email.
     * @param {string} email - User's email for password reset.
     * @returns {Promise<void>}
     */
    async function sendPasswordReset(email) {
        showLoadingSpinner();
        try {
            await sendPasswordResetEmail(auth, email);
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
     * @returns {Promise<object|null>} - User data or null if not authenticated/found.
     */
    async function fetchCurrentUserFirestoreData() {
        if (!currentUser) {
            console.log("No current user to fetch Firestore data for.");
            return null;
        }

        console.log("Attempting to fetch Firestore data for user:", currentUser.uid);
        showLoadingSpinner();
        try {
            const userDocRef = doc(db, `/artifacts/${APP_ID}/public/data/users`, currentUser.uid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                console.log("Firestore user data fetched successfully:", docSnap.data());
                return docSnap.data();
            }
            console.log("Firestore document for user not found. This might be a new user or a data inconsistency.");
            // If user exists in Auth but not Firestore, create a default entry
            const usernameToUse = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
            const profilePicToUse = currentUser.photoURL || `https://placehold.co/100x100/F0F0F0/000000?text=${usernameToUse.charAt(0).toUpperCase()}`;
            const defaultBackground = 'bg-gradient-to-r from-blue-400 to-purple-600';

            const newUserData = {
                email: currentUser.email,
                username: usernameToUse,
                role: 'member', // Default role for new users
                profilePicUrl: profilePicToUse,
                backgroundUrl: defaultBackground
            };
            await setDoc(userDocRef, newUserData);
            console.log("Default user document created in Firestore.");
            return newUserData;

        } catch (error) {
            console.error("Error fetching or creating user data from Firestore:", error.message);
            // Propagate the error so onAuthStateChanged can handle a critical failure
            throw new Error("Failed to load user profile: " + error.message);
        } finally {
            hideLoadingSpinner();
        }
    }

    /**
     * Updates the current user's profile data in Firestore.
     * @param {object} newUserData - Data to update (username, profilePicUrl, backgroundUrl).
     * @returns {Promise<object>} - Updated user data.
     */
    async function updateProfileData(newUserData) {
        if (!currentUser) {
            throw new Error("You must be logged in to update your profile.");
        }

        showLoadingSpinner();
        try {
            const userDocRef = doc(db, `/artifacts/${APP_ID}/public/data/users`, currentUser.uid);

            // Update Firebase Auth display name if username changed
            if (auth.currentUser && auth.currentUser.displayName !== newUserData.username) {
                await updateProfile(auth.currentUser, { displayName: newUserData.username });
            }

            // Update Firestore document
            await updateDoc(userDocRef, newUserData);

            // Fetch the updated document to return the latest state
            const docSnap = await getDoc(userDocRef);
            return docSnap.exists() ? docSnap.data() : null;
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
    async function fetchAllUsersFirestore() {
        if (!currentUser || (userData.role !== 'admin' && userData.role !== 'founder')) {
            console.warn("Attempted to fetch all users without sufficient privileges.");
            throw new Error("Not authorized to view users list.");
        }

        showLoadingSpinner();
        try {
            const usersCollectionRef = collection(db, `/artifacts/${APP_ID}/public/data/users`);
            const q = query(usersCollectionRef); // No orderBy() for simplicity with security rules

            const querySnapshot = await new Promise((resolve, reject) => {
                const unsubscribe = onSnapshot(q, (snapshot) => {
                    unsubscribe(); // Unsubscribe immediately after first fetch
                    resolve(snapshot);
                }, (error) => {
                    reject(error);
                });
            });

            const usersData = [];
            querySnapshot.forEach((doc) => {
                usersData.push({ id: doc.id, ...doc.data() });
            });
            console.log("Fetched all users successfully:", usersData.length);
            return usersData;
        } catch (error) {
            console.error("Error fetching all users:", error.message);
            throw new Error("Failed to fetch users list: " + error.message);
        } finally {
            hideLoadingSpinner();
        }
    }

    /**
     * Updates a user's role by an admin/founder in Firestore.
     * @param {string} userId - ID of the user to update.
     * @param {string} newRole - The new role ('member', 'admin', or 'founder').
     * @returns {Promise<boolean>} - True on success.
     */
    async function updateUserRoleFirestore(userId, newRole) {
        // Only admins can change roles, but founders can change any role.
        if (!currentUser || (userData.role !== 'admin' && userData.role !== 'founder')) {
            throw new Error("Not authorized to change roles.");
        }
        
        // Prevent admins from setting founder role (only founders can do this)
        if (newRole === 'founder' && userData.role !== 'founder') {
            throw new Error("Only a founder can assign the 'founder' role.");
        }

        // Prevent self-demotion from founder/admin, or self-deletion from any role via the panel.
        if (userId === currentUser.uid) {
            showMessageModal("You cannot change your own role or delete your own account from the admin panel. Please manage your own profile in the 'Profile' section.", 'info');
            return false; // Indicate operation was not performed due to safety check
        }

        showLoadingSpinner();
        try {
            const userDocRef = doc(db, `/artifacts/${APP_ID}/public/data/users`, userId);
            await updateDoc(userDocRef, { role: newRole });
            console.log(`User ${userId} role updated to ${newRole}.`);
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
     * @returns {Promise<boolean>} - True on success.
     */
    async function setUserBanStatusFirestore(userId, isBanned) {
        if (!currentUser || (userData.role !== 'admin' && userData.role !== 'founder')) {
            throw new Error("Not authorized to ban/unban users.");
        }
        if (userId === currentUser.uid) {
            showMessageModal("You cannot ban or unban your own account.", 'info');
            return false;
        }

        showLoadingSpinner();
        try {
            const userDocRef = doc(db, `/artifacts/${APP_ID}/public/data/users`, userId);
            await updateDoc(userDocRef, { isBanned: isBanned });
            console.log(`User ${userId} ban status set to ${isBanned}.`);
            return true;
        } catch (error) {
            console.error("Error setting user ban status in Firestore:", error.message);
            throw new Error("Failed to update user ban status: " + error.message);
        } finally {
            hideLoadingSpinner();
        }
    }


    /**
     * Deletes a user's data from Firestore by an admin/founder.
     * Note: This does NOT delete the user from Firebase Authentication.
     * For full deletion, server-side code (e.g., using Firebase Admin SDK) is required.
     * @param {string} userId - ID of the user to delete.
     * @returns {Promise<boolean>} - True on success.
     */
    async function deleteUserFirestore(userId) {
        if (!currentUser || (userData.role !== 'admin' && userData.role !== 'founder')) {
            throw new Error("Not authorized to delete users.");
        }
        if (userId === currentUser.uid) {
            showMessageModal("You cannot delete your own account from the admin panel.", 'info');
            return false;
        }

        showLoadingSpinner();
        try {
            const userDocRef = doc(db, `/artifacts/${APP_ID}/public/data/users`, userId);
            await deleteDoc(userDocRef);
            console.log(`User ${userId} data deleted from Firestore.`);
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
     * Only callable by admins and founders.
     * @param {string} title - The title of the post.
     * @param {string} content - The content of the post.
     * @returns {Promise<void>}
     */
    async function createPostFirestore(title, content) {
        if (!currentUser || (userData.role !== 'admin' && userData.role !== 'founder')) {
            throw new Error("Only admins and founders can create posts.");
        }
        showLoadingSpinner();
        try {
            const postsCollectionRef = collection(db, `/artifacts/${APP_ID}/public/data/posts`);
            await setDoc(doc(postsCollectionRef), { // Use setDoc with an auto-generated ID for new doc
                title: title,
                content: content,
                authorId: currentUser.uid,
                authorUsername: userData.username || currentUser.displayName || currentUser.email,
                timestamp: serverTimestamp(), // Use server timestamp for consistency
                reactions: {}, // Initialize empty reactions map
                comments: [] // Initialize empty comments array
            });
            showMessageModal('Post created successfully!');
            console.log("New post created.");
        } catch (error) {
            console.error("Error creating post:", error.message);
            throw new Error("Failed to create post: " + error.message);
        } finally {
            hideLoadingSpinner();
        }
    }

    /**
     * Updates an existing post in Firestore.
     * Only callable by admins and founders.
     * @param {string} postId - The ID of the post to update.
     * @param {string} title - The new title.
     * @param {string} content - The new content.
     * @returns {Promise<void>}
     */
    async function updatePostFirestore(postId, title, content) {
        if (!currentUser || (userData.role !== 'admin' && userData.role !== 'founder')) {
            throw new Error("Only admins and founders can edit posts.");
        }
        showLoadingSpinner();
        try {
            const postDocRef = doc(db, `/artifacts/${APP_ID}/public/data/posts`, postId);
            await updateDoc(postDocRef, {
                title: title,
                content: content,
                // Do not update author or timestamp here, only content
            });
            showMessageModal('Post updated successfully!');
            console.log(`Post ${postId} updated.`);
        } catch (error) {
            console.error("Error updating post:", error.message);
            throw new Error("Failed to update post: " + error.message);
        } finally {
            hideLoadingSpinner();
        }
    }

    /**
     * Deletes a post from Firestore.
     * Only callable by admins and founders.
     * @param {string} postId - The ID of the post to delete.
     * @returns {Promise<void>}
     */
    async function deletePostFirestore(postId) {
        if (!currentUser || (userData.role !== 'admin' && userData.role !== 'founder')) {
            throw new Error("Only admins and founders can delete posts.");
        }
        showLoadingSpinner();
        try {
            const postDocRef = doc(db, `/artifacts/${APP_ID}/public/data/posts`, postId);
            await deleteDoc(postDocRef);
            showMessageModal('Post deleted successfully!');
            console.log(`Post ${postId} deleted.`);
        } catch (error) {
            console.error("Error deleting post:", error.message);
            throw new Error("Failed to delete post: " + error.message);
        } finally {
            hideLoadingSpinner();
        }
    }

    /**
     * Adds/updates a reaction to a post.
     * Any authenticated user can react.
     * @param {string} postId - The ID of the post.
     * @param {string} emoji - The emoji character (e.g., '?', '❤️').
     * @returns {Promise<void>}
     */
    async function addReactionToPost(postId, emoji) {
        if (!currentUser) {
            showMessageModal("You must be logged in to react to posts.", 'info');
            return;
        }
        showLoadingSpinner();
        try {
            const postDocRef = doc(db, `/artifacts/${APP_ID}/public/data/posts`, postId);
            const postSnap = await getDoc(postDocRef);

            if (postSnap.exists()) {
                const postData = postSnap.data();
                const currentReactions = postData.reactions || {};
                
                // Get the user's previously reacted emoji for this post, if any
                const userPreviousReaction = postData.userReactions ? postData.userReactions[currentUser.uid] : null;

                // Prepare updates object
                const updates = {};

                // If user previously reacted with a different emoji, decrement its count
                if (userPreviousReaction && userPreviousReaction !== emoji) {
                    updates[`reactions.${userPreviousReaction}`] = Math.max(0, (currentReactions[userPreviousReaction] || 0) - 1);
                    if (updates[`reactions.${userPreviousReaction}`] <= 0) {
                        updates[`reactions.${userPreviousReaction}`] = deleteField(); // Correctly use deleteField
                    }
                }

                // If user reacted with the same emoji, toggle it off (decrement)
                // If user reacted with a different emoji or no emoji, toggle it on (increment)
                if (userPreviousReaction === emoji) {
                    updates[`reactions.${emoji}`] = Math.max(0, (currentReactions[emoji] || 0) - 1);
                    if (updates[`reactions.${emoji}`] <= 0) {
                        updates[`reactions.${emoji}`] = deleteField(); // Correctly use deleteField
                    }
                    updates[`userReactions.${currentUser.uid}`] = deleteField(); // Remove user's specific reaction
                } else {
                    updates[`reactions.${emoji}`] = (currentReactions[emoji] || 0) + 1;
                    updates[`userReactions.${currentUser.uid}`] = emoji; // Store user's new reaction
                }
                
                // Perform the update
                await updateDoc(postDocRef, updates);
                console.log(`User ${currentUser.uid} reacted to post ${postId} with ${emoji}.`);
            }
        } catch (error) {
            console.error("Error adding reaction:", error.message);
            showMessageModal("Failed to add reaction: " + error.message, 'error');
        } finally {
            hideLoadingSpinner();
            // Re-render forum page to show updated reactions
            renderForumPage(); 
        }
    }


    /**
     * Adds a comment to a post.
     * Any authenticated user can comment.
     * @param {string} postId - The ID of the post.
     * @param {string} commentText - The comment content.
     * @returns {Promise<void>}
     */
    async function addCommentToPost(postId, commentText) {
        if (!currentUser) {
            showMessageModal("You must be logged in to comment on posts.", 'info');
            return;
        }
        if (!commentText.trim()) {
            showMessageModal("Comment cannot be empty.", 'info');
            return;
        }

        showLoadingSpinner();
        try {
            const postDocRef = doc(db, `/artifacts/${APP_ID}/public/data/posts`, postId);
            const newComment = {
                authorId: currentUser.uid,
                authorUsername: userData.username || currentUser.displayName || currentUser.email,
                text: commentText,
                timestamp: new Date().toISOString() // Use ISO string for client-side timestamp
            };
            await updateDoc(postDocRef, {
                comments: arrayUnion(newComment) // Add the new comment to the array
            });
            showMessageModal('Comment added successfully!');
            console.log(`New comment added to post ${postId}.`);
        } catch (error) {
            console.error("Error adding comment:", error.message);
            showMessageModal("Failed to add comment: " + error.message, 'error');
        } finally {
            hideLoadingSpinner();
            // Re-render forum page to show updated comments
            renderForumPage(); 
        }
    }


    /**
     * Fetches all posts from Firestore, ordered by timestamp.
     * @returns {Promise<Array<object>>} - List of all posts.
     */
    async function fetchAllPostsFirestore() {
        showLoadingSpinner();
        try {
            const postsCollectionRef = collection(db, `/artifacts/${APP_ID}/public/data/posts`);
            const q = query(postsCollectionRef, orderBy('timestamp', 'desc')); // Order by newest first

            const querySnapshot = await new Promise((resolve, reject) => {
                const unsubscribe = onSnapshot(q, (snapshot) => {
                    unsubscribe(); // Unsubscribe immediately after first fetch
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
                    // Format timestamp for display (handle ISO string or Firestore Timestamp)
                    timestamp: data.timestamp ? (typeof data.timestamp === 'string' ? new Date(data.timestamp).toLocaleString() : data.timestamp.toDate().toLocaleString()) : 'N/A',
                    reactions: data.reactions || {}, // Ensure reactions is an object
                    comments: data.comments || [] // Ensure comments is an array
                });
            });
            console.log("Fetched all posts successfully:", postsData.length);
            return postsData;
        } catch (error) {
            console.error("Error fetching posts:", error.message);
            throw new Error("Failed to fetch posts: " + error.message);
        } finally {
            hideLoadingSpinner();
        }
    }

    /**
     * Fetches all team members from Firestore.
     * @returns {Promise<Array<object>>} - List of all team members.
     */
    async function fetchTeamMembersFirestore() {
        showLoadingSpinner();
        try {
            const teamCollectionRef = collection(db, `/artifacts/${APP_ID}/public/data/team`);
            const q = query(teamCollectionRef);

            const querySnapshot = await new Promise((resolve, reject) => {
                const unsubscribe = onSnapshot(q, (snapshot) => {
                    unsubscribe();
                    resolve(snapshot);
                }, (error) => {
                    reject(error);
                });
            });

            const teamMembersData = [];
            querySnapshot.forEach((doc) => {
                teamMembersData.push({ id: doc.id, ...doc.data() });
            });
            console.log("Fetched all team members successfully:", teamMembersData.length);
            return teamMembersData;
        } catch (error) {
            console.error("Error fetching team members:", error.message);
            throw new Error("Failed to fetch team members: " + error.message);
        } finally {
            hideLoadingSpinner();
        }
    }

    /**
     * Adds a new team member to Firestore.
     * Only callable by admins and founders.
     * @param {string} username - The username of the team member.
     * @param {string} role - The role of the team member.
     * @returns {Promise<void>}
     */
    async function addTeamMemberFirestore(username, role) {
        if (!currentUser || (userData.role !== 'admin' && userData.role !== 'founder')) {
            throw new Error("Only admins and founders can add team members.");
        }
        showLoadingSpinner();
        try {
            const teamCollectionRef = collection(db, `/artifacts/${APP_ID}/public/data/team`);
            await addDoc(teamCollectionRef, {
                username: username,
                role: role,
                addedBy: currentUser.uid,
                addedByUsername: userData.username || currentUser.displayName || currentUser.email,
                timestamp: serverTimestamp()
            });
            showMessageModal('Team member added successfully!');
            console.log("New team member added.");
        } catch (error) {
            console.error("Error adding team member:", error.message);
            throw new Error("Failed to add team member: " + error.message);
        } finally {
            hideLoadingSpinner();
        }
    }

    /**
     * Deletes a team member from Firestore.
     * Only callable by admins and founders.
     * @param {string} teamMemberId - The ID of the team member to delete.
     * @returns {Promise<void>}
     */
    async function deleteTeamMemberFirestore(teamMemberId) {
        if (!currentUser || (userData.role !== 'admin' && userData.role !== 'founder')) {
            throw new Error("Only admins and founders can delete team members.");
        }
        showLoadingSpinner();
        try {
            const teamMemberDocRef = doc(db, `/artifacts/${APP_ID}/public/data/team`, teamMemberId);
            await deleteDoc(teamMemberDocRef);
            showMessageModal('Team member deleted successfully!');
            console.log(`Team member ${teamMemberId} deleted.`);
        } catch (error) {
            console.error("Error deleting team member:", error.message);
            throw new Error("Failed to delete team member: " + error.message);
        } finally {
            hideLoadingSpinner();
        }
    }

    /**
     * Creates a new room in Firestore.
     * Only callable by admins and founders.
     * @param {string} title - The title of the room.
     * @param {string} description - The description of the room.
     * @returns {Promise<void>}
     */
    async function createRoomFirestore(title, description) {
        if (!currentUser || (userData.role !== 'admin' && userData.role !== 'founder')) {
            throw new Error("Only admins and founders can create rooms.");
        }
        showLoadingSpinner();
        try {
            const roomsCollectionRef = collection(db, `/artifacts/${APP_ID}/public/data/rooms`);
            await addDoc(roomsCollectionRef, { // Use addDoc for auto-generated ID
                title: title,
                description: description,
                creatorId: currentUser.uid,
                creatorUsername: userData.username || currentUser.displayName || currentUser.email,
                timestamp: serverTimestamp(),
            });
            showMessageModal('Room created successfully!');
            console.log("New room created.");
        } catch (error) {
            console.error("Error creating room:", error.message);
            throw new Error("Failed to create room: " + error.message);
        } finally {
            hideLoadingSpinner();
        }
    }

    /**
     * Deletes a room from Firestore.
     * Only callable by admins and founders.
     * @param {string} roomId - The ID of the room to delete.
     * @returns {Promise<void>}
     */
    async function deleteRoomFirestore(roomId) {
        if (!currentUser || (userData.role !== 'admin' && userData.role !== 'founder')) {
            throw new Error("Not authorized to delete rooms.");
        }
        showLoadingSpinner();
        try {
            const roomDocRef = doc(db, `/artifacts/${APP_ID}/public/data/rooms`, roomId);
            await deleteDoc(roomDocRef);
            showMessageModal('Room deleted successfully!');
            console.log(`Room ${roomId} deleted.`);
        } catch (error) {
            console.error("Error deleting room:", error.message);
            throw new Error("Failed to delete room: " + error.message);
        } finally {
            hideLoadingSpinner();
        }
    }

    /**
     * Fetches all rooms from Firestore.
     * @returns {Promise<Array<object>>} - List of all rooms.
     */
    async function fetchAllRoomsFirestore() {
        showLoadingSpinner();
        try {
            const roomsCollectionRef = collection(db, `/artifacts/${APP_ID}/public/data/rooms`);
            const q = query(roomsCollectionRef, orderBy('timestamp', 'desc')); // Order by newest first

            const querySnapshot = await new Promise((resolve, reject) => {
                const unsubscribe = onSnapshot(q, (snapshot) => {
                    unsubscribe(); // Unsubscribe immediately after first fetch
                    resolve(snapshot);
                }, (error) => {
                    reject(error);
                });
            });

            const roomsData = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                roomsData.push({
                    id: doc.id,
                    title: data.title,
                    description: data.description,
                    creatorUsername: data.creatorUsername,
                    timestamp: data.timestamp ? (typeof data.timestamp === 'string' ? new Date(data.timestamp).toLocaleString() : data.timestamp.toDate().toLocaleString()) : 'N/A',
                });
            });
            console.log("Fetched all rooms successfully:", roomsData.length);
            return roomsData;
        } catch (error) {
            console.error("Error fetching rooms:", error.message);
            throw new Error("Failed to fetch rooms: " + error.message);
        } finally {
            hideLoadingSpinner();
        }
    }


    // --- UI Rendering Functions ---

    /**
     * Renders the Navbar links based on authentication status.
     */
    function renderNavbar() {
        // Clear desktop nav links
        if (navLinks) {
            navLinks.innerHTML = '';
        } else {
            console.warn("Element with ID 'nav-links' not found. Desktop navigation may not render correctly.");
        }
        
        // Clear only dynamically added items from side drawer (keeping static Home/About)
        // Find the index of the first dynamic button (or the length if none)
        let firstDynamicIndex = 2; // Assuming mobile-drawer-home and mobile-drawer-about are always first 2 static elements
        if (sideDrawerMenu) {
            while (sideDrawerMenu.children.length > firstDynamicIndex) {
                sideDrawerMenu.removeChild(sideDrawerMenu.lastChild);
            }
        } else {
            console.warn("Element with ID 'side-drawer-menu' not found. Mobile navigation may not render correctly.");
        }

        // Update website title from config.js
        document.querySelector('title').textContent = CONFIG.websiteTitle;
        // The navHomeButton is a static element for the main title, already in index.html
        if (navHomeButton) {
            navHomeButton.textContent = CONFIG.websiteTitle;
        } else {
            console.warn("Element with ID 'nav-home' not found. Main title may not be functional.");
        }


        // Helper to create a button for a given menu (desktop or mobile)
        const createAndAppendButton = (container, id, text, page, iconHtml = '', isMobile = false) => {
            if (!container) return; // Defensive check

            const btn = document.createElement('button');
            btn.id = id;
            btn.className = `
                ${isMobile ? 'block w-full text-left px-4 py-3 text-lg font-semibold' : 'px-4 py-2'}
                rounded-lg hover:bg-gray-700 text-white transition duration-200
                ${id.includes('admin') ? 'bg-red-600 hover:bg-red-700 shadow-md' : 
                  (id.includes('auth') ? 'bg-green-600 hover:bg-green-700 shadow-md' : 
                  (id.includes('sign-out') ? 'bg-blue-600 hover:bg-blue-700 shadow-md' : ''))}
            `; // Removed founder-specific styling, admin styling will apply if a founder is shown admin panel
            btn.innerHTML = `${iconHtml}<span>${text}</span>`;
            btn.addEventListener('click', () => {
                if (page === 'logout') {
                    signOut(auth).then(() => {
                        showMessageModal('You have been signed out.');
                        // Reload or navigate to home to clear state
                        window.location.href = 'index.html'; // Ensure full refresh on logout
                    }).catch(error => {
                        showMessageModal("Failed to sign out: " + error.message, 'error');
                    });
                } else if (page.endsWith('.html')) { // Direct navigation to an HTML file
                    window.location.href = page;
                } else { // In-page navigation
                    navigateTo(page);
                }
                closeSideDrawer();
            });
            container.appendChild(btn);
        };

        // Navigation Categories for Desktop
        const categories = [
            {
                name: 'Community',
                items: [
                    { id: 'nav-forum', text: 'Forum', page: 'forum' },
                    { id: 'nav-rooms', text: 'Rooms', page: 'rooms.html' }, // Points to rooms.html
                    { id: 'nav-team', text: 'Meet the Team', page: 'team' }
                ],
                authRequired: true
            },
            {
                name: 'Administration',
                items: [
                    { id: 'nav-admin', text: 'Admin Panel', page: 'admin' }
                ],
                authRequired: true,
                roles: ['admin', 'founder']
            },
            {
                name: 'Account',
                items: [], // Populated below based on auth state
                authRequired: false
            }
        ];

        // Populate Account category based on auth state
        const accountCategory = categories.find(cat => cat.name === 'Account');
        if (currentUser && userData) {
            const profileIconSrc = userData.profilePicUrl || `https://placehold.co/100x100/F0F0F0/000000?text=${(userData.username || currentUser.email || 'U').charAt(0).toUpperCase()}`;
            const profileIconHtml = `
                <img src="${profileIconSrc}" alt="Profile" class="w-8 h-8 rounded-full object-cover border-2 border-gray-400"
                     onerror="this.onerror=null; this.src='https://placehold.co/100x100/F0F0F0/000000?text=${(userData.username || currentUser.email || 'U').charAt(0).toUpperCase()}'">`;

            accountCategory.items.push(
                { id: 'nav-profile', text: userData.username || currentUser.email, page: 'profile', icon: profileIconHtml },
                { id: 'nav-sign-out', text: 'Sign Out', page: 'logout' }
            );
        } else {
            accountCategory.items.push(
                { id: 'nav-auth', text: 'Sign In / Up', page: 'auth' }
            );
        }

        // Close all desktop dropdowns function
        const closeAllDesktopDropdowns = (e) => {
            // Check if the click was outside of any dropdown container or toggle button
            let clickedInsideDropdown = false;
            document.querySelectorAll('.desktop-dropdown-toggle, .desktop-dropdown-content').forEach(element => {
                if (element.contains(e.target)) {
                    clickedInsideDropdown = true;
                }
            });

            if (!clickedInsideDropdown) {
                document.querySelectorAll('.desktop-dropdown-content').forEach(content => {
                    content.classList.add('hidden');
                    content.style.maxHeight = '0px';
                    const icon = content.previousElementSibling.querySelector('.fa-chevron-down');
                    if (icon) icon.classList.remove('rotate-180');
                });
            }
        };

        // Render Desktop Navigation
        categories.forEach(category => {
            if (category.authRequired && !currentUser) return; // Skip if auth required and user not logged in
            if (category.roles && (!currentUser || !category.roles.includes(userData.role))) return; // Skip if roles required and user doesn't have them

            const dropdownContainer = document.createElement('div');
            dropdownContainer.className = 'relative inline-block text-left'; // Changed from 'group'

            dropdownContainer.innerHTML = `
                <button class="px-4 py-2 rounded-lg hover:bg-gray-700 text-white transition duration-200 flex items-center space-x-2 desktop-dropdown-toggle">
                    <span>${category.name}</span>
                    <i class="fas fa-chevron-down text-xs ml-1 transition-transform transform"></i>
                </button>
                <div class="desktop-dropdown-content absolute hidden bg-gray-700 text-white rounded-lg shadow-lg py-2 w-40 z-10 top-full mt-2 left-0 origin-top overflow-hidden" style="max-height: 0px; transition: max-height 0.3s ease-in-out;">
                    ${category.items.map(item => `
                        <button id="${item.id}" class="block w-full text-left px-4 py-2 hover:bg-gray-600 transition duration-200">
                            ${item.icon || ''}<span>${item.text}</span>
                        </button>
                    `).join('')}
                </div>
            `;
            navLinks.appendChild(dropdownContainer);

            const toggleButton = dropdownContainer.querySelector('.desktop-dropdown-toggle');
            const dropdownContent = dropdownContainer.querySelector('.desktop-dropdown-content');
            const dropdownIcon = toggleButton.querySelector('.fa-chevron-down');

            toggleButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent document click from immediately closing it
                const isOpen = !dropdownContent.classList.contains('hidden');

                // Close all other dropdowns, but only if they are not the one being toggled
                document.querySelectorAll('.desktop-dropdown-content').forEach(content => {
                    if (content !== dropdownContent) {
                        content.classList.add('hidden');
                        content.style.maxHeight = '0px';
                        const icon = content.previousElementSibling.querySelector('.fa-chevron-down');
                        if (icon) icon.classList.remove('rotate-180');
                    }
                });

                if (!isOpen) {
                    dropdownContent.classList.remove('hidden');
                    // Set max-height to scrollHeight to enable smooth transition
                    dropdownContent.style.maxHeight = dropdownContent.scrollHeight + 'px';
                    dropdownIcon.classList.add('rotate-180');
                } else {
                    dropdownContent.style.maxHeight = '0px';
                    dropdownContent.classList.add('hidden');
                    dropdownIcon.classList.remove('rotate-180');
                }
            });

            // Attach event listeners for dropdown items
            dropdownContent.querySelectorAll('button[id]').forEach(btn => {
                const page = categories.flatMap(cat => cat.items).find(item => item.id === btn.id)?.page;
                if (page) {
                    btn.addEventListener('click', () => {
                        if (page === 'logout') {
                            signOut(auth).then(() => {
                                showMessageModal('You have been signed out.');
                                window.location.href = 'index.html'; // Full reload to clear state
                            }).catch(error => {
                                showMessageModal("Failed to sign out: " + error.message, 'error');
                            });
                        } else if (page.endsWith('.html')) {
                            window.location.href = page; // Navigate to external HTML file
                        } else {
                            navigateTo(page); // Navigate within this index.html
                        }
                        closeAllDesktopDropdowns({target: document.body}); // Simulate click on body to close dropdown
                    });
                }
            });
        });

        // Close desktop dropdowns when clicking anywhere on the document
        // This listener ensures dropdowns close when clicking outside of them
        document.removeEventListener('click', closeAllDesktopDropdowns); // Remove previous listener to prevent duplicates
        document.addEventListener('click', closeAllDesktopDropdowns);


        // Render Mobile Drawer Navigation
        // Ensure static home/about buttons are already in HTML and have their listeners.
        // We will append dynamic categories below them.

        // Mobile dropdown toggle function
        const createMobileDropdown = (categoryName, items) => {
            const dropdownWrapper = document.createElement('div');
            dropdownWrapper.className = 'w-full';
            dropdownWrapper.innerHTML = `
                <button class="mobile-dropdown-toggle block w-full text-left px-4 py-3 text-lg font-semibold bg-gray-700 hover:bg-gray-600 transition duration-200 flex justify-between items-center rounded-md">
                    <span>${categoryName}</span>
                    <i class="fas fa-chevron-down text-sm transition-transform transform"></i>
                </button>
                <div class="mobile-dropdown-content hidden bg-gray-700 py-1 rounded-b-lg overflow-hidden transition-all duration-300 ease-in-out" style="max-height: 0px;">
                    ${items.map(item => `
                        <button id="${item.id}" class="block w-full text-left px-6 py-2 text-md hover:bg-gray-600 text-white transition duration-200">
                            ${item.icon || ''}<span>${item.text}</span>
                        </button>
                    `).join('')}
                </div>
            `;
            sideDrawerMenu.appendChild(dropdownWrapper);

            const toggleButton = dropdownWrapper.querySelector('.mobile-dropdown-toggle');
            const dropdownContent = dropdownWrapper.querySelector('.mobile-dropdown-content');
            const dropdownIcon = dropdownWrapper.querySelector('.fa-chevron-down');

            toggleButton.addEventListener('click', () => {
                const isOpen = dropdownContent.classList.contains('open');
                if (isOpen) {
                    dropdownContent.style.maxHeight = '0px';
                    dropdownContent.classList.remove('open');
                    dropdownIcon.classList.remove('rotate-180');
                } else {
                    // Close all other open dropdowns first for cleaner UX
                    sideDrawerMenu.querySelectorAll('.mobile-dropdown-content.open').forEach(openContent => {
                        openContent.style.maxHeight = '0px';
                        openContent.classList.remove('open');
                        openContent.previousElementSibling.querySelector('.fa-chevron-down').classList.remove('rotate-180');
                    });
                    
                    dropdownContent.style.maxHeight = dropdownContent.scrollHeight + 'px';
                    dropdownContent.classList.add('open');
                    dropdownIcon.classList.add('rotate-180');
                }
            });

            dropdownContent.querySelectorAll('button[id]').forEach(btn => {
                const page = categories.flatMap(cat => cat.items).find(item => item.id === btn.id)?.page;
                if (page) {
                    btn.addEventListener('click', () => {
                        if (page === 'logout') {
                            signOut(auth).then(() => {
                                showMessageModal('You have been signed out.');
                                window.location.href = 'index.html'; // Full reload on logout
                            }).catch(error => {
                                showMessageModal("Failed to sign out: " + error.message, 'error');
                            });
                        } else if (page.endsWith('.html')) { // Direct navigation to an HTML file
                            window.location.href = page;
                        } else { // In-page navigation
                            navigateTo(page);
                        }
                        closeSideDrawer(); // Close drawer after navigating
                    });
                }
            });
        };

        categories.forEach(category => {
            if (category.authRequired && !currentUser) return;
            if (category.roles && (!currentUser || !category.roles.includes(userData.role))) return;

            createMobileDropdown(category.name, category.items);
        });
    }

    /**
     * Renders the Home page content.
     */
    function renderHomePage() {
        // Function to get VFX and color for role
        const getRoleVFX = (role) => {
            let emoji = '';
            let colorClass = 'text-gray-800'; // Default color

            switch (role) {
                case 'member':
                    emoji = '👤'; // User emoji
                    colorClass = 'text-blue-600'; // Member color
                    break;
                case 'admin':
                    emoji = '🛡️'; // Shield emoji
                    colorClass = 'text-red-600'; // Admin color
                    break;
                case 'founder':
                    emoji = '✨'; // Sparkles emoji
                    colorClass = 'text-purple-600'; // Founder color
                    break;
                default:
                    emoji = '';
                    colorClass = 'text-gray-800';
            }
            // Apply a subtle animation for all roles, or only privileged ones
            const animationClass = (role === 'admin' || role === 'founder') ? 'animate-pulse' : ''; 
            return `<span class="font-semibold ${colorClass} ${animationClass}">${emoji} ${role}</span>`;
        };


        contentArea.innerHTML = `
            <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl text-center backdrop-blur-sm bg-opacity-80 border border-gray-200">
                <h1 class="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-green-600 mb-6">
                    Welcome to ${CONFIG.websiteTitle}!
                </h1>
                ${currentUser && userData ? `
                    <p class="text-xl text-gray-700 mb-4">
                        Hello, <span class="font-semibold text-blue-600">${userData.username || currentUser.email}</span>!
                        You are logged in as a ${getRoleVFX(userData.role)}.
                    </p>
                    <p class="text-lg text-gray-600 mb-6">
                        Explore your profile settings, check out the forum, or visit the admin panel if you have the permissions.
                    </p>
                    <div class="flex flex-col sm:flex-row justify-center gap-4">
                        <button id="go-to-profile-btn" class="py-3 px-6 rounded-full bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                            Go to Profile
                        </button>
                        <button id="go-to-forum-btn" class="py-3 px-6 rounded-full bg-purple-600 text-white font-bold text-lg hover:bg-purple-700 transition duration-300 transform hover:scale-105 shadow-lg">
                            Visit Forum
                        </button>
                        ${(userData.role === 'admin' || userData.role === 'founder') ? `
                        <button id="go-to-admin-btn" class="py-3 px-6 rounded-full bg-red-600 text-white font-bold text-lg hover:bg-red-700 transition duration-300 transform hover:scale-105 shadow-lg">
                            Admin Panel
                        </button>` : ''}
                    </div>
                ` : `
                    <p class="text-lg text-gray-700 mb-6">
                        Sign in or create an account to unlock full features and personalize your experience.
                    </p>
                    <button id="go-to-auth-btn" class="py-3 px-8 rounded-full bg-green-600 text-white font-bold text-lg hover:bg-green-700 transition duration-300 transform hover:scale-105 shadow-lg">
                        Sign In / Sign Up
                    </button>
                `}
            </div>
        `;

        if (currentUser && userData) {
            document.getElementById('go-to-profile-btn').addEventListener('click', () => navigateTo('profile'));
            document.getElementById('go-to-forum-btn').addEventListener('click', () => navigateTo('forum'));
            if (userData.role === 'admin' || userData.role === 'founder') {
                document.getElementById('go-to-admin-btn').addEventListener('click', () => navigateTo('admin'));
            }
        } else {
            document.getElementById('go-to-auth-btn').addEventListener('click', () => navigateTo('auth'));
        }
    }

    /**
     * Renders the Auth (Sign In / Sign Up) page.
     */
    function renderAuthPage() {
        contentArea.innerHTML = `
            <div class="flex flex-col items-center justify-center p-4">
                <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md backdrop-blur-sm bg-opacity-80 border border-gray-200">
                    <h2 id="auth-title" class="text-3xl font-extrabold text-center text-gray-800 mb-8">Sign In</h2>
                    <form id="auth-form" class="space-y-6">
                        <div>
                            <label for="email" class="block text-gray-700 text-sm font-semibold mb-2">Email</label>
                            <input type="email" id="email" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="your@example.com" required>
                        </div>
                        <div id="username-field" class="hidden">
                            <label for="username" class="block text-gray-700 text-sm font-semibold mb-2">Username</label>
                            <input type="text" id="username" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Choose a username">
                        </div>
                        <div>
                            <label for="password" class="block text-gray-700 text-sm font-semibold mb-2">Password</label>
                            <input type="password" id="password" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Minimum 6 characters" required>
                        </div>
                        <button type="submit" id="auth-submit-btn" class="w-full py-3 rounded-full bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                            Sign In
                        </button>
                    </form>
                    <div class="mt-6 text-center">
                        <button id="toggle-auth-mode" class="text-blue-600 hover:underline text-sm font-medium">
                            Need an account? Sign Up
                        </button>
                        <button id="forgot-password-btn" class="block mt-2 text-blue-600 hover:underline text-sm font-medium mx-auto">
                            Forgot Password?
                        </button>
                    </div>
                    <div class="mt-6">
                        <button id="google-auth-btn" class="w-full py-3 rounded-full bg-red-500 text-white font-bold text-lg hover:bg-red-600 transition duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2">
                            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12.24 10.26v3.29h6.14c-.26 1.63-1.4 3.01-3.23 3.91l-.01.01-2.58 2.02c-1.52 1.19-3.4 1.83-5.32 1.83-4.8 0-8.72-3.86-8.72-8.62s3.92-8.62 8.72-8.62c2.81 0 4.67 1.19 5.86 2.36L18.42 5c-.71-.69-2.09-1.83-5.46-1.83-3.69 0-6.73 2.97-6.73 6.64s3.04 6.64 6.73 6.64c2.86 0 4.69-1.22 5.56-2.26l.01-.01-4.73-3.71z" fill="#FFFFFF"></path>
                            </svg>
                            <span>Sign in with Google</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        const authForm = document.getElementById('auth-form');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const usernameField = document.getElementById('username-field');
        const usernameInput = document.getElementById('username');
        const authTitle = document.getElementById('auth-title');
        const authSubmitBtn = document.getElementById('auth-submit-btn');
        const toggleAuthModeBtn = document.getElementById('toggle-auth-mode');
        const forgotPasswordBtn = document.getElementById('forgot-password-btn');
        const googleAuthBtn = document.getElementById('google-auth-btn'); // Get the Google button

        let isSignUpMode = false;

        toggleAuthModeBtn.addEventListener('click', () => {
            isSignUpMode = !isSignUpMode;
            authTitle.textContent = isSignUpMode ? 'Create Account' : 'Sign In';
            authSubmitBtn.textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
            toggleAuthModeBtn.textContent = isSignUpMode ? 'Already have an account? Sign In' : 'Need an account? Sign Up';
            usernameField.classList.toggle('hidden', !isSignUpMode);
            usernameInput.required = isSignUpMode;
            forgotPasswordBtn.classList.toggle('hidden', isSignUpMode);
        });

        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = emailInput.value;
            const password = passwordInput.value;
            const username = usernameInput.value;

            try {
                await authenticateUser(isSignUpMode ? 'signup' : 'login', { email, password, username });
                // onAuthStateChanged listener will handle redirection after successful auth
                if (isSignUpMode) {
                    showMessageModal('Account created successfully! You are now signed in.');
                } else {
                    showMessageModal('Signed in successfully!');
                }
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
        });

        forgotPasswordBtn.addEventListener('click', async () => {
            const email = emailInput.value;
            if (!email) {
                showMessageModal("Please enter your email to reset password.", 'info');
                return;
            }
            try {
                await sendPasswordReset(email);
                showMessageModal("Password reset email sent! Check your inbox.");
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
        });

        // Add event listener for Google button
        googleAuthBtn.addEventListener('click', async () => {
            try {
                await authenticateUser('google');
                showMessageModal('Signed in with Google successfully!');
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
        });
    }

    /**
     * Renders the Profile (Settings) page.
     */
    function renderProfilePage() {
        if (!currentUser || !userData) {
            console.warn("Attempted to render profile page without current user or user data.");
            navigateTo('auth'); // Redirect to auth if not logged in or data not ready
            return;
        }

        const backgroundOptions = [
            { name: 'Blue-Purple Gradient (Default)', class: 'bg-gradient-to-r from-blue-400 to-purple-600' },
            { name: 'Green-Cyan Gradient', class: 'bg-gradient-to-r from-green-400 to-cyan-600' },
            { name: 'Red-Black Gradient', class: 'bg-gradient-to-r from-red-800 to-black' }, // New
            { name: 'Orange-Red Gradient', class: 'bg-gradient-to-r from-orange-600 to-red-600' }, // New
            // Note: Custom URL for images/GIFs is handled by the input field directly below
        ];

        contentArea.innerHTML = `
            <div class="flex flex-col items-center justify-center p-4">
                <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-xl backdrop-blur-sm bg-opacity-80 border border-gray-200">
                    <h2 class="text-3xl font-extrabold text-center text-gray-800 mb-8">Your Profile Settings</h2>

                    <div class="flex flex-col items-center mb-6">
                        <img id="profile-pic-display" src="${userData.profilePicUrl || `https://placehold.co/100x100/F0F0F0/000000?text=${(userData.username || currentUser.email || 'U').charAt(0).toUpperCase()}`}" alt="Profile" class="w-32 h-32 rounded-full object-cover border-4 border-blue-500 shadow-md">
                        <p class="text-gray-600 mt-4 text-sm">To change profile picture, provide a direct image URL below.</p>
                    </div>

                    <form id="profile-form" class="space-y-6">
                        <div>
                            <label for="profile-username" class="block text-gray-700 text-sm font-semibold mb-2">Username</label>
                            <input type="text" id="profile-username" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value="${userData.username || ''}" required>
                        </div>
                        <div>
                            <label for="profile-email" class="block text-gray-700 text-sm font-semibold mb-2">Email</label>
                            <input type="email" id="profile-email" class="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed" value="${currentUser.email}" disabled>
                        </div>
                        <div>
                            <label for="profile-pic-url" class="block text-gray-700 text-sm font-semibold mb-2">Profile Picture URL</label>
                            <input type="url" id="profile-pic-url" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., https://example.com/your-image.jpg" value="${userData.profilePicUrl || ''}">
                        </div>
                        <div>
                            <label for="profile-background-select" class="block text-gray-700 text-sm font-semibold mb-2">Website Background Theme</label>
                            <select id="profile-background-select" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                                ${backgroundOptions.map(option => `
                                    <option value="${option.class}" ${userData.backgroundUrl === option.class ? 'selected' : ''}>
                                        ${option.name}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div>
                            <label for="custom-background-url" class="block text-gray-700 text-sm font-semibold mb-2">Custom Background Image/GIF URL (Overrides Theme)</label>
                            <input type="url" id="custom-background-url" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g., https://example.com/your-animated.gif" value="${(userData.backgroundUrl && (userData.backgroundUrl.startsWith('http') || userData.backgroundUrl.startsWith('https'))) ? userData.backgroundUrl : ''}">
                            <p class="text-xs text-gray-500 mt-1">For GIFs, choose a subtle or abstract one for a formal look. This will override the theme selection above.</p>
                        </div>
                        <button type="submit" id="save-profile-btn" class="w-full py-3 rounded-full bg-green-600 text-white font-bold text-lg hover:bg-green-700 transition duration-300 transform hover:scale-105 shadow-lg">
                            Save Changes
                        </button>
                    </form>
                </div>
            </div>
        `;

        const profileForm = document.getElementById('profile-form');
        const usernameInput = document.getElementById('profile-username');
        const profilePicUrlInput = document.getElementById('profile-pic-url');
        const backgroundSelect = document.getElementById('profile-background-select'); // Changed ID
        const customBackgroundUrlInput = document.getElementById('custom-background-url'); // New input
        const profilePicDisplay = document.getElementById('profile-pic-display');

        // Update profile picture preview as URL changes
        profilePicUrlInput.addEventListener('input', () => {
          profilePicDisplay.src = profilePicUrlInput.value || `https://placehold.co/100x100/F0F0F0/000000?text=${(usernameInput.value || 'U').charAt(0).toUpperCase()}`;
        });
        profilePicDisplay.onerror = () => { // Fallback for broken image URLs
            profilePicDisplay.src = `https://placehold.co/100x100/F0F0F0/000000?text=${(usernameInput.value || 'U').charAt(0).toUpperCase()}`;
        };


        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newUsername = usernameInput.value;
            const newProfilePicUrl = profilePicUrlInput.value || `https://placehold.co/100x100/F0F0F0/000000?text=${(newUsername || 'U').charAt(0).toUpperCase()}`;
            
            let newBackgroundUrl;
            // If custom URL is provided, use it. Otherwise, use the selected theme.
            if (customBackgroundUrlInput.value) {
                newBackgroundUrl = customBackgroundUrlInput.value;
            } else {
                newBackgroundUrl = backgroundSelect.value;
            }

            try {
                const updatedData = await updateProfileData({
                    username: newUsername,
                    profilePicUrl: newProfilePicUrl,
                    backgroundUrl: newBackgroundUrl // This can now be a class string or a URL
                });
                if (updatedData) {
                    userData = updatedData; // Update global userData
                    updateBodyBackground(); // Apply new background immediately
                    showMessageModal('Profile updated successfully!');
                    renderNavbar(); // Re-render navbar to update name/pic
                }
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
        });
    }

    /**
     * Renders the About page content.
     */
    function renderAboutPage() {
        contentArea.innerHTML = `
            <div class="flex flex-col items-center justify-center p-4">
                <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl text-center backdrop-blur-sm bg-opacity-80 border border-gray-200">
                    <h2 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600 mb-6">About ${CONFIG.websiteTitle}</h2>
                    <p class="text-lg text-gray-700 mb-4">
                        Welcome to a secure and user-friendly platform designed to streamline your online experience. We offer robust user authentication, allowing you to sign up and sign in with ease, keeping your data safe.
                    </p>
                    <p class="text-lg text-gray-700 mb-4">
                        Our platform is built with a focus on personalization. You can update your profile information, choose a custom background theme, and manage your personal details within a dedicated settings section.
                    </p>
                    <p class="text-lg text-gray-700 mb-4">
                        For administrators, we provide a powerful admin panel. This feature allows designated users to oversee all registered accounts, view user details, and manage roles (assigning 'admin' or 'member' status) to ensure smooth operation and access control. Admins can also create and manage forum posts.
                    </p>
                    <p class="text-lg text-gray-700 mb-4">
                        Members can engage with forum posts by adding reactions and comments, fostering a dynamic community environment.
                    </p>
                    <p class="text-lg text-gray-700 mb-4">
                        We prioritize responsive design, ensuring that our website looks great and functions perfectly on any device, from desktops to mobile phones. Our clean, modern interface is powered by efficient technologies to provide a seamless browsing experience.
                    </p>
                    <p class="text-lg text-gray-700">
                        Thank you for choosing our platform. We're committed to providing a reliable and enjoyable service.
                    </p>
                </div>
            </div>
        `;
    }

    /**
     * Renders the Admin Panel page.
     */
    async function renderAdminPanelPage() {
        if (!currentUser || !userData || (userData.role !== 'admin' && userData.role !== 'founder')) {
            console.warn("Attempted to render Admin Panel without sufficient privileges.");
            contentArea.innerHTML = `
                <div class="flex flex-col items-center justify-center p-4">
                    <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-xl text-center backdrop-blur-sm bg-opacity-80 border border-gray-200">
                        <h2 class="text-3xl font-extrabold text-red-600 mb-4">Access Denied</h2>
                        <p class="text-lg text-gray-700">You do not have administrative privileges to access this page.</p>
                    </div>
                </div>
            `;
            return;
        }

        try {
            usersList = await fetchAllUsersFirestore();
            roomsList = await fetchAllRoomsFirestore(); // Fetch rooms for display
        } catch (error) {
            showMessageModal(error.message, 'error');
            usersList = []; // Clear list if fetch fails
            roomsList = [];
        }


        contentArea.innerHTML = `
            <div class="flex flex-col items-center justify-center p-4 min-h-[calc(100vh-64px)]">
                <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-4xl backdrop-blur-sm bg-opacity-80 border border-gray-200">
                    <h2 class="text-3xl font-extrabold text-center text-gray-800 mb-8">Admin Panel</h2>
                    <p class="text-lg text-gray-700 text-center mb-6">Manage user roles and accounts, forum posts, and communication rooms.</p>
                    
                    <div class="mb-8 text-center space-x-4">
                        <button id="view-forum-admin-btn" class="py-2 px-6 rounded-full bg-purple-600 text-white font-bold text-lg hover:bg-purple-700 transition duration-300 transform hover:scale-105 shadow-lg">
                            Manage Posts (Forum)
                        </button>
                        <button id="manage-rooms-admin-btn" class="py-2 px-6 rounded-full bg-teal-600 text-white font-bold text-lg hover:bg-teal-700 transition duration-300 transform hover:scale-105 shadow-lg">
                            Manage Rooms
                        </button>
                    </div>

                    <h3 class="text-2xl font-bold text-gray-800 mb-4 text-center">Manage Users</h3>
                    ${usersList.length === 0 ? `
                        <p class="text-center text-gray-600">No users found.</p>
                    ` : `
                        <div class="overflow-x-auto rounded-lg shadow-md border border-gray-200 mb-8">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-gray-100">
                                    <tr>
                                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Icon
                                        </th>
                                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Username
                                        </th>
                                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Email
                                        </th>
                                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Role
                                        </th>
                                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200" id="users-table-body">
                                    <!-- Users will be populated here by JS -->
                                </tbody>
                            </table>
                        </div>
                    `}
                    
                    <h3 class="text-2xl font-bold text-gray-800 mb-4 text-center">Manage Rooms</h3>
                    <div class="mb-6 text-center">
                        <button id="create-room-btn" class="py-2 px-6 rounded-full bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                            Create New Room
                        </button>
                    </div>
                    ${roomsList.length === 0 ? `
                        <p class="text-center text-gray-600">No rooms created yet.</p>
                    ` : `
                        <div class="overflow-x-auto rounded-lg shadow-md border border-gray-200">
                            <table class="min-w-full divide-y divide-gray-200">
                                <thead class="bg-gray-100">
                                    <tr>
                                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Title
                                        </th>
                                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Description
                                        </th>
                                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Creator
                                        </th>
                                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Created On
                                        </th>
                                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white divide-y divide-gray-200" id="rooms-table-body">
                                    <!-- Rooms will be populated here by JS -->
                                </tbody>
                            </table>
                        </div>
                    `}
                </div>
            </div>
        `;

        // Populate Users Table
        if (usersList.length > 0) {
            const usersTableBody = document.getElementById('users-table-body');
            usersTableBody.innerHTML = usersList.map(user => {
                const profileIconSrc = user.profilePicUrl || `https://placehold.co/100x100/F0F0F0/000000?text=${(user.username || user.email || 'U').charAt(0).toUpperCase()}`;
                const isDisabled = user.id === currentUser.uid ? 'disabled' : ''; 
                const canAssignFounder = userData.role === 'founder';
                const showFounderOption = canAssignFounder || user.role === 'founder'; // Show founder option if current user is founder or if target user is already a founder

                return `
                    <tr data-user-id="${user.id}" class="hover:bg-gray-50">
                        <td class="px-6 py-4 whitespace-nowrap">
                            <img src="${profileIconSrc}" alt="User Icon" class="w-10 h-10 rounded-full object-cover border-2 border-gray-300" onerror="this.onerror=null; this.src='https://placehold.co/100x100/F0F0F0/000000?text=${(user.username || user.email || 'U').charAt(0).toUpperCase()}'">
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ${user.username}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${user.email}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <select
                                class="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                ${isDisabled}
                                data-role-select-id="${user.id}"
                            >
                                <option value="member" ${user.role === 'member' ? 'selected' : ''}>Member</option>
                                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                ${showFounderOption ? `<option value="founder" ${user.role === 'founder' ? 'selected' : ''}>Founder</option>` : ''}
                            </select>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                                class="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500"
                                data-take-action-user-id="${user.id}" data-username="${user.username}"
                            >
                                Take Action
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            usersTableBody.querySelectorAll('[data-role-select-id]').forEach(selectElement => {
                selectElement.addEventListener('change', async (e) => {
                    const userId = e.target.dataset.roleSelectId;
                    const newRole = e.target.value;
                    showMessageModal(`Are you sure you want to change this user's role to "${newRole}"?`, 'confirm', async () => {
                        try {
                            const success = await updateUserRoleFirestore(userId, newRole);
                            if (success) { // Only show success if the operation actually proceeded (not blocked by self-check)
                                showMessageModal(`User role updated to "${newRole}" successfully!`);
                                renderAdminPanelPage(); // Re-render admin panel to reflect changes
                            }
                        }
                        catch (error) {
                            showMessageModal(error.message, 'error');
                            renderAdminPanelPage(); // Re-render to revert dropdown if failed
                        }
                    });
                });
            });

            usersTableBody.querySelectorAll('[data-take-action-user-id]').forEach(button => {
                button.addEventListener('click', (e) => {
                    const userId = e.target.dataset.takeActionUserId;
                    const userToActOn = usersList.find(user => user.id === userId);
                    if (userToActOn) {
                        showTakeActionModal(userToActOn);
                    }
                });
            });
        }

        // Populate Rooms Table
        if (roomsList.length > 0) {
            const roomsTableBody = document.getElementById('rooms-table-body');
            roomsTableBody.innerHTML = roomsList.map(room => `
                <tr data-room-id="${room.id}" class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${room.title}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${room.description}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${room.creatorUsername}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${room.timestamp}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                            class="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-red-600 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-red-500"
                            data-delete-room-id="${room.id}" data-room-title="${room.title}"
                        >
                            Delete
                        </button>
                    </td>
                </tr>
            `).join('');

            roomsTableBody.querySelectorAll('[data-delete-room-id]').forEach(button => {
                button.addEventListener('click', (e) => {
                    const roomId = e.target.dataset.deleteRoomId;
                    const roomTitle = e.target.dataset.roomTitle;
                    showMessageModal(`Are you sure you want to delete room "${roomTitle}"? This action cannot be undone.`, 'confirm', async () => {
                        try {
                            await deleteRoomFirestore(roomId);
                            renderAdminPanelPage(); // Re-render admin panel to reflect changes
                        } catch (error) {
                            showMessageModal(error.message, 'error');
                        }
                    });
                });
            });
        }

        document.getElementById('view-forum-admin-btn').addEventListener('click', () => navigateTo('forum'));
        // Clicking "Manage Rooms" just re-renders the current admin panel
        document.getElementById('manage-rooms-admin-btn').addEventListener('click', () => renderAdminPanelPage()); 
        document.getElementById('create-room-btn').addEventListener('click', () => showCreateRoomModal());
    }

    /**
     * Shows a modal for taking action on a user (Ban/Unban/Delete).
     * @param {object} user - The user object to display and act upon.
     */
    function showTakeActionModal(user) {
        if (currentModal) {
            currentModal.remove(); // Remove any existing modal
        }

        const modal = document.createElement('div');
        modal.id = 'take-action-modal';
        modal.className = 'fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-50 p-4';

        const profileIconSrc = user.profilePicUrl || `https://placehold.co/100x100/F0F0F0/000000?text=${(user.username || user.email || 'U').charAt(0).toUpperCase()}`;
        const isDisabledForSelf = user.id === currentUser.uid ? 'disabled' : '';

        modal.innerHTML = `
            <div class="bg-white p-8 rounded-xl shadow-2xl text-center max-w-md w-full relative">
                <button class="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl font-bold" id="close-take-action-modal">&times;</button>
                <h3 class="text-2xl font-extrabold text-gray-800 mb-6">User Actions</h3>
                
                <div class="flex flex-col items-center mb-6">
                    <img src="${profileIconSrc}" alt="User Profile" class="w-24 h-24 rounded-full object-cover border-4 border-blue-500 shadow-md mb-3">
                    <p class="text-xl font-semibold text-gray-900">${user.username}</p>
                    <p class="text-md text-gray-600">${user.email}</p>
                    <p class="text-md font-medium text-gray-700 mt-2">Role: <span class="font-bold">${user.role}</span></p>
                    <p class="text-md font-medium text-gray-700">Status: <span class="font-bold ${user.isBanned ? 'text-red-600' : 'text-green-600'}">${user.isBanned ? 'Banned' : 'Active'}</span></p>
                </div>

                <div class="space-y-4">
                    <button id="ban-user-btn" class="w-full py-3 rounded-full bg-red-600 text-white font-bold text-lg hover:bg-red-700 transition duration-300 transform hover:scale-105 shadow-lg ${user.isBanned ? 'hidden' : ''} ${isDisabledForSelf}">
                        Ban Account
                    </button>
                    <button id="unban-user-btn" class="w-full py-3 rounded-full bg-green-600 text-white font-bold text-lg hover:bg-green-700 transition duration-300 transform hover:scale-105 shadow-lg ${!user.isBanned ? 'hidden' : ''} ${isDisabledForSelf}">
                        Unban Account
                    </button>
                    <button id="delete-user-btn" class="w-full py-3 rounded-full bg-gray-500 text-white font-bold text-lg hover:bg-gray-600 transition duration-300 transform hover:scale-105 shadow-lg ${isDisabledForSelf}">
                        Delete Account
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        currentModal = modal;

        document.getElementById('close-take-action-modal').addEventListener('click', () => {
            currentModal.remove();
            currentModal = null;
        });

        const banBtn = document.getElementById('ban-user-btn');
        const unbanBtn = document.getElementById('unban-user-btn');
        const deleteBtn = document.getElementById('delete-user-btn');

        if (banBtn) {
            banBtn.addEventListener('click', () => {
                showMessageModal(`Are you sure you want to BAN user "${user.username}"? They will no longer be able to log in.`, 'confirm', async () => {
                    try {
                        const success = await setUserBanStatusFirestore(user.id, true);
                        if (success) {
                            showMessageModal(`User "${user.username}" has been banned.`);
                            currentModal.remove(); // Close modal after action
                            currentModal = null;
                            renderAdminPanelPage(); // Re-render admin panel to update UI
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
                        const success = await setUserBanStatusFirestore(user.id, false);
                        if (success) {
                            showMessageModal(`User "${user.username}" has been unbanned.`);
                            currentModal.remove(); // Close modal after action
                            currentModal = null;
                            renderAdminPanelPage(); // Re-render to update UI
                        }
                    } catch (error) {
                        showMessageModal(error.message, 'error');
                    }
                });
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                showMessageModal(`Are you sure you want to DELETE user "${user.username}"? This action cannot be undone and will only remove their data from Firestore.`, 'confirm', async () => {
                    try {
                        const success = await deleteUserFirestore(user.id);
                        if (success) {
                            showMessageModal(`User "${user.username}" data deleted successfully!`);
                            currentModal.remove(); // Close modal after action
                            currentModal = null;
                            renderAdminPanelPage(); // Re-render admin panel to reflect changes
                        }
                    } catch (error) {
                        showMessageModal(error.message, 'error');
                    }
                });
            });
        }
    }

    /**
     * Shows a modal for creating a new room.
     */
    function showCreateRoomModal() {
        if (currentModal) {
            currentModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'create-room-modal';
        modal.className = 'fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-50 p-4';
        modal.innerHTML = `
            <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg backdrop-blur-sm bg-opacity-90 border border-gray-200">
                <h2 class="text-2xl font-extrabold text-center text-gray-800 mb-6">Create New Room</h2>
                <form id="create-room-modal-form" class="space-y-4">
                    <div>
                        <label for="room-title" class="block text-gray-700 text-sm font-semibold mb-2">Room Title</label>
                        <input type="text" id="room-title" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter room title" required>
                    </div>
                    <div>
                        <label for="room-description" class="block text-gray-700 text-sm font-semibold mb-2">Description</label>
                        <textarea id="room-description" rows="5" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Describe the purpose of this room..."></textarea>
                    </div>
                    <div class="flex justify-end space-x-4 mt-6">
                        <button type="button" id="cancel-create-room-modal" class="py-2 px-5 rounded-full bg-gray-500 text-white font-bold hover:bg-gray-600 transition duration-300 transform hover:scale-105 shadow-lg">
                            Cancel
                        </button>
                        <button type="submit" class="py-2 px-5 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                            Create Room
                        </button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        currentModal = modal;

        document.getElementById('cancel-create-room-modal').addEventListener('click', () => {
            currentModal.remove();
            currentModal = null;
        });

        document.getElementById('create-room-modal-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('room-title').value;
            const description = document.getElementById('room-description').value;

            try {
                await createRoomFirestore(title, description);
                currentModal.remove();
                currentModal = null;
                renderAdminPanelPage(); // Re-render admin panel to show new room
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
        });
    }

    /**
     * Renders the Edit Post page for admins/founders.
     * @param {string} postId - The ID of the post to edit.
     */
    async function renderEditPostPage(postId) {
        if (!currentUser || !userData || (userData.role !== 'admin' && userData.role !== 'founder')) {
            console.warn("Attempted to render Edit Post page without sufficient privileges.");
            contentArea.innerHTML = `
                <div class="flex flex-col items-center justify-center p-4">
                    <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-xl text-center backdrop-blur-sm bg-opacity-80 border border-gray-200">
                        <h2 class="text-3xl font-extrabold text-red-600 mb-4">Access Denied</h2>
                        <p class="text-lg text-gray-700">You do not have administrative privileges to edit posts.</p>
                    </div>
                </div>
            `;
            return;
        }

        showLoadingSpinner();
        let postData;
        try {
            const postDocRef = doc(db, `/artifacts/${APP_ID}/public/data/posts`, postId);
            const docSnap = await getDoc(postDocRef);
            if (docSnap.exists()) {
                postData = docSnap.data();
            } else {
                showMessageModal('Post not found.', 'error');
                navigateTo('forum');
                return;
            }
        } catch (error) {
            showMessageModal('Error fetching post for editing: ' + error.message, 'error');
            navigateTo('forum');
            return;
        } finally {
            hideLoadingSpinner();
        }

        contentArea.innerHTML = `
            <div class="flex flex-col items-center justify-center p-4">
                <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl backdrop-blur-sm bg-opacity-80 border border-gray-200">
                    <h2 class="text-3xl font-extrabold text-center text-gray-800 mb-8">Edit Post</h2>
                    <form id="edit-post-form" class="space-y-6">
                        <div>
                            <label for="post-title" class="block text-gray-700 text-sm font-semibold mb-2">Post Title</label>
                            <input type="text" id="post-title" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" value="${postData.title}" required>
                        </div>
                        <div>
                            <label for="post-content" class="block text-gray-700 text-sm font-semibold mb-2">Post Content</label>
                            <textarea id="post-content" rows="10" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" required>${postData.content}</textarea>
                        </div>
                        <button type="submit" class="w-full py-3 rounded-full bg-green-600 text-white font-bold text-lg hover:bg-green-700 transition duration-300 transform hover:scale-105 shadow-lg">
                            Save Changes
                        </button>
                        <button type="button" id="cancel-edit-btn" class="w-full py-3 rounded-full bg-gray-500 text-white font-bold text-lg hover:bg-gray-600 transition duration-300 transform hover:scale-105 shadow-lg mt-2">
                            Cancel
                        </button>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('edit-post-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('post-title').value;
            const content = document.getElementById('post-content').value;

            try {
                await updatePostFirestore(postId, title, content);
                navigateTo('forum'); // Redirect to forum after editing
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
        });

        document.getElementById('cancel-edit-btn').addEventListener('click', () => navigateTo('forum'));
    }

    /**
     * Renders the Forum page, displaying all posts.
     */
    async function renderForumPage() {
        if (!currentUser) {
            console.warn("Attempted to render Forum page without current user.");
            contentArea.innerHTML = `
                <div class="flex flex-col items-center justify-center p-4">
                    <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-xl text-center backdrop-blur-sm bg-opacity-80 border border-gray-200">
                        <h2 class="text-3xl font-extrabold text-red-600 mb-4">Access Denied</h2>
                        <p class="text-lg text-gray-700">Please sign in to view the forum posts.</p>
                    </div>
                </div>
            `;
            return;
        }

        let posts = [];
        try {
            posts = await fetchAllPostsFirestore();
        } catch (error) {
            showMessageModal(error.message, 'error');
            posts = [];
        }

        contentArea.innerHTML = `
            <div class="flex flex-col items-center justify-center p-4 min-h-[calc(100vh-64px)]">
                <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-3xl backdrop-blur-sm bg-opacity-80 border border-gray-200">
                    <h2 class="text-3xl font-extrabold text-center text-gray-800 mb-8">Forum & Announcements</h2>
                    ${(userData && (userData.role === 'admin' || userData.role === 'founder')) ? `
                        <div class="mb-6 text-center">
                            <button id="create-post-btn" class="py-2 px-6 rounded-full bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                                Create New Post
                            </button>
                        </div>
                    ` : ''}

                    ${posts.length === 0 ? `
                        <p class="text-center text-gray-600">No posts yet. Check back later!</p>
                    ` : `
                        <div id="posts-list" class="space-y-6">
                            ${posts.map(post => `
                                <div class="bg-gray-50 p-6 rounded-lg shadow-md border border-gray-200">
                                    <h3 class="text-2xl font-bold text-gray-800 mb-2">${post.title}</h3>
                                    <p class="text-gray-700 whitespace-pre-wrap">${post.content}</p>
                                    <p class="text-sm text-gray-500 mt-4">
                                        Posted by <span class="font-semibold">${post.authorUsername}</span> on ${post.timestamp}
                                    </p>
                                    
                                    <div class="flex items-center space-x-4 mt-4 border-t pt-4 border-gray-300">
                                        <!-- Reactions Section -->
                                        <div class="flex items-center space-x-2">
                                            ${['👍', '❤️', '😂', '🔥'].map(emoji => `
                                                <button class="text-xl p-1 rounded-full hover:bg-gray-200 transition duration-200" data-post-id="${post.id}" data-emoji="${emoji}">
                                                    ${emoji} <span class="text-sm text-gray-600">${post.reactions[emoji] || 0}</span>
                                                </button>
                                            `).join('')}
                                        </div>

                                        <!-- Admin Actions (Edit/Delete) -->
                                        ${(userData && (userData.role === 'admin' || userData.role === 'founder')) ? `
                                            <div class="ml-auto space-x-2">
                                                <button class="text-blue-600 hover:text-blue-800 font-semibold" data-post-id="${post.id}" data-action="edit">Edit</button>
                                                <button class="text-red-600 hover:text-red-800 font-semibold" data-post-id="${post.id}" data-action="delete">Delete</button>
                                            </div>
                                        ` : ''}
                                    </div>

                                    <!-- Comments Section -->
                                    <div class="mt-6 border-t pt-4 border-gray-300">
                                        <h4 class="text-lg font-semibold text-gray-800 mb-3">Comments (${post.comments.length})</h4>
                                        <div class="space-y-3 mb-4">
                                            ${post.comments.length === 0 ? `
                                                <p class="text-sm text-gray-500">No comments yet. Be the first to comment!</p>
                                            ` : `
                                                ${post.comments.map(comment => `
                                                    <div class="bg-white p-3 rounded-lg border border-gray-200">
                                                        <p class="text-sm text-gray-700">${comment.text}</p>
                                                        <p class="text-xs text-gray-500 mt-1">by <span class="font-medium">${comment.authorUsername}</span> on ${comment.timestamp ? new Date(comment.timestamp).toLocaleString() : 'N/A'}</p>
                                                    </div>
                                                `).join('')}
                                            `}
                                        </div>
                                        <form class="comment-form" data-post-id="${post.id}">
                                            <textarea class="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" rows="2" placeholder="Add a comment..." required></textarea>
                                            <button type="submit" class="mt-2 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-200 text-sm">
                                                Post Comment
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;

        // Add event listeners for new "Create New Post" button on forum page
        const createPostBtn = document.getElementById('create-post-btn');
        if (createPostBtn) {
            createPostBtn.addEventListener('click', () => {
                // Instead of navigating to a separate page, show a modal for post creation
                showCreatePostModal();
            });
        }


        // Add event listeners for reactions
        contentArea.querySelectorAll('[data-emoji]').forEach(button => {
            button.addEventListener('click', async (e) => {
                const postId = e.target.closest('[data-post-id]').dataset.postId;
                const emoji = e.target.dataset.emoji || e.target.parentElement.dataset.emoji; // Handles click on span inside button
                if (postId && emoji) {
                    await addReactionToPost(postId, emoji);
                }
            });
        });

        // Add event listeners for admin actions (Edit/Delete)
        contentArea.querySelectorAll('[data-action="edit"]').forEach(button => {
            button.addEventListener('click', (e) => {
                const postId = e.target.dataset.postId;
                navigateTo('edit-post', postId); // Pass postId to navigateTo
            });
        });

        contentArea.querySelectorAll('[data-action="delete"]').forEach(button => {
            button.addEventListener('click', (e) => {
                const postId = e.target.dataset.postId;
                showMessageModal('Are you sure you want to delete this post? This action cannot be undone.', 'confirm', async () => {
                    try {
                        await deletePostFirestore(postId);
                        renderForumPage(); // Re-render to show updated list
                    } catch (error) {
                        showMessageModal(error.message, 'error');
                    }
                });
            });
        });

        // Add event listeners for comments
        contentArea.querySelectorAll('.comment-form').forEach(form => {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const postId = form.dataset.postId;
                const textarea = form.querySelector('textarea');
                const commentText = textarea.value;
                await addCommentToPost(postId, commentText);
                textarea.value = ''; // Clear textarea after posting
            });
        });
    }

    /**
     * Shows a modal for creating a new post.
     */
    function showCreatePostModal() {
        if (currentModal) {
            currentModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'create-post-modal';
        modal.className = 'fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-50 p-4';
        modal.innerHTML = `
            <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg backdrop-blur-sm bg-opacity-90 border border-gray-200">
                <h2 class="text-2xl font-extrabold text-center text-gray-800 mb-6">Create New Post</h2>
                <form id="create-post-modal-form" class="space-y-4">
                    <div>
                        <label for="modal-post-title" class="block text-gray-700 text-sm font-semibold mb-2">Title</label>
                        <input type="text" id="modal-post-title" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter post title" required>
                    </div>
                    <div>
                        <label for="modal-post-content" class="block text-gray-700 text-sm font-semibold mb-2">Content</label>
                        <textarea id="modal-post-content" rows="7" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Write your post content here..." required></textarea>
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
        currentModal = modal;

        document.getElementById('cancel-create-post-modal').addEventListener('click', () => {
            currentModal.remove();
            currentModal = null;
        });

        document.getElementById('create-post-modal-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('modal-post-title').value;
            const content = document.getElementById('modal-post-content').value;

            try {
                await createPostFirestore(title, content);
                currentModal.remove();
                currentModal = null;
                renderForumPage(); // Re-render forum to show new post
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
        });
    }

    /**
     * Renders the "Meet the Team" page.
     */
    async function renderTeamPage() {
        if (!currentUser) {
             console.warn("Attempted to render Team page without current user.");
             contentArea.innerHTML = `
                 <div class="flex flex-col items-center justify-center p-4">
                     <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-xl text-center backdrop-blur-sm bg-opacity-80 border border-gray-200">
                         <h2 class="text-3xl font-extrabold text-red-600 mb-4">Access Denied</h2>
                         <p class="text-lg text-gray-700">Please sign in to view the team members.</p>
                     </div>
                 </div>
             `;
             return;
         }
        showLoadingSpinner();
        let teamMembers = [];
        try {
            teamMembers = await fetchTeamMembersFirestore();
        } catch (error) {
            showMessageModal(error.message, 'error');
        } finally {
            hideLoadingSpinner();
        }

        const isAdminOrFounder = currentUser && (userData && (userData.role === 'admin' || userData.role === 'founder'));

        contentArea.innerHTML = `
            <div class="flex flex-col items-center justify-center p-4 min-h-[calc(100vh-64px)]">
                <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-3xl backdrop-blur-sm bg-opacity-80 border border-gray-200">
                    <h2 class="text-3xl font-extrabold text-center text-gray-800 mb-8">Meet the Team</h2>
                    
                    ${isAdminOrFounder ? `
                        <div class="mb-8 p-6 bg-gray-100 rounded-lg shadow-inner">
                            <h3 class="text-xl font-bold text-gray-800 mb-4 text-center">Add New Team Member</h3>
                            <form id="add-team-member-form" class="space-y-4">
                                <div>
                                    <label for="team-username" class="block text-gray-700 text-sm font-semibold mb-2">Username</label>
                                    <input type="text" id="team-username" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter team member's username" required>
                                </div>
                                <div>
                                    <label for="team-role" class="block text-gray-700 text-sm font-semibold mb-2">Role</label>
                                    <select id="team-role" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none" required>
                                        <option value="">Select Role</option>
                                        <option value="member">Member</option>
                                        <option value="admin">Admin</option>
                                        <option value="founder">Founder</option>
                                    </select>
                                </div>
                                <button type="submit" class="w-full py-3 rounded-full bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                                    Add Team Member
                                </button>
                            </form>
                        </div>
                    ` : ''}

                    <h3 class="text-2xl font-bold text-gray-800 mb-4 text-center">Current Team</h3>
                    ${teamMembers.length === 0 ? `
                        <p class="text-center text-gray-600">No team members listed yet.</p>
                    ` : `
                        <div class="space-y-4">
                            ${teamMembers.map(member => `
                                <div class="flex items-center justify-between bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200">
                                    <div class="flex items-center space-x-4">
                                        <p class="text-lg font-semibold text-gray-900">${member.username}</p>
                                        <span class="text-sm text-gray-600 px-3 py-1 rounded-full bg-gray-200">${member.role}</span>
                                    </div>
                                    ${isAdminOrFounder ? `
                                        <button class="text-red-600 hover:text-red-800 font-semibold text-sm" data-delete-team-member-id="${member.id}" data-username="${member.username}">
                                            Delete
                                        </button>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;

        if (isAdminOrFounder) {
            document.getElementById('add-team-member-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('team-username').value;
                const role = document.getElementById('team-role').value;
                try {
                    await addTeamMemberFirestore(username, role);
                    renderTeamPage(); // Re-render to show updated list
                } catch (error) {
                    showMessageModal(error.message, 'error');
                }
            });

            contentArea.querySelectorAll('[data-delete-team-member-id]').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const teamMemberId = e.target.dataset.deleteTeamMemberId;
                    const username = e.target.dataset.username;
                    showMessageModal(`Are you sure you want to remove "${username}" from the team?`, 'confirm', async () => {
                        try {
                            await deleteTeamMemberFirestore(teamMemberId);
                            renderTeamPage(); // Re-render to show updated list
                        } catch (error) {
                            showMessageModal(error.message, 'error');
                        }
                    });
                });
            });
        }
    }


    // --- Navigation and Initialization ---

    /**
     * Closes the side drawer menu.
     */
    function closeSideDrawer() {
        if (sideDrawerMenu) sideDrawerMenu.classList.remove('open');
        if (overlayBackdrop) overlayBackdrop.classList.remove('visible');
        if (mobileMenuIconOpen) mobileMenuIconOpen.classList.remove('hidden');
        if (mobileMenuIconClose) mobileMenuIconClose.classList.add('hidden');
        // Reset mobile dropdowns when closing the main drawer
        sideDrawerMenu.querySelectorAll('.mobile-dropdown-content.open').forEach(openContent => {
            openContent.style.maxHeight = '0px';
            openContent.classList.remove('open');
            openContent.previousElementSibling.querySelector('.fa-chevron-down').classList.remove('rotate-180');
        });
    }

    /**
     * Navigates to a specific page and renders its content.
     * @param {string} page - The page to navigate to ('home', 'auth', 'profile', 'about', 'admin', 'create-post', 'edit-post', 'forum', 'logout', 'team', 'rooms').
     * @param {string} [id=null] - Optional: postId for edit-post route, or any other ID.
     */
    async function navigateTo(page, id = null) {
        // Store the current page in a data attribute on the content area for tracking
        contentArea.dataset.currentPage = page;
        contentArea.dataset.currentId = id; // Store generic ID if applicable

        // Close any open desktop dropdowns on navigation
        document.querySelectorAll('.desktop-dropdown-content').forEach(content => {
            content.classList.add('hidden');
            content.style.maxHeight = '0px';
            const icon = content.previousElementSibling.querySelector('.fa-chevron-down');
            if (icon) icon.classList.remove('rotate-180');
        });

        // Handle logout outside of switch to ensure consistent sign out flow
        if (page === 'logout') {
            showLoadingSpinner();
            try {
                await signOut(auth);
                currentUser = null;
                userData = null;
                showMessageModal('You have been signed out.');
                window.location.href = 'index.html'; // Full refresh to home
            } catch (error) {
                console.error("Error signing out:", error.message);
                showMessageModal("Failed to sign out. Please try again.", 'error');
            } finally {
                hideLoadingSpinner();
            }
            return; // Exit navigateTo
        }

        // Redirect to full HTML pages if needed
        if (page.endsWith('.html')) {
            window.location.href = page;
            return;
        }

        // For in-page navigation (fragments)
        switch (page) {
            case 'home':
                renderHomePage();
                break;
            case 'auth':
                renderAuthPage();
                break;
            case 'profile':
                renderProfilePage();
                break;
            case 'about':
                renderAboutPage();
                break;
            case 'admin':
                renderAdminPanelPage();
                break;
            case 'edit-post': // For editing existing posts
                if (id) {
                    renderEditPostPage(id);
                } else {
                    showMessageModal("Invalid post ID for editing.", 'error');
                    navigateTo('forum');
                }
                break;
            case 'forum': // Forum page now includes create post functionality
                renderForumPage();
                break;
            case 'team': // New Team page
                renderTeamPage();
                break;
            default:
                renderHomePage();
        }
        renderNavbar(); // Always re-render navbar after page change to update login/logout state
    }

    // Mobile menu toggle (for side drawer)
    if (mobileMenuToggle) { // Defensive check
        mobileMenuToggle.addEventListener('click', () => {
            // Check if sideDrawerMenu exists before trying to access its classList
            const isOpen = sideDrawerMenu && sideDrawerMenu.classList.contains('open');
            if (isOpen) {
                closeSideDrawer();
            } else {
                if (sideDrawerMenu) sideDrawerMenu.classList.add('open');
                if (overlayBackdrop) overlayBackdrop.classList.add('visible');
                if (mobileMenuIconOpen) mobileMenuIconOpen.classList.add('hidden');
                if (mobileMenuIconClose) mobileMenuIconClose.classList.remove('hidden');
            }
        });
    } else {
        console.warn("Element with ID 'mobile-menu-toggle' not found. Mobile menu functionality may be broken.");
    }


    // Close side drawer when clicking on the overlay backdrop
    if (overlayBackdrop) { // Defensive check
        overlayBackdrop.addEventListener('click', closeSideDrawer);
    } else {
        console.warn("Element with ID 'overlay-backdrop' not found. Mobile menu overlay may not close correctly.");
    }

    // Firebase Auth State Listener
    // This is the most critical part for initial load and ongoing authentication state changes
    onAuthStateChanged(auth, async (user) => {
        console.log("onAuthStateChanged triggered. User:", user ? user.uid : "null");
        showLoadingSpinner();
        try {
            if (user) {
                currentUser = user;
                userData = await fetchCurrentUserFirestoreData(); // This also handles creating default doc if missing
                console.log("Auth state: Logged in. User data:", userData);
            } else {
                currentUser = null;
                userData = null;
                console.log("Auth state: Logged out.");
            }
            isAuthReady = true; // Mark auth state as ready
            updateBodyBackground(); // Apply user's saved background or default
            renderNavbar(); // Always update navbar based on current auth state

            // Determine which page to render based on current URL hash or default
            const currentHash = window.location.hash.substring(1); // Remove '#'
            let pageToRender = currentHash || 'home';
            let currentId = contentArea.dataset.currentId || null; // Preserve ID if it was set before refresh

            // Ensure navigation to protected pages is handled after auth state is ready
            const protectedPages = ['profile', 'admin', 'forum', 'team', 'edit-post'];
            const needsAuth = protectedPages.includes(pageToRender);

            if (needsAuth && !currentUser) {
                console.log(`Redirecting from protected page '${pageToRender}' to 'home' due to no current user.`);
                navigateTo('home'); // Redirect to home if trying to access protected page while logged out
            } else {
                console.log(`Navigating to page: '${pageToRender}' with ID: '${currentId}'`);
                navigateTo(pageToRender, currentId); // Proceed with rendering the page
            }

        } catch (error) {
            console.error("Error in onAuthStateChanged:", error);
            showMessageModal(`Critical error during authentication setup: ${error.message}. Please try again.`, 'error', () => {
                signOut(auth); // Attempt to sign out on critical error
                window.location.href = 'index.html'; // Force reload to clean state
            });
            currentUser = null;
            userData = null;
            isAuthReady = true; // Still set true to prevent infinite loading state
            renderNavbar(); // Render logout state navbar
            navigateTo('home'); // Go to home page
        } finally {
            hideLoadingSpinner();
        }
    });


    // Initial render call for static nav buttons.
    // The main page content render is now handled by onAuthStateChanged after auth is ready.
    if (navHomeButton) { // Defensive check
        navHomeButton.addEventListener('click', () => navigateTo('home'));
    } else {
        console.warn("Element with ID 'nav-home' not found. Home button may not be functional.");
    }
    if (navAboutButton) { // Defensive check
        navAboutButton.addEventListener('click', () => navigateTo('about'));
    } else {
        console.warn("Element with ID 'nav-about' not found. About button may not be functional.");
    }
    // Event listeners for static mobile drawer buttons (also ensure attached once)
    if (mobileDrawerHomeButton) { // Defensive check
        mobileDrawerHomeButton.addEventListener('click', () => navigateTo('home'));
    }
    if (mobileDrawerAboutButton) { // Defensive check
        mobileDrawerAboutButton.addEventListener('click', () => navigateTo('about'));
    }

    // Handle initial page load based on URL hash if no direct navigation has happened yet
    if (!window.location.hash && !contentArea.dataset.currentPage) {
        console.log("No hash or current page set. Navigating to home on initial load.");
        // This initial call will trigger renderHomePage, and then onAuthStateChanged will re-render
        // if user data changes the UI.
        navigateTo('home');
    }
});
