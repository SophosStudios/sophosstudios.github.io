// App.js
// This script contains the entire application logic, including Firebase initialization
// and new features like forum, post management, reactions, comments, and enhanced backgrounds.

// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, collection, query, onSnapshot, deleteDoc, orderBy, serverTimestamp, deleteField } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js"; // Added deleteField

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
    const navLinks = document.getElementById('nav-links');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileMenuIconOpen = document.getElementById('mobile-menu-icon-open');
    const mobileMenuIconClose = document.getElementById('mobile-menu-icon-close');
    const navHomeButton = document.getElementById('nav-home');
    const navAboutButton = document.getElementById('nav-about');

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
        if (!currentUser || userData.role !== 'admin') {
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
     * Updates a user's role by an admin in Firestore.
     * @param {string} userId - ID of the user to update.
     * @param {string} newRole - The new role ('member' or 'admin').
     * @returns {Promise<boolean>} - True on success.
     */
    async function updateUserRoleFirestore(userId, newRole) {
        if (!currentUser || userData.role !== 'admin') {
            throw new Error("Not authorized to change roles.");
        }
        if (userId === currentUser.uid) {
            throw new Error("You cannot change your own role from the admin panel.");
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
     * Deletes a user's data from Firestore by an admin.
     * Note: This does NOT delete the user from Firebase Authentication.
     * For full deletion, server-side code (e.g., using Firebase Admin SDK) is required.
     * @param {string} userId - ID of the user to delete.
     * @returns {Promise<boolean>} - True on success.
     */
    async function deleteUserFirestore(userId) {
        if (!currentUser || userData.role !== 'admin') {
            throw new Error("Not authorized to delete users.");
        }
        if (userId === currentUser.uid) {
            throw new Error("You cannot delete your own account from the admin panel.");
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
     * Only callable by admins.
     * @param {string} title - The title of the post.
     * @param {string} content - The content of the post.
     * @returns {Promise<void>}
     */
    async function createPostFirestore(title, content) {
        if (!currentUser || userData.role !== 'admin') {
            throw new Error("Only admins can create posts.");
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
     * Only callable by admins.
     * @param {string} postId - The ID of the post to update.
     * @param {string} title - The new title.
     * @param {string} content - The new content.
     * @returns {Promise<void>}
     */
    async function updatePostFirestore(postId, title, content) {
        if (!currentUser || userData.role !== 'admin') {
            throw new Error("Only admins can edit posts.");
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
     * Only callable by admins.
     * @param {string} postId - The ID of the post to delete.
     * @returns {Promise<void>}
     */
    async function deletePostFirestore(postId) {
        if (!currentUser || userData.role !== 'admin') {
            throw new Error("Only admins can delete posts.");
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
                timestamp: serverTimestamp()
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
                    // Format timestamp for display
                    timestamp: data.timestamp ? data.timestamp.toDate().toLocaleString() : 'N/A',
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


    // --- UI Rendering Functions ---

    /**
     * Renders the Navbar links based on authentication status.
     */
    function renderNavbar() {
        navLinks.innerHTML = '';
        mobileMenu.innerHTML = '';

        // Update website title from config.js
        document.querySelector('title').textContent = CONFIG.websiteTitle;
        document.getElementById('nav-home').textContent = CONFIG.websiteTitle; // Update home button text

        const createButton = (id, text, page, iconHtml = '') => {
            const btn = document.createElement('button');
            btn.id = id;
            btn.className = `px-4 py-2 rounded-lg hover:bg-gray-700 text-white transition duration-200 ${id.includes('admin') ? 'bg-red-600 hover:bg-red-700 shadow-md' : (id.includes('auth') ? 'bg-green-600 hover:bg-green-700 shadow-md' : (id.includes('sign-out') ? 'bg-blue-600 hover:bg-blue-700 shadow-md' : ''))}`;
            btn.innerHTML = `${iconHtml}<span>${text}</span>`;
            btn.addEventListener('click', () => {
                navigateTo(page);
                // Hide mobile menu if open
                if (!mobileMenu.classList.contains('hidden')) {
                    mobileMenu.classList.add('hidden');
                    mobileMenuIconOpen.classList.remove('hidden');
                    mobileMenuIconClose.classList.add('hidden');
                }
            });
            return btn;
        };

        const createMobileButton = (id, text, page) => {
            const btn = document.createElement('button');
            btn.id = id;
            btn.className = `block w-full text-left px-4 py-2 hover:bg-gray-700 text-white transition duration-200 ${id.includes('admin') ? 'bg-red-600 hover:bg-red-700' : (id.includes('auth') ? 'bg-green-600 hover:bg-green-700' : (id.includes('sign-out') ? 'bg-blue-600 hover:bg-blue-700' : ''))}`;
            btn.textContent = text;
            btn.addEventListener('click', () => {
                navigateTo(page);
                // Hide mobile menu if open
                if (!mobileMenu.classList.contains('hidden')) {
                    mobileMenu.classList.add('hidden');
                    mobileMenuIconOpen.classList.remove('hidden');
                    mobileMenuIconClose.classList.add('hidden');
                }
            });
            return btn;
        };

        if (currentUser && userData) {
            // Logged in user
            navLinks.appendChild(createButton('nav-forum', 'Forum', 'forum')); // Forum for all authenticated users
            mobileMenu.appendChild(createMobileButton('mobile-nav-forum', 'Forum', 'forum'));

            if (userData.role === 'admin') {
                navLinks.appendChild(createButton('nav-admin', 'Admin Panel', 'admin'));
                mobileMenu.appendChild(createMobileButton('mobile-nav-admin', 'Admin Panel', 'admin'));
            }

            const profileIconSrc = userData.profilePicUrl || `https://placehold.co/100x100/F0F0F0/000000?text=${(userData.username || currentUser.email || 'U').charAt(0).toUpperCase()}`;
            const profileIconHtml = `
                <img src="${profileIconSrc}" alt="Profile" class="w-8 h-8 rounded-full object-cover border-2 border-gray-400"
                     onerror="this.onerror=null; this.src='https://placehold.co/100x100/F0F0F0/000000?text=${(userData.username || currentUser.email || 'U').charAt(0).toUpperCase()}'">`;

            const profileBtn = document.createElement('button');
            profileBtn.id = 'nav-profile';
            profileBtn.className = 'px-4 py-2 rounded-lg hover:bg-gray-700 text-white transition duration-200 flex items-center space-x-2';
            profileBtn.innerHTML = `${profileIconHtml}<span>${userData.username || currentUser.email}</span>`;
            profileBtn.addEventListener('click', () => navigateTo('profile'));
            navLinks.appendChild(profileBtn);

            navLinks.appendChild(createButton('nav-sign-out', 'Sign Out', 'logout'));
            mobileMenu.appendChild(createMobileButton('mobile-nav-profile', 'Profile', 'profile'));
            mobileMenu.appendChild(createMobileButton('mobile-nav-sign-out', 'Sign Out', 'logout'));
        } else {
            // Not logged in
            navLinks.appendChild(createButton('nav-auth', 'Sign In / Up', 'auth'));
            mobileMenu.appendChild(createMobileButton('mobile-nav-auth', 'Sign In / Up', 'auth'));
        }
        mobileMenu.appendChild(createMobileButton('mobile-nav-about', 'About', 'about')); // About always in mobile
    }

    /**
     * Renders the Home page content.
     */
    function renderHomePage() {
        contentArea.innerHTML = `
            <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl text-center backdrop-blur-sm bg-opacity-80 border border-gray-200">
                <h1 class="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-green-600 mb-6">
                    Welcome to ${CONFIG.websiteTitle}!
                </h1>
                ${currentUser && userData ? `
                    <p class="text-xl text-gray-700 mb-4">
                        Hello, <span class="font-semibold text-blue-600">${userData.username || currentUser.email}</span>!
                        You are logged in as a <span class="font-semibold text-purple-600">${userData.role}</span>.
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
                        ${userData.role === 'admin' ? `
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
            if (userData.role === 'admin') {
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
        if (!currentUser || !userData || userData.role !== 'admin') {
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
                        <button id="create-post-btn" class="py-2 px-6 rounded-full bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                            Create New Post
                        </button>
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
            usersTableBody.querySelectorAll('[data-role-select-id]').forEach(selectElement => {
                selectElement.addEventListener('change', async (e) => {
                    const userId = e.target.dataset.roleSelectId;
                    const newRole = e.target.value;
                    showMessageModal(`Are you sure you want to change this user's role to "${newRole}"?`, 'confirm', async () => {
                        try {
                            await updateUserRoleFirestore(userId, newRole);
                            showMessageModal(`User role updated to "${newRole}" successfully!`);
                            renderAdminPanelPage(); // Re-render admin panel to reflect changes
                        }
                        catch (error) {
                            showMessageModal(error.message, 'error');
                            renderAdminPanelPage(); // Re-render to revert dropdown if failed
                        }
                    });
                });
            });

            usersTableBody.querySelectorAll('[data-delete-user-id]').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const userId = e.target.dataset.deleteUserId;
                    const username = e.target.dataset.username;
                    showMessageModal(`Are you sure you want to delete user "${username}"? This action cannot be undone and will only remove their data from Firestore.`, 'confirm', async () => {
                        try {
                            await deleteUserFirestore(userId);
                            showMessageModal(`User "${username}" data deleted successfully!`);
                            renderAdminPanelPage(); // Re-render admin panel to reflect changes
                        } catch (error) {
                            showMessageModal(error.message, 'error');
                        }
                    });
                });
            });
        }
        document.getElementById('create-post-btn').addEventListener('click', () => navigateTo('create-post'));
        document.getElementById('view-forum-admin-btn').addEventListener('click', () => navigateTo('forum')); // Admins can manage from forum view
    }

    /**
     * Renders the Create Post page for admins.
     */
    function renderCreatePostPage() {
        if (!currentUser || userData.role !== 'admin') {
            contentArea.innerHTML = `
                <div class="flex flex-col items-center justify-center p-4">
                    <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-xl text-center backdrop-blur-sm bg-opacity-80 border border-gray-200">
                        <h2 class="text-3xl font-extrabold text-red-600 mb-4">Access Denied</h2>
                        <p class="text-lg text-gray-700">You do not have administrative privileges to create posts.</p>
                    </div>
                </div>
            `;
            return;
        }

        contentArea.innerHTML = `
            <div class="flex flex-col items-center justify-center p-4">
                <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl backdrop-blur-sm bg-opacity-80 border border-gray-200">
                    <h2 class="text-3xl font-extrabold text-center text-gray-800 mb-8">Create New Post</h2>
                    <form id="create-post-form" class="space-y-6">
                        <div>
                            <label for="post-title" class="block text-gray-700 text-sm font-semibold mb-2">Post Title</label>
                            <input type="text" id="post-title" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter post title" required>
                        </div>
                        <div>
                            <label for="post-content" class="block text-gray-700 text-sm font-semibold mb-2">Post Content</label>
                            <textarea id="post-content" rows="10" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Write your post content here..." required></textarea>
                        </div>
                        <button type="submit" class="w-full py-3 rounded-full bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                            Publish Post
                        </button>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('create-post-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('post-title').value;
            const content = document.getElementById('post-content').value;

            try {
                await createPostFirestore(title, content);
                navigateTo('forum'); // Redirect to forum after posting
            } catch (error) {
                showMessageModal(error.message, 'error');
            }
        });
    }

    /**
     * Renders the Edit Post page for admins.
     * @param {string} postId - The ID of the post to edit.
     */
    async function renderEditPostPage(postId) {
        if (!currentUser || userData.role !== 'admin') {
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
                                        ${userData.role === 'admin' ? `
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
                                                        <p class="text-xs text-gray-500 mt-1">by <span class="font-medium">${comment.authorUsername}</span> on ${comment.timestamp ? new Date(comment.timestamp._seconds * 1000).toLocaleString() : 'N/A'}</p>
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

    // --- Navigation and Initialization ---

    /**
     * Navigates to a specific page and renders its content.
     * @param {string} page - The page to navigate to ('home', 'auth', 'profile', 'about', 'admin', 'create-post', 'edit-post', 'forum', 'logout').
     * @param {string} [postId=null] - Optional: postId for edit-post route.
     */
    async function navigateTo(page, postId = null) {
        // Store the current page in a data attribute on the content area for tracking
        contentArea.dataset.currentPage = page;
        contentArea.dataset.currentPostId = postId; // Store postId if applicable

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
            case 'create-post': // New case
                renderCreatePostPage();
                break;
            case 'edit-post': // New case for editing
                if (postId) {
                    renderEditPostPage(postId);
                } else {
                    showMessageModal("Invalid post ID for editing.", 'error');
                    navigateTo('forum');
                }
                break;
            case 'forum': // New case
                renderForumPage();
                break;
            default:
                renderHomePage();
        }
        renderNavbar(); // Always re-render navbar after page change to update login/logout state
    }

    // Mobile menu toggle
    mobileMenuToggle.addEventListener('click', () => {
        const isHidden = mobileMenu.classList.contains('hidden');
        mobileMenu.classList.toggle('hidden', !isHidden);
        mobileMenuIconOpen.classList.toggle('hidden', !isHidden);
        mobileMenuIconClose.classList.add('hidden'); // Ensure close icon is hidden when menu is closed
    });

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
                // Determine which page to render based on current state or previous navigation
                let pageToRender = contentArea.dataset.currentPage || 'home';
                let postIdToRender = contentArea.dataset.currentPostId || null;

                if (pageToRender === 'auth' || pageToRender === 'logout') {
                    pageToRender = 'home'; // Always redirect to home if coming from auth/logout
                }
                navigateTo(pageToRender, postIdToRender); // Navigate to the appropriate page

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
            // Only redirect if current page is not home or about, or if it was a protected page
            if (contentArea.dataset.currentPage !== 'home' && contentArea.dataset.currentPage !== 'about') {
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
    navHomeButton.addEventListener('click', () => navigateTo('home'));
    navAboutButton.addEventListener('click', () => navigateTo('about'));
});
