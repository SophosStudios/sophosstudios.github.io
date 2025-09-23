// App.js
// This script contains the entire application logic, including Firebase initialization
// and new features like forum, post management, reactions, comments, and enhanced backgrounds.

// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, query, onSnapshot, deleteDoc, orderBy, serverTimestamp, deleteField, addDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

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
    let currentModal = null; // To manage active message modal

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
     * Applies theme classes to the document body based on user data.
     */
    function applyThemeClasses() {
        document.documentElement.classList.remove('light-theme', 'dark-theme'); // Remove existing themes
        if (userData && userData.theme === 'dark') {
            document.documentElement.classList.add('dark-theme');
            // For Tailwind's dark mode, you might also toggle a 'dark' class on the HTML element
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.add('light-theme');
            document.documentElement.classList.remove('dark');
        }
    }

    /**
     * Updates the body's background. Can be a Tailwind class string or a direct image URL.
     * This function also calls applyThemeClasses to ensure theme consistency.
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
            // Apply default based on theme
            if (userData?.theme === 'dark') {
                document.body.classList.add('bg-gray-900', 'text-white'); // Dark default
            } else {
                document.body.classList.add('bg-gradient-to-r', 'from-blue-400', 'to-purple-600'); // Light default
            }
        }
        // Always add core classes for consistent styling
        document.body.classList.add('min-h-screen', 'font-inter');

        applyThemeClasses(); // Apply theme classes after background
    }

    /**
     * Extracts the YouTube video ID from a given YouTube URL.
     * @param {string} url - The YouTube URL.
     * @returns {string|null} The YouTube video ID or null if not found.
     */
    function extractYouTubeVideoId(url) {
        const regExp = /(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})(?:\S+)?/;
        const match = url.match(regExp);
        return (match && match[1].length === 11) ? match[1] : null;
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
                // --- START ADDITION FOR BAN FUNCTIONALITY ---
                if (fetchedUserData.isBanned) {
                    await signOut(auth); // Log out the user from Firebase Auth
                    throw new Error("Your account has been banned. Please contact support for more information.");
                }
                // --- END ADDITION FOR BAN FUNCTIONALITY ---
            } else {
                // Create user document if it doesn't exist (e.g., new Google user)
                const usernameToUse = formData.username || user.displayName || user.email?.split('@')[0] || 'User';
                // Prioritize user.photoURL from auth provider, fallback to placeholder
                const profilePicToUse = user.photoURL || `https://placehold.co/100x100/1e1e1e/F0F0F0?text=${usernameToUse.charAt(0).toUpperCase()}`;

                await setDoc(userDocRef, {
                    email: user.email,
                    username: usernameToUse,
                    role: 'member', // Default role for new users
                    profilePicUrl: profilePicToUse,
                    backgroundUrl: 'bg-gradient-to-r from-blue-400 to-purple-600', // Default background
                    bio: '', // Initialize empty bio for new users
                    partnerInfo: { // Initialize empty partner info
                        description: '',
                        links: {}
                    },
                    theme: 'light' // Default theme for new users
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
            } else if (error.message.includes("Your account has been banned")) { // Catch the custom ban error
                errorMessage = error.message;
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
     * Updates a user's profile data in Firestore.
     * Can be used by the user themselves or by an admin/founder/co-founder for other users.
     * @param {string} userIdToUpdate - The UID of the user whose profile is being updated.
     * @param {object} newUserData - Data to update (username, profilePicUrl, backgroundUrl, bio, partnerInfo, theme).
     * @returns {Promise<object>} - Updated user data.
     */
    async function updateProfileData(userIdToUpdate, newUserData) {
        if (!currentUser) {
            throw new Error("You must be logged in to update profiles.");
        }

        // Check if the current user is authorized to update this specific user's profile.
        // Users can update their own profile. Admins/Founders/Co-founders can update any profile.
        const isAuthorized = (currentUser.uid === userIdToUpdate) ||
                             (userData.role === 'admin' || userData.role === 'founder' || userData.role === 'co-founder');

        if (!isAuthorized) {
            throw new Error("Not authorized to update this profile.");
        }

        showLoadingSpinner();
        try {
            const userDocRef = doc(db, `/artifacts/${APP_ID}/public/data/users`, userIdToUpdate);

            // If updating current user's own profile and username changed, update Firebase Auth display name
            if (currentUser.uid === userIdToUpdate && auth.currentUser && newUserData.username && auth.currentUser.displayName !== newUserData.username) {
                await updateProfile(auth.currentUser, { displayName: newUserData.username });
            }

            // If an admin/founder/co-founder is changing another user's email, update Firebase Auth email
            // Note: This is a sensitive operation and requires re-authentication for the target user.
            // For this client-side implementation, we'll only update the Firestore record for email.
            // A more robust solution would involve Firebase Admin SDK on a backend.
            if (currentUser.uid !== userIdToUpdate && newUserData.email) {
                // For security, Firebase Auth email changes should ideally be done by the user themselves
                // or via a backend with Firebase Admin SDK. Here, we'll just update the Firestore record.
                console.warn("Admin/Founder/Co-founder is attempting to change another user's email. This only updates the Firestore record, not Firebase Auth directly for security reasons.");
            }

            await updateDoc(userDocRef, newUserData);

            // If the current user's own profile was updated, update the global userData
            if (currentUser.uid === userIdToUpdate) {
                const docSnap = await getDoc(userDocRef);
                return docSnap.exists() ? docSnap.data() : null;
            } else {
                // If another user's profile was updated, just return success indication
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
    async function fetchAllUsersFirestore() {
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
     * Updates a user's role by an admin/founder/co-founder in Firestore.
     * @param {string} userId - ID of the user to update.
     * @param {string} newRole - The new role ('member', 'admin', 'founder', 'co-founder', 'partner').
     * @returns {Promise<boolean>} - True on success.
     */
    async function updateUserRoleFirestore(userId, newRole) {
        // Only admins/founders/co-founders can change roles.
        if (!currentUser || (userData.role !== 'admin' && userData.role !== 'founder' && userData.role !== 'co-founder')) {
            throw new Error("Not authorized to change roles.");
        }

        // Prevent admins from setting founder/co-founder role (only founders/co-founders can do this)
        if ((newRole === 'founder' || newRole === 'co-founder') && (userData.role !== 'founder' && userData.role !== 'co-founder')) {
            throw new Error("Only a founder or co-founder can assign the 'founder' or 'co-founder' role.");
        }

        // Prevent self-demotion from founder/admin/co-founder, or self-deletion from any role via the panel.
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
        if (!currentUser || (userData.role !== 'admin' && userData.role !== 'founder' && userData.role !== 'co-founder')) {
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
     * Deletes a user's data from Firestore by an admin/founder/co-founder.
     * Note: This does NOT delete the user from Firebase Authentication.
     * For full deletion, server-side code (e.g., using Firebase Admin SDK) is required.
     * @param {string} userId - ID of the user to delete.
     * @returns {Promise<boolean>} - True on success.
     */
    async function deleteUserFirestore(userId) {
        if (!currentUser || (userData.role !== 'admin' && userData.role !== 'founder' && userData.role !== 'co-founder')) {
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
        if (!currentUser || (userData.role !== 'admin' && userData.role !== 'founder' && userData.role !== 'co-founder')) {
            throw new Error("Only admins, founders, and co-founders can create posts.");
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
        if (!currentUser || (userData.role !== 'admin' && userData.role !== 'founder' && userData.role !== 'co-founder')) {
            throw new Error("Only admins, founders, and co-founders can edit posts.");
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
        if (!currentUser || (userData.role !== 'admin' && userData.role !== 'founder' && userData.role !== 'co-founder')) {
            throw new Error("Only admins, founders, and co-founders can delete posts.");
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
     * @returns {Promise<void>}
     */
    async function sendEmailToUserFirestore(recipientEmail, subject, message, imageUrl = null) {
        if (!currentUser || (userData.role !== 'admin' && userData.role !== 'founder' && userData.role !== 'co-founder')) {
            throw new Error("Not authorized to send emails.");
        }
        showLoadingSpinner();
        try {
            const sentEmailsCollectionRef = collection(db, `/artifacts/${APP_ID}/public/data/sentEmails`);
            await addDoc(sentEmailsCollectionRef, {
                senderId: currentUser.uid,
                senderUsername: userData.username || currentUser.displayName || currentUser.email,
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
    async function fetchPartnerTOSFirestore() {
        showLoadingSpinner();
        try {
            const tosDocRef = doc(db, `/artifacts/${APP_ID}/public/data/settings`, 'partnerTOS');
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
     * Only callable by admins, founders, and co-founders.
     * @param {string} newContent - The new TOS content.
     * @returns {Promise<void>}
     */
    async function updatePartnerTOSFirestore(newContent) {
        if (!currentUser || (userData.role !== 'admin' && userData.role !== 'founder' && userData.role !== 'co-founder')) {
            throw new Error("Not authorized to update Partner TOS.");
        }
        showLoadingSpinner();
        try {
            const tosDocRef = doc(db, `/artifacts/${APP_ID}/public/data/settings`, 'partnerTOS');
            await setDoc(tosDocRef, {
                content: newContent,
                lastUpdated: serverTimestamp(),
                updatedBy: currentUser.uid,
                updatedByUsername: userData.username || currentUser.displayName || currentUser.email
            }, { merge: true }); // Use merge to only update specified fields
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
    async function fetchPartnerApplicationQuestionsFirestore() {
        showLoadingSpinner();
        try {
            const questionsDocRef = doc(db, `/artifacts/${APP_ID}/public/data/settings`, 'partnerApplicationQuestions');
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
     * Only callable by founders and co-founders.
     * @param {Array<object>} questions - An array of question objects to save.
     * @returns {Promise<void>}
     */
    async function updatePartnerApplicationQuestionsFirestore(questions) {
        if (!currentUser || (userData.role !== 'founder' && userData.role !== 'co-founder')) {
            throw new Error("Only founders and co-founders can manage partner application questions.");
        }
        showLoadingSpinner();
        try {
            const questionsDocRef = doc(db, `/artifacts/${APP_ID}/public/data/settings`, 'partnerApplicationQuestions');
            await setDoc(questionsDocRef, {
                questions: questions,
                lastUpdated: serverTimestamp(),
                updatedBy: currentUser.uid,
                updatedByUsername: userData.username || currentUser.displayName || currentUser.email
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
     * @returns {Promise<void>}
     */
    async function submitPartnerApplicationFirestore(applicationData) {
        if (!currentUser) {
            throw new Error("You must be logged in to submit a partner application.");
        }
        showLoadingSpinner();
        try {
            const applicationsCollectionRef = collection(db, `/artifacts/${APP_ID}/public/data/partnerApplications`);
            await addDoc(applicationsCollectionRef, {
                applicantId: currentUser.uid,
                applicantUsername: userData.username || currentUser.displayName || currentUser.email,
                applicantEmail: currentUser.email,
                status: 'pending', // Initial status
                applicationAnswers: applicationData, // Store answers as a map
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
     * @returns {Promise<Array<object>>} - List of partner applications.
     */
    async function fetchAllPartnerApplicationsFirestore() {
        if (!currentUser || (userData.role !== 'admin' && userData.role !== 'founder' && userData.role !== 'co-founder')) {
            throw new Error("Not authorized to view partner applications.");
        }
        showLoadingSpinner();
        try {
            const applicationsCollectionRef = collection(db, `/artifacts/${APP_ID}/public/data/partnerApplications`);
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
     * @returns {Promise<void>}
     */
    async function updatePartnerApplicationStatusFirestore(applicationId, status, reviewNotes, applicantId) {
        if (!currentUser || (userData.role !== 'admin' && userData.role !== 'founder' && userData.role !== 'co-founder')) {
            throw new Error("Not authorized to review partner applications.");
        }
        showLoadingSpinner();
        try {
            const applicationDocRef = doc(db, `/artifacts/${APP_ID}/public/data/partnerApplications`, applicationId);
            await updateDoc(applicationDocRef, {
                status: status,
                reviewNotes: reviewNotes,
                reviewedBy: currentUser.uid,
                reviewTimestamp: serverTimestamp()
            });

            if (status === 'approved') {
                const userDocRef = doc(db, `/artifacts/${APP_ID}/public/data/users`, applicantId);
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
     * @returns {Promise<void>}
     */
    async function addVideoFirestore(name, description, iconUrl, thumbnailUrl, youtubeLink, youtubeVideoId) {
        if (!currentUser) {
            throw new Error("You must be logged in to add videos.");
        }
        showLoadingSpinner();
        try {
            const videosCollectionRef = collection(db, `/artifacts/${APP_ID}/public/data/videos`);
            await addDoc(videosCollectionRef, {
                name: name,
                description: description,
                iconUrl: iconUrl,
                thumbnailUrl: thumbnailUrl,
                youtubeLink: youtubeLink,
                youtubeVideoId: youtubeVideoId,
                authorId: currentUser.uid,
                authorUsername: userData.username || currentUser.displayName || currentUser.email,
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
    async function fetchVideosFirestore() {
        showLoadingSpinner();
        try {
            const videosCollectionRef = collection(db, `/artifacts/${APP_ID}/public/data/videos`);
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
     * @returns {Promise<void>}
     */
    async function updateVideoFirestore(videoId, name, description, iconUrl, thumbnailUrl, youtubeLink, youtubeVideoId) {
        if (!currentUser) {
            throw new Error("You must be logged in to update videos.");
        }
        showLoadingSpinner();
        try {
            const videoDocRef = doc(db, `/artifacts/${APP_ID}/public/data/videos`, videoId);
            await updateDoc(videoDocRef, {
                name: name,
                description: description,
                iconUrl: iconUrl,
                thumbnailUrl: thumbnailUrl,
                youtubeLink: youtubeLink,
                youtubeVideoId: youtubeVideoId,
                // Do not update author or timestamp here
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
     * @returns {Promise<void>}
     */
    async function deleteVideoFirestore(videoId) {
        if (!currentUser) {
            throw new Error("You must be logged in to delete videos.");
        }
        showLoadingSpinner();
        try {
            const videoDocRef = doc(db, `/artifacts/${APP_ID}/public/data/videos`, videoId);
            await deleteDoc(videoDocRef);
            showMessageModal('Video deleted successfully!');
        } catch (error) {
            console.error("Error deleting video:", error.message);
            throw new Error("Failed to delete video: " + error.message);
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
                    { id: 'nav-team', text: 'Meet the Team', page: 'team' },
                    { id: 'nav-videos', text: 'Videos', page: 'videos' } // New Videos link
                ],
                authRequired: true
            },
            {
                name: 'Partnership', // New Category
                items: [
                    { id: 'nav-partners', text: 'Check Out Partners', page: 'partners' },
                    { id: 'nav-partner-tos', text: 'Partner TOS', page: 'partner-tos' },
                    { id: 'nav-apply-partner', text: 'Become a Partner', page: 'apply-partner', roles: ['member'] } // Only members can apply
                ],
                authRequired: true // Partnership features require login
            },
            {
                name: 'Administration',
                items: [
                    { id: 'nav-admin', text: 'Admin Panel', page: 'admin' },
                    { id: 'nav-partner-applications', text: 'Partner Applications', page: 'partner-applications' }, // New admin link
                    { id: 'nav-manage-partner-questions', text: 'Manage Partner Questions', page: 'manage-partner-questions', roles: ['founder', 'co-founder'] } // New founder/co-founder link
                ],
                authRequired: true,
                roles: ['admin', 'founder', 'co-founder']
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
                { id: 'nav-profile', text: 'Profile', page: 'profile', icon: profileIconHtml }, // Simplified Profile
                { id: 'nav-settings', text: 'Settings', page: 'settings' }, // New Settings page
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
            // Filter items within a category based on roles
            const filteredItems = category.items.filter(item => {
                if (item.roles) {
                    return userData && item.roles.includes(userData.role);
                }
                if (category.roles) { // Category-level roles
                    return userData && category.roles.includes(userData.role);
                }
                return true;
            });

            if (filteredItems.length === 0) return; // Skip category if no items are visible

            const dropdownContainer = document.createElement('div');
            dropdownContainer.className = 'relative inline-block text-left'; // Changed from 'group'

            dropdownContainer.innerHTML = `
                <button class="px-4 py-2 rounded-lg hover:bg-gray-700 text-white transition duration-200 flex items-center space-x-2 desktop-dropdown-toggle">
                    <span>${category.name}</span>
                    <i class="fas fa-chevron-down text-xs ml-1 transition-transform transform"></i>
                </button>
                <div class="desktop-dropdown-content absolute hidden bg-gray-700 text-white rounded-lg shadow-lg py-2 w-40 z-10 top-full mt-2 left-0 origin-top overflow-hidden" style="max-height: 0px; transition: max-height 0.3s ease-in-out;">
                    ${filteredItems.map(item => `
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
            const filteredItems = category.items.filter(item => {
                if (item.roles) {
                    return userData && item.roles.includes(userData.role);
                }
                if (category.roles) {
                    return userData && category.roles.includes(userData.role);
                }
                return true;
            });

            if (filteredItems.length === 0) return;

            createMobileDropdown(category.name, filteredItems);
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
                    emoji = '👑'; // Sparkles emoji
                    colorClass = 'text-purple-600'; // Founder color
                    break;
                case 'co-founder': // New co-founder role
                    emoji = '🌟'; // Star emoji
                    colorClass = 'text-yellow-600'; // Co-founder color
                    break;
                case 'partner': // New partner role
                    emoji = '🤝'; // Handshake emoji
                    colorClass = 'text-indigo-600'; // Partner color
                    break;
                default:
                    emoji = '❌';
                    colorClass = 'text-gray-800';
            }
            // Apply a subtle animation for all roles, or only privileged ones
            const animationClass = (role === 'admin' || role === 'founder' || role === 'co-founder' || role === 'partner') ? 'animate-pulse' : '';
            return `<span class="font-semibold ${colorClass} ${animationClass}">${emoji} ${role}</span>`;
        };


        contentArea.innerHTML = `
            <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-2xl text-center backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                <h1 class="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-green-600 mb-6">
                    Welcome to ${CONFIG.websiteTitle}!
                </h1>
                ${currentUser && userData ? `
                    <p class="text-xl text-gray-700 dark:text-gray-300 mb-4">
                        Hello, <span class="font-semibold text-blue-600">${userData.username || currentUser.email}</span>!
                        You are logged in as a ${getRoleVFX(userData.role)}.
                    </p>
                    <p class="text-lg text-gray-600 dark:text-gray-400 mb-6">
                        Explore your profile settings, check out the forum, or visit the admin panel if you have the permissions.
                    </p>
                    <div class="flex flex-col sm:flex-row justify-center gap-4">
                        <button id="go-to-profile-btn" class="py-3 px-6 rounded-full bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                            Go to Profile
                        </button>
                        <button id="go-to-forum-btn" class="py-3 px-6 rounded-full bg-purple-600 text-white font-bold text-lg hover:bg-purple-700 transition duration-300 transform hover:scale-105 shadow-lg">
                            Visit Forum
                        </button>
                        ${userData.role === 'admin' || userData.role === 'founder' || userData.role === 'co-founder' ? `
                        <button id="go-to-admin-btn" class="py-3 px-6 rounded-full bg-red-600 text-white font-bold text-lg hover:bg-red-700 transition duration-300 transform hover:scale-105 shadow-lg">
                            Admin Panel
                        </button>` : ''}
                    </div>
                ` : `
                    <p class="text-lg text-gray-700 dark:text-gray-300 mb-6">
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
            if (userData.role === 'admin' || userData.role === 'founder' || userData.role === 'co-founder') {
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
                <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-md backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                    <h2 id="auth-title" class="text-3xl font-extrabold text-center text-gray-800 dark:text-gray-100 mb-8">Sign In</h2>
                    <form id="auth-form" class="space-y-6">
                        <div>
                            <label for="email" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Email</label>
                            <input type="email" id="email" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="your@example.com" required>
                        </div>
                        <div id="username-field" class="hidden">
                            <label for="username" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Username</label>
                            <input type="text" id="username" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="Choose a username">
                        </div>
                        <div>
                            <label for="password" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Password</label>
                            <input type="password" id="password" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="Minimum 6 characters" required>
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
     * Renders the Profile page (simplified).
     */
    function renderProfilePage() {
        if (!currentUser || !userData) {
            navigateTo('auth'); // Redirect to auth if not logged in
            return;
        }

        contentArea.innerHTML = `
            <div class="flex flex-col items-center justify-center p-4">
                <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-xl backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                    <h2 class="text-3xl font-extrabold text-center text-gray-800 dark:text-gray-100 mb-8">Your Profile</h2>

                    <div class="flex flex-col items-center mb-6">
                        <img id="profile-pic-display" src="${userData.profilePicUrl || `https://placehold.co/100x100/F0F0F0/000000?text=${(userData.username || currentUser.email || 'U').charAt(0).toUpperCase()}`}" alt="Profile" class="w-32 h-32 rounded-full object-cover border-4 border-blue-500 shadow-md">
                    </div>

                    <form id="profile-form" class="space-y-6">
                        <div>
                            <label for="profile-username" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Username</label>
                            <input type="text" id="profile-username" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" value="${userData.username || ''}" required>
                        </div>
                        <div>
                            <label for="profile-email" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Email</label>
                            <input type="email" id="profile-email" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 dark:text-gray-100 cursor-not-allowed" value="${currentUser.email}" disabled>
                        </div>
                        <button type="button" id="reset-password-btn" class="w-full py-3 rounded-full bg-yellow-600 text-white font-bold text-lg hover:bg-yellow-700 transition duration-300 transform hover:scale-105 shadow-lg">
                            Reset Password
                        </button>
                        <button type="submit" id="save-profile-btn" class="w-full py-3 rounded-full bg-green-600 text-white font-bold text-lg hover:bg-green-700 transition duration-300 transform hover:scale-105 shadow-lg">
                            Save Changes
                        </button>
                        <button type="button" id="go-to-settings-btn" class="w-full py-3 rounded-full bg-purple-600 text-white font-bold text-lg hover:bg-purple-700 transition duration-300 transform hover:scale-105 shadow-lg mt-4">
                            Go to Settings
                        </button>
                    </form>
                </div>
            </div>
        `;

        const profileForm = document.getElementById('profile-form');
        const usernameInput = document.getElementById('profile-username');
        const resetPasswordBtn = document.getElementById('reset-password-btn');
        const goToSettingsBtn = document.getElementById('go-to-settings-btn');


        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newUsername = usernameInput.value;

            try {
                const updatedData = await updateProfileData(currentUser.uid, {
                    username: newUsername
                });
                if (updatedData) {
                    userData = updatedData; // Update global userData
                    showMessageModal('Username updated successfully!');
                    renderNavbar(); // Re-render navbar to update name
                }
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
        });

        resetPasswordBtn.addEventListener('click', async () => {
            showMessageModal('Are you sure you want to send a password reset email to your registered email address?', 'confirm', async () => {
                try {
                    await sendPasswordReset(currentUser.email);
                    showMessageModal("Password reset email sent! Check your inbox.");
                } catch (error) {
                    showMessageModal(error.message, 'error');
                }
            });
        });

        goToSettingsBtn.addEventListener('click', () => navigateTo('settings'));
    }

    /**
     * Renders the new Settings page.
     */
    function renderSettingsPage() {
        if (!currentUser || !userData) {
            navigateTo('auth'); // Redirect to auth if not logged in
            return;
        }

        const backgroundOptions = [
            { name: 'Blue-Purple Gradient (Default)', class: 'bg-gradient-to-r from-blue-400 to-purple-600' },
            { name: 'Green-Cyan Gradient', class: 'bg-gradient-to-r from-green-400 to-cyan-600' },
            { name: 'Red-Black Gradient', class: 'bg-gradient-to-r from-red-800 to-black' },
            { name: 'Orange-Red Gradient', class: 'bg-gradient-to-r from-orange-600 to-red-600' },
            { name: 'JuiceWRLD (999 Edition)', url: 'https://4kwallpapers.com/images/wallpapers/juice-wrld-fighting-1920x1080-9496.jpeg' },
        ];

        const isPartnerOrAdmin = userData.role === 'partner' || userData.role === 'admin' || userData.role === 'founder' || userData.role === 'co-founder';
        const partnerLinks = userData.partnerInfo?.links || {};

        contentArea.innerHTML = `
            <div class="flex flex-col items-center justify-center p-4">
                <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-2xl backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                    <h2 class="text-3xl font-extrabold text-center text-gray-800 dark:text-gray-100 mb-8">Account Settings</h2>

                    <form id="settings-form" class="space-y-8">
                        <!-- Profile Picture & Bio Section -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start border-b border-gray-200 dark:border-gray-700 pb-8">
                            <div class="flex flex-col items-center justify-center">
                                <img id="profile-pic-display" src="${userData.profilePicUrl || `https://placehold.co/100x100/F0F0F0/000000?text=${(userData.username || currentUser.email || 'U').charAt(0).toUpperCase()}`}" alt="Profile" class="w-32 h-32 rounded-full object-cover border-4 border-blue-500 shadow-md mb-4">
                                <label for="profile-pic-url" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Profile Picture URL</label>
                                <input type="url" id="profile-pic-url" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="e.g., https://example.com/your-image.jpg" value="${userData.profilePicUrl || ''}">
                                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">Provide a direct image URL.</p>
                            </div>
                            <div>
                                <label for="profile-bio" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Your Bio</label>
                                <textarea id="profile-bio" rows="6" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="Tell us about yourself...">${userData.bio || ''}</textarea>
                            </div>
                        </div>

                        <!-- Theme & Background Section -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start border-b border-gray-200 dark:border-gray-700 pb-8 pt-8">
                            <div>
                                <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Display Options</h3>
                                <div class="flex items-center space-x-3 mb-4">
                                    <label for="dark-mode-toggle" class="text-gray-700 dark:text-gray-300 text-md font-semibold">Dark Mode</label>
                                    <label class="switch">
                                        <input type="checkbox" id="dark-mode-toggle" ${userData.theme === 'dark' ? 'checked' : ''}>
                                        <span class="slider round"></span>
                                    </label>
                                </div>

                                <label for="profile-background-select" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Website Background Theme</label>
                                <select id="profile-background-select" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-gray-50 dark:bg-gray-700 dark:text-gray-100">
                                    ${backgroundOptions.map(option => `
                                        <option value="${option.class}" ${userData.backgroundUrl === option.class ? 'selected' : ''}>
                                            ${option.name}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            <div>
                                <label for="custom-background-url" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Custom Background Image/GIF URL (Overrides Theme)</label>
                                <input type="url" id="custom-background-url" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="e.g., https://example.com/your-animated.gif" value="${(userData.backgroundUrl && (userData.backgroundUrl.startsWith('http') || userData.backgroundUrl.startsWith('https'))) ? userData.backgroundUrl : ''}">
                                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">For GIFs, choose a subtle or abstract one for a formal look. This will override the theme selection above.</p>
                            </div>
                        </div>

                        <!-- Partner Card Information Section -->
                        ${isPartnerOrAdmin ? `
                            <div class="border-b border-gray-200 dark:border-gray-700 pb-8 pt-8">
                                <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Partner Card Information</h3>
                                <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">This information will be displayed on your public partner card.</p>

                                <div class="mb-4">
                                    <label for="partner-description" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Partner Description</label>
                                    <textarea id="partner-description" rows="4" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="A short description for your partner card...">${userData.partnerInfo?.description || ''}</textarea>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <h4 class="col-span-full text-lg font-semibold text-gray-800 dark:text-gray-100 mt-4">Partner Links</h4>
                                    ${['discord', 'roblox', 'fivem', 'codingCommunity', 'minecraft', 'website'].map(platform => `
                                        <div>
                                            <label for="partner-link-${platform}" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2 capitalize">${platform.replace(/([A-Z])/g, ' $1').trim()} Link</label>
                                            <input type="url" id="partner-link-${platform}" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="Enter URL for ${platform} profile/community" value="${partnerLinks[platform] || ''}">
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <button type="submit" id="save-settings-btn" class="w-full py-3 rounded-full bg-green-600 text-white font-bold text-lg hover:bg-green-700 transition duration-300 transform hover:scale-105 shadow-lg mt-6">
                            Save All Settings
                        </button>
                    </form>
                </div>
            </div>
            <style>
                /* Dark Mode Toggle Switch Styling */
                .switch {
                    position: relative;
                    display: inline-block;
                    width: 60px;
                    height: 34px;
                }

                .switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }

                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #ccc;
                    -webkit-transition: .4s;
                    transition: .4s;
                }

                .slider:before {
                    position: absolute;
                    content: "";
                    height: 26px;
                    width: 26px;
                    left: 4px;
                    bottom: 4px;
                    background-color: white;
                    -webkit-transition: .4s;
                    transition: .4s;
                }

                input:checked + .slider {
                    background-color: #2196F3; /* Blue for "on" */
                }

                input:focus + .slider {
                    box-shadow: 0 0 1px #2196F3;
                }

                input:checked + .slider:before {
                    -webkit-transform: translateX(26px);
                    -ms-transform: translateX(26px);
                    transform: translateX(26px);
                }

                /* Rounded sliders */
                .slider.round {
                    border-radius: 34px;
                }

                .slider.round:before {
                    border-radius: 50%;
                }

                /* Dark mode specific styles for the switch */
                .dark-theme .slider {
                    background-color: #555; /* Darker background for switch in dark mode */
                }
                .dark-theme input:checked + .slider {
                    background-color: #667EEA; /* A lighter blue/indigo for dark mode toggle */
                }
            </style>
        `;

        const settingsForm = document.getElementById('settings-form');
        const profilePicUrlInput = document.getElementById('profile-pic-url');
        const backgroundSelect = document.getElementById('profile-background-select');
        const customBackgroundUrlInput = document.getElementById('custom-background-url');
        const profileBioInput = document.getElementById('profile-bio');
        const profilePicDisplay = document.getElementById('profile-pic-display');
        const darkModeToggle = document.getElementById('dark-mode-toggle');

        // Partner specific elements
        const partnerDescriptionInput = document.getElementById('partner-description');
        const partnerLinkInputs = {};
        ['discord', 'roblox', 'fivem', 'codingCommunity', 'minecraft', 'website'].forEach(platform => {
            partnerLinkInputs[platform] = document.getElementById(`partner-link-${platform}`);
        });

        // Update profile picture preview as URL changes
        profilePicUrlInput.addEventListener('input', () => {
          profilePicDisplay.src = profilePicUrlInput.value || `https://placehold.co/100x100/F0F0F0/000000?text=${(userData.username || currentUser.email || 'U').charAt(0).toUpperCase()}`;
        });
        profilePicDisplay.onerror = () => { // Fallback for broken image URLs
            profilePicDisplay.src = `https://placehold.co/100x100/F0F0F0/000000?text=${(userData.username || currentUser.email || 'U').charAt(0).toUpperCase()}`;
        };

        // Dark mode toggle listener
        darkModeToggle.addEventListener('change', async () => {
            const newTheme = darkModeToggle.checked ? 'dark' : 'light';
            try {
                const updatedData = await updateProfileData(currentUser.uid, { theme: newTheme });
                if (updatedData) {
                    userData = updatedData;
                    updateBodyBackground(); // Re-apply theme and background
                    showMessageModal(`Theme changed to ${newTheme} mode!`);
                }
            } catch (error) {
                showMessageModal(error.message, 'error');
                darkModeToggle.checked = (userData.theme === 'dark'); // Revert toggle if save fails
            }
        });


        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newProfilePicUrl = profilePicUrlInput.value || `https://placehold.co/100x100/F0F0F0/000000?text=${(userData.username || currentUser.email || 'U').charAt(0).toUpperCase()}`;
            const newBio = profileBioInput.value;

            let newBackgroundUrl;
            if (customBackgroundUrlInput.value) {
                newBackgroundUrl = customBackgroundUrlInput.value;
            } else {
                newBackgroundUrl = backgroundSelect.value;
            }

            const updatedPartnerInfo = {
                description: partnerDescriptionInput ? partnerDescriptionInput.value : (userData.partnerInfo?.description || ''),
                links: {}
            };

            if (isPartnerOrAdmin) {
                ['discord', 'roblox', 'fivem', 'codingCommunity', 'minecraft', 'website'].forEach(platform => {
                    if (partnerLinkInputs[platform]) {
                        updatedPartnerInfo.links[platform] = partnerLinkInputs[platform].value;
                    }
                });
            } else {
                // If not a partner/admin, preserve existing partnerInfo if it exists
                updatedPartnerInfo.description = userData.partnerInfo?.description || '';
                updatedPartnerInfo.links = userData.partnerInfo?.links || {};
            }

            try {
                const updatedData = await updateProfileData(currentUser.uid, {
                    profilePicUrl: newProfilePicUrl,
                    backgroundUrl: newBackgroundUrl,
                    bio: newBio,
                    partnerInfo: updatedPartnerInfo
                });
                if (updatedData) {
                    userData = updatedData; // Update global userData
                    updateBodyBackground(); // Apply new background immediately
                    showMessageModal('Settings updated successfully!');
                    renderNavbar(); // Re-render navbar to update pic
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
                <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-2xl text-center backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                    <h2 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600 mb-6">About ${CONFIG.websiteTitle}</h2>
                    <p class="text-lg text-gray-700 dark:text-gray-300 mb-4">
                        Welcome to a secure and user-friendly platform designed to streamline your online experience. We offer robust user authentication, allowing you to sign up and sign in with ease, keeping your data safe.
                    </p>
                    <p class="text-lg text-gray-700 dark:text-gray-300 mb-4">
                        Our platform is built with a focus on personalization. You can update your profile information, choose a custom background theme, and manage your personal details within a dedicated settings section.
                    </p>
                    <p class="text-lg text-gray-700 dark:text-gray-300 mb-4">
                        For administrators, we provide a powerful admin panel. This feature allows designated users to oversee all registered accounts, view user details, and manage roles (assigning 'admin' or 'member' status) to ensure smooth operation and access control. Admins can also create and manage forum posts.
                    </p>
                    <p class="text-lg text-gray-700 dark:text-gray-300 mb-4">
                        Members can engage with forum posts by adding reactions and comments, fostering a dynamic community environment.
                    </p>
                    <p class="text-lg text-gray-700 dark:text-gray-300 mb-4">
                        We prioritize responsive design, ensuring that our website looks great and functions perfectly on any device, from desktops to mobile phones. Our clean, modern interface is powered by efficient technologies to provide a seamless browsing experience.
                    </p>
                    <p class="text-lg text-gray-700 dark:text-gray-300">
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
        if (!currentUser || (userData.role !== 'admin' && userData.role !== 'founder' && userData.role !== 'co-founder')) {
            contentArea.innerHTML = `
                <div class="flex flex-col items-center justify-center p-4">
                    <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-xl text-center backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                        <h2 class="text-3xl font-extrabold text-red-600 mb-4">Access Denied</h2>
                        <p class="text-lg text-gray-700 dark:text-gray-300">You do not have administrative privileges to access this page.</p>
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
                <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-4xl backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                    <h2 class="text-3xl font-extrabold text-center text-gray-800 dark:text-gray-100 mb-8">Admin Panel</h2>
                    <p class="text-lg text-gray-700 dark:text-gray-300 text-center mb-6">Manage user roles and accounts, and create forum posts.</p>
                    <div class="mb-6 text-center space-x-4">
                        <button id="view-forum-admin-btn" class="py-2 px-6 rounded-full bg-purple-600 text-white font-bold text-lg hover:bg-purple-700 transition duration-300 transform hover:scale-105 shadow-lg">
                            Manage Posts (Forum)
                        </button>
                        <button id="view-partner-applications-btn" class="py-2 px-6 rounded-full bg-indigo-600 text-white font-bold text-lg hover:bg-indigo-700 transition duration-300 transform hover:scale-105 shadow-lg">
                            View Partner Applications
                        </button>
                        ${userData.role === 'founder' || userData.role === 'co-founder' ? `
                            <button id="manage-partner-questions-btn" class="py-2 px-6 rounded-full bg-teal-600 text-white font-bold text-lg hover:bg-teal-700 transition duration-300 transform hover:scale-105 shadow-lg">
                                Manage Partner Questions
                            </button>
                        ` : ''}
                    </div>

                    <h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 text-center">Manage Users</h3>
                    ${usersList.length === 0 ? `
                        <p class="text-center text-gray-600 dark:text-gray-400">No users found.</p>
                    ` : `
                        <div class="overflow-x-auto rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead class="bg-gray-100 dark:bg-gray-700">
                                    <tr>
                                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Icon
                                        </th>
                                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Username
                                        </th>
                                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Email
                                        </th>
                                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Role
                                        </th>
                                        <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700" id="users-table-body">
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
                // Only founders/co-founders can assign the 'founder' or 'co-founder' role
                const canAssignFounderOrCoFounder = userData.role === 'founder' || userData.role === 'co-founder';
                const showFounderOption = canAssignFounderOrCoFounder || user.role === 'founder'; // Show founder option if current user is founder/co-founder or if target user is already a founder
                const showCoFounderOption = canAssignFounderOrCoFounder || user.role === 'co-founder'; // Show co-founder option if current user is founder/co-founder or if target user is already a co-founder


                return `
                    <tr data-user-id="${user.id}" class="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td class="px-6 py-4 whitespace-nowrap">
                            <img src="${profileIconSrc}" alt="User Icon" class="w-10 h-10 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600" onerror="this.onerror=null; this.src='https://placehold.co/100x100/F0F0F0/000000?text=${(user.username || user.email || 'U').charAt(0).toUpperCase()}'">
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                            ${user.username}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            ${user.email}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                            <select
                                class="block w-full py-2 px-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                ${isDisabled}
                                data-role-select-id="${user.id}"
                            >
                                <option value="member" ${user.role === 'member' ? 'selected' : ''}>Member</option>
                                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                <option value="partner" ${user.role === 'partner' ? 'selected' : ''}>Partner</option>
                                ${showCoFounderOption ? `<option value="co-founder" ${user.role === 'co-founder' ? 'selected' : ''}>Co-Founder</option>` : ''}
                                ${showFounderOption ? `<option value="founder" ${user.role === 'founder' ? 'selected' : ''}>Founder</option>` : ''}
                            </select>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                                class="inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-indigo-500"
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
        document.getElementById('view-forum-admin-btn').addEventListener('click', () => navigateTo('forum')); // Admins/Founders/Co-founders can manage from forum view
        document.getElementById('view-partner-applications-btn').addEventListener('click', () => navigateTo('partner-applications'));
        if (userData.role === 'founder' || userData.role === 'co-founder') {
            document.getElementById('manage-partner-questions-btn').addEventListener('click', () => navigateTo('manage-partner-questions'));
        }
    }

    /**
     * Shows a modal for taking action on a user (Ban/Unban/Delete/Send Email/Edit Partner Card/Edit User Info).
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
        const isPartner = user.role === 'partner';
        const isAdminOrFounderOrCoFounder = userData.role === 'admin' || userData.role === 'founder' || userData.role === 'co-founder';

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
        currentModal = modal;

        document.getElementById('close-take-action-modal').addEventListener('click', () => {
            currentModal.remove();
            currentModal = null;
        });

        const banBtn = document.getElementById('ban-user-btn');
        const unbanBtn = document.getElementById('unban-user-btn');
        const sendEmailBtn = document.getElementById('send-email-btn');
        const editUserInfoAdminBtn = document.getElementById('edit-user-info-admin-btn'); // New button
        const editPartnerCardAdminBtn = document.getElementById('edit-partner-card-admin-btn');
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

        // Event listener for "Send Email" button
        if (sendEmailBtn) {
            sendEmailBtn.addEventListener('click', () => {
                currentModal.remove(); // Close the current modal
                currentModal = null;
                navigateTo('send-email', user.id); // Navigate to the send email page, passing the user ID
            });
        }

        // Event listener for "Edit User Info" button (for admins/founders/co-founders)
        if (editUserInfoAdminBtn) {
            editUserInfoAdminBtn.addEventListener('click', () => {
                currentModal.remove(); // Close the current modal
                currentModal = null;
                showEditUserInfoModal(user); // Open the user info edit modal for this user
            });
        }

        // Event listener for "Edit Partner Card" button (for admins/founders/co-founders)
        if (editPartnerCardAdminBtn) {
            editPartnerCardAdminBtn.addEventListener('click', () => {
                currentModal.remove(); // Close the current modal
                currentModal = null;
                showEditPartnerCardModal(user); // Open the partner card edit modal for this user
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
     * Shows a modal for admins/founders/co-founders to edit a user's basic info.
     * @param {object} userToEdit - The user object whose info is being edited.
     */
    function showEditUserInfoModal(userToEdit) {
        if (currentModal) {
            currentModal.remove();
        }

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
        currentModal = modal;

        document.getElementById('close-edit-user-info-modal').addEventListener('click', () => {
            currentModal.remove();
            currentModal = null;
            renderAdminPanelPage(); // Re-render admin panel
        });
        document.getElementById('cancel-edit-user-info-modal').addEventListener('click', () => {
            currentModal.remove();
            currentModal = null;
            renderAdminPanelPage(); // Re-render admin panel
        });

        document.getElementById('edit-user-info-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const newUsername = document.getElementById('edit-user-username').value.trim();
            const newEmail = document.getElementById('edit-user-email').value.trim();
            const newProfilePicUrl = document.getElementById('edit-user-profile-pic-url').value.trim();
            const newBackgroundUrl = document.getElementById('edit-user-background-url').value.trim();

            try {
                // Call updateProfileData with the userToEdit.id
                await updateProfileData(userToEdit.id, {
                    username: newUsername,
                    email: newEmail, // Note: This updates Firestore, not Firebase Auth email directly
                    profilePicUrl: newProfilePicUrl,
                    backgroundUrl: newBackgroundUrl
                });
                showMessageModal('User info updated successfully!');
                currentModal.remove();
                currentModal = null;
                renderAdminPanelPage(); // Re-render admin panel to show changes
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
        });
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
        if (!currentUser || (userData.role !== 'admin' && userData.role !== 'founder' && userData.role !== 'co-founder')) {
            contentArea.innerHTML = `
                <div class="flex flex-col items-center justify-center p-4">
                    <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-xl text-center backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                        <h2 class="text-3xl font-extrabold text-red-600 mb-4">Access Denied</h2>
                        <p class="text-lg text-gray-700 dark:text-gray-300">You do not have administrative privileges to edit posts.</p>
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
                <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-2xl backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                    <h2 class="text-3xl font-extrabold text-center text-gray-800 dark:text-gray-100 mb-8">Edit Post</h2>
                    <form id="edit-post-form" class="space-y-6">
                        <div>
                            <label for="post-title" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Post Title</label>
                            <input type="text" id="post-title" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" value="${postData.title}" required>
                        </div>
                        <div>
                            <label for="post-content" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Post Content</label>
                            <textarea id="post-content" rows="10" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" required>${postData.content}</textarea>
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
                    <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-xl text-center backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                        <h2 class="text-3xl font-extrabold text-red-600 mb-4">Access Denied</h2>
                        <p class="text-lg text-gray-700 dark:text-gray-300">Please sign in to view the forum posts.</p>
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
                <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-3xl backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                    <h2 class="text-3xl font-extrabold text-center text-gray-800 dark:text-gray-100 mb-8">Forum & Announcements</h2>
                    ${userData.role === 'admin' || userData.role === 'founder' || userData.role === 'co-founder' ? `
                        <div class="mb-6 text-center">
                            <button id="create-post-btn" class="py-2 px-6 rounded-full bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                                Create New Post
                            </button>
                        </div>
                    ` : ''}

                    ${posts.length === 0 ? `
                        <p class="text-center text-gray-600 dark:text-gray-400">No posts yet. Check back later!</p>
                    ` : `
                        <div id="posts-list" class="space-y-6">
                            ${posts.map(post => `
                                <div class="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
                                    <h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">${post.title}</h3>
                                    <p class="text-gray-700 dark:text-gray-200 whitespace-pre-wrap">${post.content}</p>
                                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-4">
                                        Posted by <span class="font-semibold">${post.authorUsername}</span> on ${post.timestamp}
                                    </p>

                                    <div class="flex items-center space-x-4 mt-4 border-t pt-4 border-gray-300 dark:border-gray-600">
                                        <!-- Reactions Section -->
                                        <div class="flex items-center space-x-2">
                                            ${['😀', '❤️', '😂', '🔥'].map(emoji => `
                                                <button class="text-xl p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition duration-200 text-gray-800 dark:text-gray-100" data-post-id="${post.id}" data-emoji="${emoji}">
                                                    ${emoji} <span class="text-sm text-gray-600 dark:text-gray-300">${post.reactions[emoji] || 0}</span>
                                                </button>
                                            `).join('')}
                                        </div>

                                        <!-- Admin Actions (Edit/Delete) -->
                                        ${userData.role === 'admin' || userData.role === 'founder' || userData.role === 'co-founder' ? `
                                            <div class="ml-auto space-x-2">
                                                <button class="text-blue-600 hover:text-blue-800 font-semibold" data-post-id="${post.id}" data-action="edit">Edit</button>
                                                <button class="text-red-600 hover:text-red-800 font-semibold" data-post-id="${post.id}" data-action="delete">Delete</button>
                                            </div>
                                        ` : ''}
                                    </div>

                                    <!-- Comments Section -->
                                    <div class="mt-6 border-t pt-4 border-gray-300 dark:border-gray-600">
                                        <h4 class="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">Comments (${post.comments.length})</h4>
                                        <div class="space-y-3 mb-4">
                                            ${post.comments.length === 0 ? `
                                                <p class="text-sm text-gray-500 dark:text-gray-400">No comments yet. Be the first to comment!</p>
                                            ` : `
                                                ${post.comments.map(comment => `
                                                    <div class="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                                                        <p class="text-sm text-gray-700 dark:text-gray-200">${comment.text}</p>
                                                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">by <span class="font-medium">${comment.authorUsername}</span> on ${comment.timestamp ? new Date(comment.timestamp).toLocaleString() : 'N/A'}</p>
                                                    </div>
                                                `).join('')}
                                            `}
                                        </div>
                                        <form class="comment-form" data-post-id="${post.id}">
                                            <textarea class="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-100" rows="2" placeholder="Add a comment..." required></textarea>
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
        showLoadingSpinner();
        let allUsers = [];
        try {
            // Fetch all users to determine who are admins/founders
            allUsers = await fetchAllUsersFirestore();
        } catch (error) {
            showMessageModal(error.message, 'error');
            allUsers = []; // Clear list if fetch fails
        } finally {
            hideLoadingSpinner();
        }

        // Filter users to only include admins, founders, co-founders, and partners
        const teamMembers = allUsers.filter(user => user.role === 'admin' || user.role === 'founder' || user.role === 'co-founder' || user.role === 'partner');

        contentArea.innerHTML = `
            <div class="flex flex-col items-center justify-center p-4 min-h-[calc(100vh-64px)]">
                <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-3xl backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                    <h2 class="text-3xl font-extrabold text-center text-gray-800 dark:text-gray-100 mb-8">Meet the Team</h2>

                    ${teamMembers.length === 0 ? `
                        <p class="text-center text-gray-600 dark:text-gray-400">No team members listed yet.</p>
                    ` : `
                        <div class="space-y-6">
                            ${teamMembers.map(member => {
                                const profilePicSrc = member.profilePicUrl || `https://placehold.co/100x100/F0F0F0/000000?text=${(member.username || member.email || 'U').charAt(0).toUpperCase()}`;
                                const isCurrentUser = currentUser && member.id === currentUser.uid;

                                // Link icons and their corresponding Font Awesome classes
                                const linkIcons = {
                                    discord: 'fab fa-discord',
                                    roblox: 'fab fa-roblox',
                                    fivem: 'fas fa-gamepad', // Generic gamepad for FiveM
                                    codingCommunity: 'fas fa-code', // Generic code for coding community
                                    minecraft: 'fas fa-cube', // Generic cube for Minecraft
                                    website: 'fas fa-globe'
                                };

                                return `
                                    <div class="flex flex-col sm:flex-row items-center sm:items-start p-6 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
                                        <img src="${profilePicSrc}" alt="${member.username}'s Profile" class="w-24 h-24 rounded-full object-cover border-4 border-blue-500 shadow-md mb-4 sm:mb-0 sm:mr-6"
                                             onerror="this.onerror=null; this.src='https://placehold.co/100x100/F0F0F0/000000?text=${(member.username || member.email || 'U').charAt(0).toUpperCase()}'">
                                        <div class="flex-grow text-center sm:text-left">
                                            <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100">${member.username}</h3>
                                            <p class="text-md text-gray-600 dark:text-gray-300 mb-2">${member.role.charAt(0).toUpperCase() + member.role.slice(1)}</p>
                                            <p class="text-gray-700 dark:text-gray-200 text-sm whitespace-pre-wrap">${member.bio || 'No bio provided yet.'}</p>

                                            ${member.role === 'partner' || member.role === 'admin' || member.role === 'founder' || member.role === 'co-founder' ? `
                                                <div class="mt-4 flex flex-wrap justify-center sm:justify-start gap-3">
                                                    ${Object.entries(member.partnerInfo?.links || {}).map(([platform, link]) => link ? `
                                                        <a href="${link}" target="_blank" rel="noopener noreferrer" class="text-gray-700 dark:text-gray-200 hover:text-blue-600 transition duration-200 flex items-center space-x-2">
                                                            <i class="${linkIcons[platform]} text-lg"></i>
                                                            <span class="text-sm capitalize">${platform.replace(/([A-Z])/g, ' $1').trim()}</span>
                                                        </a>
                                                    ` : '').join('')}
                                                </div>
                                            ` : ''}

                                            ${isCurrentUser ? `
                                                <button class="mt-4 py-2 px-4 rounded-full bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg"
                                                        id="edit-my-card-btn">
                                                    Edit My Card
                                                </button>
                                            ` : ''}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;

        // Add event listener for "Edit My Card" button if present
        const editMyCardBtn = document.getElementById('edit-my-card-btn');
        if (editMyCardBtn) {
            editMyCardBtn.addEventListener('click', () => {
                navigateTo('settings'); // Redirect to settings page to edit partner info
            });
        }
    }

    /**
     * Renders the "Partners" page, displaying all partner cards.
     */
    async function renderPartnersPage() {
        if (!currentUser) {
            contentArea.innerHTML = `
                <div class="flex flex-col items-center justify-center p-4">
                    <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-xl text-center backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                        <h2 class="text-3xl font-extrabold text-red-600 mb-4">Access Denied</h2>
                        <p class="text-lg text-gray-700 dark:text-gray-300">Please sign in to view our partners.</p>
                    </div>
                </div>
            `;
            return;
        }

        showLoadingSpinner();
        let allUsers = [];
        try {
            allUsers = await fetchAllUsersFirestore();
        } catch (error) {
            showMessageModal(error.message, 'error');
            allUsers = [];
        } finally {
            hideLoadingSpinner();
        }

        const partners = allUsers.filter(user => user.role === 'partner');
        const isAdminOrFounderOrCoFounder = userData.role === 'admin' || userData.role === 'founder' || userData.role === 'co-founder';

        contentArea.innerHTML = `
            <div class="flex flex-col items-center justify-center p-4 min-h-[calc(100vh-64px)]">
                <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-3xl backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                    <h2 class="text-3xl font-extrabold text-center text-gray-800 dark:text-gray-100 mb-8">Our Valued Partners</h2>

                    ${partners.length === 0 ? `
                        <p class="text-center text-gray-600 dark:text-gray-400">No partners listed yet. Check back soon!</p>
                    ` : `
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            ${partners.map(partner => {
                                const profilePicSrc = partner.profilePicUrl || `https://placehold.co/100x100/F0F0F0/000000?text=${(partner.username || partner.email || 'U').charAt(0).toUpperCase()}`;
                                const isCurrentUserPartner = currentUser && partner.id === currentUser.uid && partner.role === 'partner';

                                const linkIcons = {
                                    discord: 'fab fa-discord',
                                    roblox: 'fab fa-roblox',
                                    fivem: 'fas fa-gamepad',
                                    codingCommunity: 'fas fa-code',
                                    minecraft: 'fas fa-cube',
                                    website: 'fas fa-globe',
                                };

                                return `
                                    <div class="bg-gray-100 dark:bg-gray-700 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-600 flex flex-col items-center text-center">
                                        <img src="${profilePicSrc}" alt="${partner.username}'s Profile" class="w-28 h-28 rounded-full object-cover border-4 border-indigo-500 shadow-lg mb-4"
                                             onerror="this.onerror=null; this.src='https://placehold.co/100x100/F0F0F0/000000?text=${(partner.username || partner.email || 'U').charAt(0).toUpperCase()}'">
                                        <h3 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">${partner.username}</h3>
                                        <p class="text-md text-indigo-600 font-semibold mb-3">Official Partner</p>
                                        <p class="text-gray-700 dark:text-gray-200 text-sm mb-4 whitespace-pre-wrap">${partner.partnerInfo?.description || 'No description provided yet.'}</p>

                                        <div class="flex flex-wrap justify-center gap-3 mb-4">
                                            ${Object.entries(partner.partnerInfo?.links || {}).map(([platform, link]) => link ? `
                                                <a href="${link}" target="_blank" rel="noopener noreferrer" class="text-gray-700 dark:text-gray-200 hover:text-blue-600 transition duration-200 flex items-center space-x-2">
                                                    <i class="${linkIcons[platform]} text-lg"></i>
                                                    <span class="text-sm capitalize">${platform.replace(/([A-Z])/g, ' $1').trim()}</span>
                                                </a>
                                            ` : '').join('')}
                                        </div>

                                        ${(isCurrentUserPartner || isAdminOrFounderOrCoFounder) ? `
                                            <button class="mt-auto py-2 px-5 rounded-full bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition duration-300 transform hover:scale-105 shadow-lg"
                                                    data-partner-id="${partner.id}" data-action="edit-partner-card">
                                                Edit Card
                                            </button>
                                        ` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;

        // Add event listeners for "Edit Card" buttons
        contentArea.querySelectorAll('[data-action="edit-partner-card"]').forEach(button => {
            button.addEventListener('click', (e) => {
                const partnerId = e.target.dataset.partnerId;
                const partnerToEdit = allUsers.find(user => user.id === partnerId);
                if (partnerToEdit) {
                    showEditPartnerCardModal(partnerToEdit);
                }
            });
        });
    }

    /**
     * Shows a modal for editing a partner's card information (description and links).
     * This modal is used by partners to edit their own, and by admins/founders/co-founders to edit others.
     * @param {object} partnerUser - The user object (who has the 'partner' role) to edit.
     */
    function showEditPartnerCardModal(partnerUser) {
        if (currentModal) {
            currentModal.remove();
        }

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
        currentModal = modal;

        document.getElementById('close-edit-partner-card-modal').addEventListener('click', () => {
            currentModal.remove();
            currentModal = null;
            // If opened from admin panel, re-render admin panel, else re-render partners page
            if (contentArea.dataset.currentPage === 'admin') {
                renderAdminPanelPage();
            } else {
                renderPartnersPage();
            }
        });
        document.getElementById('cancel-edit-partner-card-modal').addEventListener('click', () => {
            currentModal.remove();
            currentModal = null;
            if (contentArea.dataset.currentPage === 'admin') {
                renderAdminPanelPage();
            } else {
                renderPartnersPage();
            }
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
                const userDocRef = doc(db, `/artifacts/${APP_ID}/public/data/users`, partnerUser.id);
                await updateDoc(userDocRef, {
                    partnerInfo: {
                        description: newDescription,
                        links: newLinks
                    }
                });
                showMessageModal('Partner card updated successfully!');
                currentModal.remove();
                currentModal = null;
                // Re-render the page it was opened from
                if (contentArea.dataset.currentPage === 'admin') {
                    renderAdminPanelPage();
                } else {
                    renderPartnersPage();
                }
            } catch (error) {
                showMessageModal("Failed to update partner card: " + error.message, 'error');
            } finally {
                hideLoadingSpinner();
            }
        });
    }


    /**
     * Renders the Send Email page for admins/founders/co-founders.
     * @param {string} [recipientUserId=null] - The ID of the user to pre-fill the recipient email.
     */
    async function renderSendEmailPage(recipientUserId = null) {
        if (!currentUser || (userData.role !== 'admin' && userData.role !== 'founder' && userData.role !== 'co-founder')) {
            contentArea.innerHTML = `
                <div class="flex flex-col items-center justify-center p-4">
                    <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-xl text-center backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                        <h2 class="text-3xl font-extrabold text-red-600 mb-4">Access Denied</h2>
                        <p class="text-lg text-gray-700 dark:text-gray-300">You do not have administrative privileges to send emails.</p>
                    </div>
                </div>
            `;
            return;
        }

        let recipientEmail = '';
        let recipientUsername = 'Recipient';

        if (recipientUserId) {
            showLoadingSpinner();
            try {
                const userDocRef = doc(db, `/artifacts/${APP_ID}/public/data/users`, recipientUserId);
                const docSnap = await getDoc(userDocRef);
                if (docSnap.exists()) {
                    const recipientData = docSnap.data();
                    recipientEmail = recipientData.email || '';
                    recipientUsername = recipientData.username || recipientData.email || 'Recipient';
                }
            } catch (error) {
                console.error("Error fetching recipient user data:", error.message);
                showMessageModal("Could not pre-fill recipient email.", 'error');
            } finally {
                hideLoadingSpinner();
            }
        }

        contentArea.innerHTML = `
            <div class="flex flex-col items-center justify-center p-4 min-h-[calc(100vh-64px)]">
                <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-2xl backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                    <h2 class="text-3xl font-extrabold text-center text-gray-800 dark:text-gray-100 mb-8">Send Email to User</h2>
                    <form id="send-email-form" class="space-y-6">
                        <div>
                            <label for="recipient-email" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Recipient Email</label>
                            <input type="email" id="recipient-email" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" value="${recipientEmail}" placeholder="Enter recipient email" required>
                        </div>
                        <div>
                            <label for="email-subject" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Subject</label>
                            <input type="text" id="email-subject" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="Enter email subject" required>
                        </div>
                        <div>
                            <label for="email-message" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Message</label>
                            <textarea id="email-message" rows="8" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="Write your email message here..." required></textarea>
                        </div>
                        <div>
                            <label for="image-attachment-url" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Attach Image (URL)</label>
                            <input type="url" id="image-attachment-url" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="Optional: Enter direct image URL (e.g., https://example.com/image.jpg)">
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Only direct image URLs are supported for attachments.</p>
                        </div>
                        <div class="flex justify-end space-x-4 mt-6">
                            <button type="button" id="cancel-send-email-btn" class="py-2 px-5 rounded-full bg-gray-500 text-white font-bold hover:bg-gray-600 transition duration-300 transform hover:scale-105 shadow-lg">
                                Cancel
                            </button>
                            <button type="submit" class="py-2 px-5 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                                Send Email
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        const sendEmailForm = document.getElementById('send-email-form');
        const recipientEmailInput = document.getElementById('recipient-email');
        const emailSubjectInput = document.getElementById('email-subject');
        const emailMessageInput = document.getElementById('email-message');
        const imageAttachmentUrlInput = document.getElementById('image-attachment-url');

        document.getElementById('cancel-send-email-btn').addEventListener('click', () => {
            navigateTo('admin'); // Go back to admin panel
        });

        sendEmailForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const recipient = recipientEmailInput.value;
            const subject = emailSubjectInput.value;
            const message = emailMessageInput.value;
            const imageUrl = imageAttachmentUrlInput.value || null;

            try {
                await sendEmailToUserFirestore(recipient, subject, message, imageUrl);
                navigateTo('admin'); // Go back to admin panel after "sending"
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
        });
    }

    /**
     * Renders the Partner TOS page.
     */
    async function renderPartnerTOSPage() {
        if (!currentUser) {
            contentArea.innerHTML = `
                <div class="flex flex-col items-center justify-center p-4">
                    <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-xl text-center backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                        <h2 class="text-3xl font-extrabold text-red-600 mb-4">Access Denied</h2>
                        <p class="text-lg text-gray-700 dark:text-gray-300">Please sign in to view the Partner Terms of Service.</p>
                    </div>
                </div>
            `;
            return;
        }

        let tosContent = '';
        try {
            tosContent = await fetchPartnerTOSFirestore();
        } catch (error) {
            showMessageModal(error.message, 'error');
            tosContent = "Error loading terms of service.";
        }

        const isAdminOrFounderOrCoFounder = userData.role === 'admin' || userData.role === 'founder' || userData.role === 'co-founder';

        contentArea.innerHTML = `
            <div class="flex flex-col items-center justify-center p-4 min-h-[calc(100vh-64px)]">
                <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-3xl backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                    <h2 class="text-3xl font-extrabold text-center text-gray-800 dark:text-gray-100 mb-8">Partner Terms of Service</h2>
                    <div id="tos-content" class="prose max-w-none text-gray-700 dark:text-gray-200 leading-relaxed mb-6 p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                        <p class="whitespace-pre-wrap">${tosContent}</p>
                    </div>
                    ${isAdminOrFounderOrCoFounder ? `
                        <div class="text-center">
                            <button id="edit-tos-btn" class="py-2 px-6 rounded-full bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                                Edit Rules
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        if (isAdminOrFounderOrCoFounder) {
            document.getElementById('edit-tos-btn').addEventListener('click', () => {
                showEditPartnerTOSModal(tosContent);
            });
        }
    }

    /**
     * Shows a modal for editing the Partner TOS content.
     * @param {string} currentContent - The current TOS content.
     */
    function showEditPartnerTOSModal(currentContent) {
        if (currentModal) {
            currentModal.remove();
        }

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
        currentModal = modal;

        document.getElementById('close-edit-tos-modal').addEventListener('click', () => {
            currentModal.remove();
            currentModal = null;
            renderPartnerTOSPage(); // Re-render to show updated content
        });
        document.getElementById('cancel-edit-tos-modal').addEventListener('click', () => {
            currentModal.remove();
            currentModal = null;
            renderPartnerTOSPage(); // Re-render to show updated content
        });

        document.getElementById('edit-tos-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const newContent = document.getElementById('modal-tos-content').value;
            try {
                await updatePartnerTOSFirestore(newContent);
                currentModal.remove();
                currentModal = null;
                renderPartnerTOSPage(); // Re-render to show updated content
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
        });
    }

    /**
     * Renders the page for members to submit a partner application.
     */
    async function renderApplyPartnerPage() {
        if (!currentUser) {
            contentArea.innerHTML = `
                <div class="flex flex-col items-center justify-center p-4">
                    <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-xl text-center backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                        <h2 class="text-3xl font-extrabold text-red-600 mb-4">Access Denied</h2>
                        <p class="text-lg text-gray-700 dark:text-gray-300">Please sign in to apply for partnership.</p>
                    </div>
                </div>
            `;
            return;
        }

        // Prevent partners, admins, founders, co-founders from applying
        if (userData.role === 'partner' || userData.role === 'admin' || userData.role === 'founder' || userData.role === 'co-founder') {
            contentArea.innerHTML = `
                <div class="flex flex-col items-center justify-center p-4">
                    <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-xl text-center backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                        <h2 class="text-3xl font-extrabold text-gray-800 dark:text-gray-100 mb-4">Partnership Status</h2>
                        <p class="text-lg text-gray-700 dark:text-gray-300">You are already a ${userData.role}. You cannot submit a new partner application.</p>
                        <button id="go-to-partners-btn" class="mt-6 py-2 px-6 rounded-full bg-indigo-600 text-white font-bold text-lg hover:bg-indigo-700 transition duration-300 transform hover:scale-105 shadow-lg">
                            View Partners Page
                        </button>
                    </div>
                </div>
            `;
            document.getElementById('go-to-partners-btn').addEventListener('click', () => navigateTo('partners'));
            return;
        }

        let questions = [];
        try {
            questions = await fetchPartnerApplicationQuestionsFirestore();
        } catch (error) {
            showMessageModal(error.message, 'error');
            questions = []; // Fallback to empty if error
        }

        const formFieldsHtml = questions.map(q => {
            const requiredAttr = q.required ? 'required' : '';
            const asterisk = q.required ? '<span class="text-red-500">*</span>' : '';
            let inputElement;

            switch (q.type) {
                case 'textarea':
                    inputElement = `<textarea id="app-q-${q.id}" rows="5" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="${q.label}" ${requiredAttr}></textarea>`;
                    break;
                case 'date':
                    inputElement = `<input type="date" id="app-q-${q.id}" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" ${requiredAttr}>`;
                    break;
                case 'email':
                    inputElement = `<input type="email" id="app-q-${q.id}" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="${q.label}" ${requiredAttr}>`;
                    break;
                case 'text':
                default:
                    inputElement = `<input type="text" id="app-q-${q.id}" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="${q.label}" ${requiredAttr}>`;
                    break;
            }

            return `
                <div>
                    <label for="app-q-${q.id}" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">${q.label} ${asterisk}</label>
                    ${inputElement}
                </div>
            `;
        }).join('');


        contentArea.innerHTML = `
            <div class="flex flex-col items-center justify-center p-4 min-h-[calc(100vh-64px)]">
                <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-2xl backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                    <h2 class="text-3xl font-extrabold text-center text-gray-800 dark:text-gray-100 mb-8">Apply for Partnership</h2>
                    <p class="text-lg text-gray-700 dark:text-gray-300 text-center mb-6">Fill out the form below to submit your application to become an official partner.</p>
                    <form id="partner-application-form" class="space-y-6">
                        ${formFieldsHtml}
                        <div class="flex justify-end space-x-4 mt-6">
                            <button type="button" id="cancel-application-btn" class="py-2 px-5 rounded-full bg-gray-500 text-white font-bold hover:bg-gray-600 transition duration-300 transform hover:scale-105 shadow-lg">
                                Cancel
                            </button>
                            <button type="submit" class="py-2 px-5 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                                Submit Application
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('cancel-application-btn').addEventListener('click', () => navigateTo('home'));

        document.getElementById('partner-application-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const applicationAnswers = {};
            let allRequiredFilled = true;

            questions.forEach(q => {
                const inputElement = document.getElementById(`app-q-${q.id}`);
                if (inputElement) {
                    applicationAnswers[q.id] = inputElement.value;
                    if (q.required && !inputElement.value.trim()) {
                        allRequiredFilled = false;
                    }
                }
            });

            if (!allRequiredFilled) {
                showMessageModal("Please fill in all required fields.", 'error');
                return;
            }

            try {
                await submitPartnerApplicationFirestore(applicationAnswers);
                navigateTo('partners'); // Redirect to partners page after submission
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
        });
    }

    /**
     * Renders the admin page to view and manage partner applications.
     */
    async function renderPartnerApplicationsAdminPage() {
        if (!currentUser || (userData.role !== 'admin' && userData.role !== 'founder' && userData.role !== 'co-founder')) {
            contentArea.innerHTML = `
                <div class="flex flex-col items-center justify-center p-4">
                    <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-xl text-center backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                        <h2 class="text-3xl font-extrabold text-red-600 mb-4">Access Denied</h2>
                        <p class="text-lg text-gray-700 dark:text-gray-300">You do not have administrative privileges to view partner applications.</p>
                    </div>
                </div>
            `;
            return;
        }

        let applications = [];
        try {
            applications = await fetchAllPartnerApplicationsFirestore();
        } catch (error) {
            showMessageModal(error.message, 'error');
            applications = [];
        }

        contentArea.innerHTML = `
            <div class="flex flex-col items-center justify-center p-4 min-h-[calc(100vh-64px)]">
                <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-4xl backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                    <h2 class="text-3xl font-extrabold text-center text-gray-800 dark:text-gray-100 mb-8">Partner Applications</h2>

                    ${applications.length === 0 ? `
                        <p class="text-center text-gray-600 dark:text-gray-400">No partner applications found.</p>
                    ` : `
                        <div class="space-y-6">
                            ${applications.map(app => `
                                <div class="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
                                    <h3 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Applicant: ${app.applicantUsername} (${app.applicantEmail})</h3>
                                    <p class="text-md text-gray-600 dark:text-gray-300">Status: <span class="font-semibold capitalize ${app.status === 'pending' ? 'text-yellow-600' : (app.status === 'approved' ? 'text-green-600' : 'text-red-600')}">${app.status}</span></p>
                                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">Submitted on: ${app.timestamp ? (typeof app.timestamp === 'string' ? new Date(app.timestamp).toLocaleString() : app.timestamp.toDate().toLocaleString()) : 'N/A'}</p>

                                    <div class="mt-4 text-right">
                                        <button class="py-2 px-4 rounded-full bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg"
                                                data-application-id="${app.id}" data-action="view-details">
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;

        contentArea.querySelectorAll('[data-action="view-details"]').forEach(button => {
            button.addEventListener('click', (e) => {
                const applicationId = e.target.dataset.applicationId;
                const applicationToView = applications.find(app => app.id === applicationId);
                if (applicationToView) {
                    showReviewApplicationModal(applicationToView);
                }
            });
        });
    }

    /**
     * Shows a modal for reviewing a partner application.
     * @param {object} application - The application object to review.
     */
    async function showReviewApplicationModal(application) {
        if (currentModal) {
            currentModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'review-application-modal';
        modal.className = 'fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-50 p-4';

        let questions = [];
        try {
            questions = await fetchPartnerApplicationQuestionsFirestore();
        } catch (error) {
            console.error("Error fetching questions for review modal:", error.message);
            questions = []; // Fallback to empty
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
        currentModal = modal;

        document.getElementById('close-review-application-modal').addEventListener('click', () => {
            currentModal.remove();
            currentModal = null;
            renderPartnerApplicationsAdminPage(); // Re-render the applications list
        });

        if (application.status === 'pending') {
            const reviewNotesInput = document.getElementById('review-notes');
            document.getElementById('approve-application-btn').addEventListener('click', async () => {
                const notes = reviewNotesInput.value;
                showMessageModal(`Are you sure you want to APPROVE this application and make ${application.applicantUsername} a partner?`, 'confirm', async () => {
                    try {
                        await updatePartnerApplicationStatusFirestore(application.id, 'approved', notes, application.applicantId);
                        currentModal.remove();
                        currentModal = null;
                        renderPartnerApplicationsAdminPage();
                    } catch (error) {
                        showMessageModal(error.message, 'error');
                    }
                });
            });

            document.getElementById('reject-application-btn').addEventListener('click', async () => {
                const notes = reviewNotesInput.value;
                showMessageModal(`Are you sure you want to REJECT this application?`, 'confirm', async () => {
                    try {
                        await updatePartnerApplicationStatusFirestore(application.id, 'rejected', notes, application.applicantId);
                        currentModal.remove();
                        currentModal = null;
                        renderPartnerApplicationsAdminPage();
                    } catch (error) {
                        showMessageModal(error.message, 'error');
                    }
                });
            });
        }
    }

    /**
     * Renders the page for founders and co-founders to manage partner application questions.
     */
    async function renderManagePartnerQuestionsPage() {
        if (!currentUser || (userData.role !== 'founder' && userData.role !== 'co-founder')) {
            contentArea.innerHTML = `
                <div class="flex flex-col items-center justify-center p-4">
                    <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-xl text-center backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                        <h2 class="text-3xl font-extrabold text-red-600 mb-4">Access Denied</h2>
                        <p class="text-lg text-gray-700 dark:text-gray-300">You do not have founder or co-founder privileges to manage partner questions.</p>
                    </div>
                </div>
            `;
            return;
        }

        let currentQuestions = [];
        try {
            currentQuestions = await fetchPartnerApplicationQuestionsFirestore();
        } catch (error) {
            showMessageModal(error.message, 'error');
            currentQuestions = [];
        }

        contentArea.innerHTML = `
            <div class="flex flex-col items-center justify-center p-4 min-h-[calc(100vh-64px)]">
                <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-3xl backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                    <h2 class="text-3xl font-extrabold text-center text-gray-800 dark:text-gray-100 mb-8">Manage Partner Application Questions</h2>
                    <p class="text-lg text-gray-700 dark:text-gray-300 text-center mb-6">Add, edit, or remove questions for the partner application form.</p>

                    <div id="questions-list" class="space-y-4 mb-8">
                        ${currentQuestions.length === 0 ? `
                            <p class="text-center text-gray-600 dark:text-gray-400">No questions defined yet. Add your first question below!</p>
                        ` : `
                            ${currentQuestions.map((q, index) => `
                                <div class="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg shadow-sm flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 md:space-x-4">
                                    <div class="flex-grow text-gray-800 dark:text-gray-100 text-left w-full md:w-auto">
                                        <p class="font-semibold">Question ${index + 1}: ${q.label} <span class="text-sm text-gray-500 dark:text-gray-400">(${q.type}, ${q.required ? 'Required' : 'Optional'})</span></p>
                                    </div>
                                    <div class="flex space-x-2 w-full md:w-auto justify-end">
                                        <button type="button" class="py-1 px-3 rounded-md bg-blue-500 text-white text-sm hover:bg-blue-600 transition duration-200" data-action="edit-question" data-index="${index}">Edit</button>
                                        <button type="button" class="py-1 px-3 rounded-md bg-red-500 text-white text-sm hover:bg-red-600 transition duration-200" data-action="delete-question" data-index="${index}">Delete</button>
                                    </div>
                                </div>
                            `).join('')}
                        `}
                    </div>

                    <h3 class="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4 text-center">Add New Question</h3>
                    <form id="add-question-form" class="space-y-4">
                        <div>
                            <label for="new-question-label" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Question Label</label>
                            <input type="text" id="new-question-label" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" placeholder="e.g., Your Full Name" required>
                        </div>
                        <div>
                            <label for="new-question-type" class="block text-gray-700 dark:text-gray-300 text-sm font-semibold mb-2">Question Type</label>
                            <select id="new-question-type" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-gray-100" required>
                                <option value="text">Text Input</option>
                                <option value="textarea">Long Text Area</option>
                                <option value="email">Email Input</option>
                                <option value="date">Date Input</option>
                                <option value="number">Number Input</option>
                            </select>
                        </div>
                        <div class="flex items-center space-x-2">
                            <input type="checkbox" id="new-question-required" class="form-checkbox h-5 w-5 text-blue-600 rounded">
                            <label for="new-question-required" class="text-gray-700 dark:text-gray-300 text-sm font-semibold">Required Question</label>
                        </div>
                        <div class="flex justify-end space-x-4 mt-6">
                            <button type="submit" class="py-2 px-5 rounded-full bg-green-600 text-white font-bold hover:bg-green-700 transition duration-300 transform hover:scale-105 shadow-lg">
                                Add Question
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        const questionsListDiv = document.getElementById('questions-list');
        const addQuestionForm = document.getElementById('add-question-form');
        const newQuestionLabelInput = document.getElementById('new-question-label');
        const newQuestionTypeSelect = document.getElementById('new-question-type');
        const newQuestionRequiredCheckbox = document.getElementById('new-question-required');

        // Function to re-render the questions list part
        const refreshQuestionsList = () => {
            questionsListDiv.innerHTML = currentQuestions.length === 0 ? `
                <p class="text-center text-gray-600 dark:text-gray-400">No questions defined yet. Add your first question below!</p>
            ` : `
                ${currentQuestions.map((q, index) => `
                    <div class="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg shadow-sm flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 md:space-x-4">
                        <div class="flex-grow text-gray-800 dark:text-gray-100 text-left w-full md:w-auto">
                            <p class="font-semibold">Question ${index + 1}: ${q.label} <span class="text-sm text-gray-500 dark:text-gray-400">(${q.type}, ${q.required ? 'Required' : 'Optional'})</span></p>
                        </div>
                        <div class="flex space-x-2 w-full md:w-auto justify-end">
                            <button type="button" class="py-1 px-3 rounded-md bg-blue-500 text-white text-sm hover:bg-blue-600 transition duration-200" data-action="edit-question" data-index="${index}">Edit</button>
                            <button type="button" class="py-1 px-3 rounded-md bg-red-500 text-white text-sm hover:bg-red-600 transition duration-200" data-action="delete-question" data-index="${index}">Delete</button>
                        </div>
                    </div>
                `).join('')}
            `;
            // Re-attach event listeners after re-rendering
            attachQuestionListEventListeners();
        };

        const attachQuestionListEventListeners = () => {
            questionsListDiv.querySelectorAll('[data-action="edit-question"]').forEach(button => {
                button.addEventListener('click', (e) => {
                    const index = parseInt(e.target.dataset.index);
                    showEditQuestionModal(index, currentQuestions[index]);
                });
            });

            questionsListDiv.querySelectorAll('[data-action="delete-question"]').forEach(button => {
                button.addEventListener('click', (e) => {
                    const index = parseInt(e.target.dataset.index);
                    showMessageModal(`Are you sure you want to delete question "${currentQuestions[index].label}"?`, 'confirm', async () => {
                        currentQuestions.splice(index, 1);
                        try {
                            await updatePartnerApplicationQuestionsFirestore(currentQuestions);
                            refreshQuestionsList();
                        } catch (error) {
                            showMessageModal(error.message, 'error');
                            // Re-fetch to revert if save fails
                            currentQuestions = await fetchPartnerApplicationQuestionsFirestore();
                            refreshQuestionsList();
                        }
                    });
                });
            });
        };

        addQuestionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const label = newQuestionLabelInput.value.trim();
            const type = newQuestionTypeSelect.value;
            const required = newQuestionRequiredCheckbox.checked;

            if (!label) {
                showMessageModal("Question label cannot be empty.", 'error');
                return;
            }

            const newQuestion = {
                id: `q_${Date.now()}`, // Simple unique ID
                label: label,
                type: type,
                required: required
            };

            currentQuestions.push(newQuestion);
            try {
                await updatePartnerApplicationQuestionsFirestore(currentQuestions);
                newQuestionLabelInput.value = '';
                newQuestionTypeSelect.value = 'text';
                newQuestionRequiredCheckbox.checked = false;
                refreshQuestionsList();
            } catch (error) {
                showMessageModal(error.message, 'error');
                // Re-fetch to revert if save fails
                currentQuestions = await fetchPartnerApplicationQuestionsFirestore();
                refreshQuestionsList();
            }
        });

        // Initial attachment of listeners
        attachQuestionListEventListeners();
    }

    /**
     * Shows a modal for editing an existing partner application question.
     * @param {number} index - The index of the question in the currentQuestions array.
     * @param {object} question - The question object to edit.
     */
    function showEditQuestionModal(index, question) {
        if (currentModal) {
            currentModal.remove();
        }

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
                            <option value="number" ${question.type === 'number' ? 'selected' : ''}>Number Input</option>
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
        currentModal = modal;

        document.getElementById('close-edit-question-modal').addEventListener('click', () => {
            currentModal.remove();
            currentModal = null;
            renderManagePartnerQuestionsPage(); // Re-render the questions list
        });
        document.getElementById('cancel-edit-question-modal').addEventListener('click', () => {
            currentModal.remove();
            currentModal = null;
            renderManagePartnerQuestionsPage(); // Re-render the questions list
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

            let currentQuestions = await fetchPartnerApplicationQuestionsFirestore(); // Re-fetch to ensure latest
            currentQuestions[index] = {
                id: question.id, // Keep original ID
                label: newLabel,
                type: newType,
                required: newRequired
            };

            try {
                await updatePartnerApplicationQuestionsFirestore(currentQuestions);
                currentModal.remove();
                currentModal = null;
                renderManagePartnerQuestionsPage(); // Re-render to show updated list
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
        });
    }

    /**
     * Renders the Videos page, displaying all videos.
     */
    async function renderVideosPage() {
        if (!currentUser) {
            contentArea.innerHTML = `
                <div class="flex flex-col items-center justify-center p-4">
                    <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-xl text-center backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                        <h2 class="text-3xl font-extrabold text-red-600 mb-4">Access Denied</h2>
                        <p class="text-lg text-gray-700 dark:text-gray-300">Please sign in to view and manage videos.</p>
                    </div>
                </div>
            `;
            return;
        }

        let videos = [];
        try {
            videos = await fetchVideosFirestore();
        } catch (error) {
            showMessageModal(error.message, 'error');
            videos = [];
        }

        contentArea.innerHTML = `
            <div class="flex flex-col items-center justify-center p-4 min-h-[calc(100vh-64px)]">
                <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-4xl backdrop-blur-sm bg-opacity-80 dark:bg-opacity-80 border border-gray-200 dark:border-gray-700">
                    <h2 class="text-3xl font-extrabold text-center text-gray-800 dark:text-gray-100 mb-8">Manage Videos</h2>
                    <div class="mb-6 text-center">
                        <button id="add-video-btn" class="py-2 px-6 rounded-full bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                            Add New Video
                        </button>
                    </div>

                    ${videos.length === 0 ? `
                        <p class="text-center text-gray-600 dark:text-gray-400">No videos added yet. Add your first video!</p>
                    ` : `
                        <div id="videos-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            ${videos.map(video => `
                                <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-600 flex flex-col">
                                    <div class="relative w-full aspect-video mb-4 rounded-md overflow-hidden">
                                        ${video.youtubeVideoId ? `
                                            <iframe
                                                class="absolute inset-0 w-full h-full"
                                                src="https://www.youtube.com/embed/${video.youtubeVideoId}"
                                                frameborder="0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowfullscreen
                                            ></iframe>
                                        ` : `
                                            <img src="${video.thumbnailUrl || 'https://placehold.co/480x270/FF0000/FFFFFF?text=No+Thumbnail'}"
                                                 alt="Video Thumbnail" class="w-full h-full object-cover"
                                                 onerror="this.onerror=null; this.src='https://placehold.co/480x270/FF0000/FFFFFF?text=No+Thumbnail';">
                                        `}
                                    </div>
                                    <div class="flex items-center mb-2">
                                        ${video.iconUrl ? `<img src="${video.iconUrl}" alt="Icon" class="w-8 h-8 rounded-full object-cover mr-2" onerror="this.onerror=null; this.src='https://placehold.co/32x32/000000/FFFFFF?text=Icon';">` : `<div class="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs text-gray-700 dark:text-gray-200 mr-2">?</div>`}
                                        <h3 class="text-lg font-bold text-gray-800 dark:text-gray-100 flex-grow">${video.name}</h3>
                                    </div>
                                    <p class="text-sm text-gray-700 dark:text-gray-200 mb-2">${video.description}</p>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">Added by ${video.authorUsername} on ${video.timestamp}</p>
                                    <div class="mt-4 flex justify-end space-x-2">
                                        <button class="py-1 px-3 rounded-md bg-yellow-500 text-white text-sm hover:bg-yellow-600 transition duration-200" data-video-id="${video.id}" data-action="edit-video">Edit</button>
                                        <button class="py-1 px-3 rounded-md bg-red-500 text-white text-sm hover:bg-red-600 transition duration-200" data-video-id="${video.id}" data-action="delete-video">Delete</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;

        document.getElementById('add-video-btn').addEventListener('click', () => {
            showAddEditVideoModal(); // Open modal for adding a new video
        });

        contentArea.querySelectorAll('[data-action="edit-video"]').forEach(button => {
            button.addEventListener('click', (e) => {
                const videoId = e.target.dataset.videoId;
                const videoToEdit = videos.find(v => v.id === videoId);
                if (videoToEdit) {
                    showAddEditVideoModal(videoToEdit); // Open modal for editing existing video
                }
            });
        });

        contentArea.querySelectorAll('[data-action="delete-video"]').forEach(button => {
            button.addEventListener('click', (e) => {
                const videoId = e.target.dataset.videoId;
                showMessageModal('Are you sure you want to delete this video?', 'confirm', async () => {
                    try {
                        await deleteVideoFirestore(videoId);
                        renderVideosPage(); // Re-render to show updated list
                    } catch (error) {
                        showMessageModal(error.message, 'error');
                    }
                });
            });
        });
    }

    /**
     * Shows a modal for adding or editing a video.
     * @param {object} [videoToEdit=null] - The video object to edit, or null for adding a new video.
     */
    function showAddEditVideoModal(videoToEdit = null) {
        if (currentModal) {
            currentModal.remove();
        }

        const isEditing = videoToEdit !== null;
        const modalTitle = isEditing ? 'Edit Video' : 'Add New Video';
        const submitButtonText = isEditing ? 'Save Changes' : 'Add Video';

        const modal = document.createElement('div');
        modal.id = 'add-edit-video-modal';
        modal.className = 'fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-50 p-4';

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
        currentModal = modal;

        document.getElementById('close-add-edit-video-modal').addEventListener('click', () => {
            currentModal.remove();
            currentModal = null;
        });
        document.getElementById('cancel-add-edit-video-modal').addEventListener('click', () => {
            currentModal.remove();
            currentModal = null;
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
                    await updateVideoFirestore(videoToEdit.id, name, description, iconUrl, thumbnailUrl, youtubeLink, youtubeVideoId);
                } else {
                    await addVideoFirestore(name, description, iconUrl, thumbnailUrl, youtubeLink, youtubeVideoId);
                }
                currentModal.remove();
                currentModal = null;
                renderVideosPage(); // Re-render videos page to show updates
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
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
     * @param {string} page - The page to navigate to ('home', 'auth', 'profile', 'settings', 'about', 'admin', 'edit-post', 'forum', 'logout', 'team', 'send-email', 'partners', 'partner-tos', 'apply-partner', 'partner-applications', 'manage-partner-questions', 'videos').
     * @param {string} [id=null] - Optional: postId for edit-post route, userId for send-email route, or any other ID.
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
            case 'settings': // New settings page
                renderSettingsPage();
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
            case 'send-email': // New Send Email page
                renderSendEmailPage(id); // Pass the user ID to pre-fill recipient
                break;
            case 'partners': // New Partners page
                renderPartnersPage();
                break;
            case 'partner-tos': // New Partner TOS page
                renderPartnerTOSPage();
                break;
            case 'apply-partner': // New Apply for Partner page
                renderApplyPartnerPage();
                break;
            case 'partner-applications': // New Admin: View Partner Applications page
                renderPartnerApplicationsAdminPage();
                break;
            case 'manage-partner-questions': // New Founder/Co-founder: Manage Partner Questions page
                renderManagePartnerQuestionsPage();
                break;
            case 'videos': // New Videos page
                renderVideosPage();
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
        showLoadingSpinner();
        if (user) {
            currentUser = user;
            try {
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
                        backgroundUrl: defaultBackground,
                        bio: '',
                        partnerInfo: { // Initialize empty partner info for new users
                            description: '',
                            links: {}
                        },
                        theme: 'light' // Default theme for new users
                    });
                    userData = {
                        email: user.email,
                        username: user.displayName || user.email?.split('@')[0],
                        role: 'member',
                        profilePicUrl: defaultProfilePic,
                        backgroundUrl: defaultBackground,
                        bio: '',
                        partnerInfo: {
                            description: '',
                            links: {}
                        },
                        theme: 'light'
                    };
                }
                updateBodyBackground(); // Apply user's saved background and theme
                renderNavbar(); // Update navbar with user info
                // Determine which page to render based on current state or previous navigation
                let pageToRender = contentArea.dataset.currentPage || 'home';
                let currentId = contentArea.dataset.currentId || null;

                // Check if the user is banned before allowing them to proceed
                if (userData.isBanned) {
                    await signOut(auth); // Ensure they are signed out from Firebase Auth
                    currentUser = null;
                    userData = null;
                    showMessageModal("Your account has been banned. Please contact support for more information.", 'error');
                    navigateTo('auth'); // Redirect to auth page or a specific banned page
                    hideLoadingSpinner();
                    return; // Stop further rendering
                }


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
            // Ensure theme is reset if no user is logged in
            document.documentElement.classList.remove('dark'); // Remove dark class from html
            document.documentElement.classList.add('light-theme'); // Ensure light theme is active
            updateBodyBackground(); // Reset to default background (light theme default)
            renderNavbar(); // Update navbar to logged out state
            // Only redirect if current page is not home or about, or if it was a protected page
            if (contentArea.dataset.currentPage !== 'home' && contentArea.dataset.currentPage !== 'about' && contentArea.dataset.currentPage !== 'team' && contentArea.dataset.currentPage !== 'partners' && contentArea.dataset.currentPage !== 'partner-tos' && contentArea.dataset.currentPage !== 'videos') {
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
});

