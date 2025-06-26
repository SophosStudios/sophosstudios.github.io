// App.js
// This script contains the entire application logic, including Firebase initialization
// and new features like forum, post management, reactions, comments, and enhanced backgrounds.

// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, query, onSnapshot, deleteDoc, orderBy, serverTimestamp, deleteField } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";
import CONFIG from './config.js';

// Import configuration from config.js
// This import is typically used for local development outside the Canvas environment.
// In Canvas, __app_id, __firebase_config, __initial_auth_token are provided globally.
// import CONFIG from './config.js'; // Make sure config.js is in the same directory

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Firebase
    const app = initializeApp(CONFIG);
    const auth = getAuth(app);
    const db = getFirestore(app);

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
    let postsList = []; // List of all forum posts
    let currentModal = null; // To manage active message modal
    let isDiscordChatOpen = false; // NEW: State for Discord chat visibility

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
    }

    /**
     * Hides the loading spinner.
     */
    function hideLoadingSpinner() {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.remove();
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
        if (!currentUser) return null;

        showLoadingSpinner();
        try {
            const userDocRef = doc(db, `/artifacts/${APP_ID}/public/data/users`, currentUser.uid);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                return docSnap.data();
            }
            console.log("Firestore document for user not found.");
            return null;
        } catch (error) {
            console.error("Error fetching user data from Firestore:", error.message);
            return null;
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
            await addDoc(postsCollectionRef, { // Use addDoc to auto-generate ID
                title: title,
                content: content,
                authorId: currentUser.uid,
                authorUsername: userData.username || currentUser.displayName || currentUser.email,
                timestamp: serverTimestamp(), // Use server timestamp for consistency
                reactions: {}, // Initialize empty reactions map
                comments: [] // Initialize empty comments array
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
     * @param {string} emoji - The emoji character (e.g., '👍', '❤️').
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
            }
        } catch (error) {
            console.error("Error adding reaction:", error.message);
            showMessageModal("Failed to add reaction: " + error.message, 'error');
        } finally {
            hideLoadingSpinner();
            // Re-render forum page to show updated reactions (might be slightly delayed by onSnapshot)
            // For immediate visual update, one might update `postsList` directly.
            // Current `onSnapshot` listener on `postsList` handles this.
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
        } catch (error) {
            console.error("Error adding comment:", error.message);
            showMessageModal("Failed to add comment: " + error.message, 'error');
        } finally {
            hideLoadingSpinner();
            // Re-render forum page to show updated comments (might be slightly delayed by onSnapshot)
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
                    // Update the global postsList directly from the listener
                    const updatedPostsData = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        updatedPostsData.push({
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
                    postsList = updatedPostsData; // Update global state
                    renderForumPage(); // Re-render forum page after data update
                    unsubscribe(); // Unsubscribe immediately after first fetch for this single call
                    resolve(postsList);
                }, (error) => {
                    reject(error);
                });
            });
            return postsList; // Return the updated global list
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
        } catch (error) {
            console.error("Error deleting team member:", error.message);
            throw new Error("Failed to delete team member: " + error.message);
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

        // Update website title (assuming CONFIG is available, otherwise default)
        document.querySelector('title').textContent = firebaseConfig.projectId || 'MyWebsite'; // Fallback to projectId or generic
        if (navHomeButton) {
            navHomeButton.textContent = firebaseConfig.projectId || 'MyWebsite';
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
                navigateTo(page);
                // Close side drawer after navigation
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
                    { id: 'nav-team', text: 'Meet the Team', page: 'team' } // New category item
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
        const closeAllDesktopDropdowns = () => {
            document.querySelectorAll('.desktop-dropdown-content').forEach(content => {
                content.classList.add('hidden');
                content.style.maxHeight = '0px';
                const icon = content.previousElementSibling.querySelector('.fa-chevron-down');
                if (icon) icon.classList.remove('rotate-180');
            });
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

                closeAllDesktopDropdowns(); // Close all other dropdowns first

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
                        navigateTo(page);
                        closeAllDesktopDropdowns(); // Close dropdown after navigation
                    });
                }
            });
        });

        // Close desktop dropdowns when clicking anywhere on the document
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
                        navigateTo(page);
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
                    Welcome to ${APP_ID || 'MyWebsite'}!
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
                        ${userData.role === 'admin' || userData.role === 'founder' ? `
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
            navigateTo('auth'); // Redirect to auth if not logged in
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
                    <h2 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600 mb-6">About ${APP_ID || 'Our Website'}</h2>
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
        if (!currentUser || (userData.role !== 'admin' && userData.role !== 'founder')) {
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
        } catch (error) {
            showMessageModal(error.message, 'error');
            usersList = []; // Clear list if fetch fails
        }


        contentArea.innerHTML = `
            <div class="flex flex-col items-center justify-center p-4 min-h-[calc(100vh-64px)]">
                <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-4xl backdrop-blur-sm bg-opacity-80 border border-gray-200">
                    <h2 class="text-3xl font-extrabold text-center text-gray-800 mb-8">Admin Panel</h2>
                    <p class="text-lg text-gray-700 text-center mb-6">Manage user roles and accounts, and create forum posts.</p>
                    <div class="mb-6 text-center space-x-4">
                        <button id="view-forum-admin-btn" class="py-2 px-6 rounded-full bg-purple-600 text-white font-bold text-lg hover:bg-purple-700 transition duration-300 transform hover:scale-105 shadow-lg">
                            Manage Posts (Forum)
                        </button>
                    </div>

                    <h3 class="text-2xl font-bold text-gray-800 mb-4 text-center">Manage Users</h3>
                    ${usersList.length === 0 ? `
                        <p class="text-center text-gray-600">No users found.</p>
                    ` : `
                        <div class="overflow-x-auto rounded-lg shadow-md border border-gray-200">
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
                </div>
            </div>
        `;

        if (usersList.length > 0) {
            const usersTableBody = document.getElementById('users-table-body');
            // Ensure the content is reset before mapping new users to avoid duplication on re-render
            usersTableBody.innerHTML = usersList.map(user => {
                const profileIconSrc = user.profilePicUrl || `https://placehold.co/100x100/F0F0F0/000000?text=${(user.username || user.email || 'U').charAt(0).toUpperCase()}`;
                // Disable controls for the current user to prevent self-demotion/deletion via UI
                const isDisabled = user.id === currentUser.uid ? 'disabled' : '';
                // Only founders can assign the 'founder' role
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

            // Add event listeners for role change and "Take Action" buttons
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
        // Removed create-post-btn from here, as it's now on the forum page
        document.getElementById('view-forum-admin-btn').addEventListener('click', () => navigateTo('forum')); // Admins/Founders can manage from forum view
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
     * Renders the Create Post page for admins/founders.
     * This page is now removed and creation happens directly on forum.
     */
    // function renderCreatePostPage() { /* ... removed ... */ }

    /**
     * Renders the Edit Post page for admins/founders.
     * @param {string} postId - The ID of the post to edit.
     */
    async function renderEditPostPage(postId) {
        if (!currentUser || (userData.role !== 'admin' && userData.role !== 'founder')) {
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

        // Fetch posts directly here and update postsList
        // The onSnapshot in the useEffect will keep postsList updated in the background
        // but for the initial render, we need to ensure posts are loaded.
        showLoadingSpinner();
        try {
            const postsCollectionRef = collection(db, `/artifacts/${APP_ID}/public/data/posts`);
            const q = query(postsCollectionRef, orderBy('timestamp', 'desc'));

            // Get current posts data
            const snapshot = await getDocs(q); // Use getDocs for a one-time fetch here
            postsList = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    title: data.title,
                    content: data.content,
                    authorUsername: data.authorUsername,
                    timestamp: data.timestamp ? (data.timestamp.toDate ? data.timestamp.toDate().toLocaleString() : new Date(data.timestamp).toLocaleString()) : 'N/A',
                    reactions: data.reactions || {},
                    comments: data.comments || []
                };
            });
        } catch (error) {
            console.error("Error fetching forum posts:", error);
            showMessageModal("Failed to load forum posts: " + error.message, 'error');
            postsList = [];
        } finally {
            hideLoadingSpinner();
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

                    ${postsList.length === 0 ? `
                        <p class="text-center text-gray-600">No posts yet. Check back later!</p>
                    ` : `
                        <div id="posts-list" class="space-y-6">
                            ${postsList.map(post => `
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
                // Find the closest parent element with data-post-id to get the correct post ID
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
                        // No need to call renderForumPage() here, onSnapshot will handle it.
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
                // No need to call renderForumPage() here, onSnapshot will handle it.
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
        });
    }

    /**
     * Renders the "Meet the Team" page.
     */
    async function renderTeamPage() {
        showLoadingSpinner();
        let teamMembers = [];
        try {
            teamMembers = await fetchTeamMembersFirestore();
        } catch (error) {
            showMessageModal(error.message, 'error');
        } finally {
            hideLoadingSpinner();
        }

        const isAdminOrFounder = currentUser && (userData.role === 'admin' || userData.role === 'founder');

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


    /**
     * Renders the Discord chat widget.
     * It's hidden by default and toggled by a button.
     * IMPORTANT: Replace YOUR_DISCORD_SERVER_ID, YOUR_DISCORD_CHANNEL_ID, and YOUR_DISCORD_INVITE_LINK
     * with your actual Discord values.
     */
    function renderDiscordChatWidget() {
        let discordContainer = document.getElementById('discord-chat-container');
        const discordServerId = "1361468998000054433"; // <<< IMPORTANT: REPLACE WITH YOUR DISCORD SERVER ID
        const discordChannelId = "1361468998658560173"; // <<< IMPORTANT: REPLACE WITH YOUR DISCORD CHANNEL ID
        const discordInviteLink = "https://discord.gg/tu5eHwdTyN"; // <<< IMPORTANT: REPLACE WITH YOUR DISCORD INVITE LINK

        // Only render Discord widget if a user is logged in
        if (!currentUser) {
            if (discordContainer) {
                discordContainer.remove(); // Ensure it's removed if user logs out
            }
            return;
        }

        if (!discordContainer) {
            discordContainer = document.createElement('div');
            discordContainer.id = 'discord-chat-container';
            discordContainer.className = 'fixed bottom-4 right-4 z-50 flex flex-col items-end space-y-2';
            document.body.appendChild(discordContainer);
        }

        discordContainer.innerHTML = `
            <button id="discord-chat-toggle" class="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-300 transform hover:scale-105 flex items-center justify-center space-x-2">
                <i class="fab fa-discord text-xl"></i>
                <span>${isDiscordChatOpen ? 'Close Discord Chat' : 'Open Discord Chat'}</span>
            </button>
            <div id="discord-iframe-wrapper" class="bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden ${isDiscordChatOpen ? '' : 'hidden'}" style="width: 350px; height: 500px;">
                ${isDiscordChatOpen ? `
                    <iframe src="https://discord.com/widget?id=${discordServerId}&channel=${discordChannelId}&theme=dark" width="100%" height="calc(100% - 40px)" allowtransparency="true" frameborder="0" sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"></iframe>
                    <div class="p-2 bg-gray-900 text-white text-center text-sm border-t border-gray-700" style="height: 40px; display: flex; align-items: center; justify-content: center;">
                        Not in our server? <a href="${discordInviteLink}" target="_blank" class="text-blue-400 hover:underline font-semibold ml-1">Join us!</a>
                    </div>
                ` : ''}
            </div>
        `;

        // Add event listener for the toggle button
        document.getElementById('discord-chat-toggle').addEventListener('click', () => {
            isDiscordChatOpen = !isDiscordChatOpen;
            renderDiscordChatWidget(); // Re-render to update visibility and button text
        });
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
     * @param {string} page - The page to navigate to ('home', 'auth', 'profile', 'about', 'admin', 'edit-post', 'forum', 'logout', 'team').
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

        if (page === 'logout') {
            showLoadingSpinner();
            try {
                await signOut(auth);
                currentUser = null;
                userData = null;
                showMessageModal('You have been signed out.');
                page = 'home'; // Redirect to home after logout
            } catch (error) {
                console.error("Error signing out:", error.message);
                showMessageModal("Failed to sign out. Please try again.", 'error');
                hideLoadingSpinner();
                return; // Prevent navigating away if sign out fails
            } finally {
                hideLoadingSpinner();
            }
        }

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
        renderDiscordChatWidget(); // NEW: Render/update Discord widget visibility
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
        showLoadingSpinner();
        if (user) {
            currentUser = user;
            try {
                // Attempt to sign in with custom token if available (Canvas environment)
                if (initialAuthToken && user.uid === 'anonymous_user_id') { // Check if it's an anonymous user that might need token upgrade
                     try {
                        await signInWithCustomToken(auth, initialAuthToken);
                        // After custom token sign-in, the onAuthStateChanged will fire again with the authenticated user
                        // So we can return here and let the next event handle the rest.
                        return;
                    } catch (error) {
                        console.error("Error signing in with custom token on auth state change:", error);
                        // Fallback: If custom token fails, proceed with the existing user (could be anonymous)
                    }
                }

                const fetchedUserData = await fetchCurrentUserFirestoreData();
                if (fetchedUserData) {
                    userData = fetchedUserData;
                } else {
                    // This scenario should be rare if signup works correctly, but handles edge cases
                    // where a user exists in Auth but not Firestore.
                    console.warn("User exists in Auth but not Firestore. Creating default entry.");
                    const userDocRef = doc(db, `/artifacts/${APP_ID}/public/data/users`, user.uid);
                    // Prioritize photoURL from auth provider, fallback to placeholder
                    const defaultProfilePic = user.photoURL || `https://placehold.co/100x100/F0F0F0/000000?text=${(user.displayName || user.email || 'U').charAt(0).toUpperCase()}`;
                    const defaultBackground = 'bg-gradient-to-r from-blue-400 to-purple-600';
                    await setDoc(userDocRef, {
                        email: user.email,
                        username: user.displayName || user.email?.split('@')[0],
                        role: 'member',
                        profilePicUrl: defaultProfilePic,
                        backgroundUrl: defaultBackground
                    });
                    userData = {
                        email: user.email,
                        username: user.displayName || user.email?.split('@')[0],
                        role: 'member',
                        profilePicUrl: defaultProfilePic,
                        backgroundUrl: defaultBackground
                    };
                }
                updateBodyBackground(); // Apply user's saved background
                renderNavbar(); // Update navbar with user info
                renderDiscordChatWidget(); // NEW: Render Discord widget
                // Determine which page to render based on current state or previous navigation
                let pageToRender = contentArea.dataset.currentPage || 'home';
                let currentId = contentArea.dataset.currentId || null;

                if (pageToRender === 'auth' || pageToRender === 'logout') {
                    pageToRender = 'home'; // Always redirect to home if coming from auth/logout
                }
                navigateTo(pageToRender, currentId); // Navigate to the appropriate page

            } catch (error) {
                console.error("Error setting up user data after auth state change:", error);
                // Attempt to sign out if data fetching fails critically
                await signOut(auth);
                currentUser = null;
                userData = null;
                showMessageModal("Failed to load user data. Please try signing in again.", 'error');
                navigateTo('auth');
            }
        } else {
            currentUser = null;
            userData = null;
            updateBodyBackground(); // Reset to default background
            renderNavbar(); // Update navbar to logged out state
            renderDiscordChatWidget(); // NEW: Hide Discord widget when logged out
            // Only redirect if current page is not home or about, or if it was a protected page
            if (contentArea.dataset.currentPage !== 'home' && contentArea.dataset.currentPage !== 'about' && contentArea.dataset.currentPage !== 'team') {
                 navigateTo('home'); // Redirect to home if logged out from a protected page
            }
        }
        hideLoadingSpinner();
    });


    // Initial render call moved inside the DOMContentLoaded listener but outside onAuthStateChanged,
    // to ensure elements are present for the very first render.
    // The onAuthStateChanged listener will then handle subsequent renders based on auth state.
    // It is important that this is called *after* onAuthStateChanged has been set up,
    // to ensure initial user state can be reacted to.
    if (!contentArea.dataset.currentPage) { // Only render if no page has been set yet
        navigateTo('home');
    }


    // Event listeners for static navbar buttons (ensure these are attached AFTER initial DOM render)
    // The home and about buttons in the main navbar are static in index.html, so their event listeners
    // are attached here, but they are *not* added dynamically by renderNavbar
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

    // Attempt to sign in with custom token first, then anonymously if no token or token fails.
    // This is generally handled by onAuthStateChanged but a direct call here ensures
    // the very first auth state is handled.
    if (initialAuthToken) {
        try {
            await signInWithCustomToken(auth, initialAuthToken);
            console.log("Initial sign-in with custom token successful.");
        } catch (error) {
            console.error("Initial sign-in with custom token failed, trying anonymous:", error);
            try {
                await signInAnonymously(auth);
                console.log("Signed in anonymously.");
            } catch (anonError) {
                console.error("Error signing in anonymously:", anonError);
            }
        }
    } else {
        try {
            await signInAnonymously(auth);
            console.log("Signed in anonymously.");
        } catch (anonError) {
            console.error("Error signing in anonymously:", anonError);
        }
    }
});
