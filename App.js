// App.js
// This script contains the entire application logic, including Firebase initialization.

// Import Firebase functions directly into this module
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile, sendPasswordResetEmail, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, onSnapshot, deleteDoc } from "https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async () => {
    // IMPORTANT: Replace with your actual Firebase project configuration
    // You get this from your Firebase project settings -> "Project settings" -> "Your apps" -> "Web app"
    const firebaseConfig = {
        apiKey: "YOUR_API_KEY", // <--- REPLACE THIS
        authDomain: "YOUR_AUTH_DOMAIN", // <--- REPLACE THIS
        projectId: "YOUR_PROJECT_ID", // <--- REPLACE THIS
        storageBucket: "YOUR_STORAGE_BUCKET", // <--- REPLACE THIS
        messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // <--- REPLACE THIS
        appId: "YOUR_APP_ID" // <--- REPLACE THIS
    };

    // Initialize Firebase within App.js
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const APP_ID = firebaseConfig.appId; // Use the projectId or a unique ID from your config

    // DOM Elements
    const contentArea = document.getElementById('content-area');
    const navLinks = document.getElementById('nav-links');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileMenuIconOpen = document.getElementById('mobile-menu-icon-open');
    const mobileMenuIconClose = document.getElementById('mobile-menu-icon-close');
    const navHomeButton = document.getElementById('nav-home');
    const navAboutButton = document.getElementById('nav-about'); // Get About button too

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
     * Updates the body's background class based on user data.
     */
    function updateBodyBackground() {
        document.body.className = ''; // Clear existing classes
        if (userData && userData.backgroundUrl) {
            document.body.classList.add(userData.backgroundUrl, 'min-h-screen', 'font-inter');
        } else {
            // Default fallback
            document.body.classList.add('bg-gradient-to-r', 'from-blue-400', 'to-purple-600', 'min-h-screen', 'font-inter');
        }
    }

    // --- Firebase Integration Functions ---

    /**
     * Authenticates a user (login or signup) with Firebase Auth and stores user data in Firestore.
     * @param {string} type - 'login' or 'signup'.
     * @param {object} formData - { email, password, username (for signup) }.
     * @returns {Promise<object>} - User data or throws error.
     */
    async function authenticateUser(type, formData) {
        showLoadingSpinner();
        try {
            let userCredential;
            if (type === 'signup') {
                userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
                const user = userCredential.user;

                // Create user document in Firestore
                const userDocRef = doc(db, `/artifacts/${APP_ID}/public/data/users`, user.uid);
                await setDoc(userDocRef, {
                    email: user.email,
                    username: formData.username,
                    role: 'member', // Default role for new users
                    profilePicUrl: `https://placehold.co/100x100/F0F0F0/000000?text=${formData.username.charAt(0).toUpperCase()}`,
                    backgroundUrl: 'bg-gradient-to-r from-blue-400 to-purple-600' // Default background
                });

                // Update display name for Firebase Auth user
                await updateProfile(user, { displayName: formData.username });

                // Fetch the newly created user data from Firestore for consistency
                const docSnap = await getDoc(userDocRef);
                return docSnap.exists() ? docSnap.data() : null;

            } else { // login
                userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
                const user = userCredential.user;

                // Fetch user data from Firestore
                const userDocRef = doc(db, `/artifacts/${APP_ID}/public/data/users`, user.uid);
                const docSnap = await getDoc(userDocRef);

                if (docSnap.exists()) {
                    return docSnap.data();
                } else {
                    // This case should ideally not happen if signup works, but as a fallback
                    // create a default entry for existing auth users without firestore data.
                    await setDoc(userDocRef, {
                        email: user.email,
                        username: user.displayName || user.email.split('@')[0],
                        role: 'member',
                        profilePicUrl: `https://placehold.co/100x100/F0F0F0/000000?text=${user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}`,
                        backgroundUrl: 'bg-gradient-to-r from-blue-400 to-purple-600'
                    });
                    const newDocSnap = await getDoc(userDocRef);
                    return newDocSnap.data();
                }
            }
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

    // --- UI Rendering Functions ---

    /**
     * Renders the Navbar links based on authentication status.
     */
    function renderNavbar() {
        navLinks.innerHTML = '';
        mobileMenu.innerHTML = '';

        const createButton = (id, text, page, iconHtml = '') => {
            const btn = document.createElement('button');
            btn.id = id;
            btn.className = `px-4 py-2 rounded-lg hover:bg-gray-700 transition duration-200 ${id.includes('admin') ? 'bg-red-600 hover:bg-red-700 shadow-md' : (id.includes('auth') ? 'bg-green-600 hover:bg-green-700 shadow-md' : (id.includes('sign-out') ? 'bg-blue-600 hover:bg-blue-700 shadow-md' : ''))}`;
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
            btn.className = `block w-full text-left px-4 py-2 hover:bg-gray-700 transition duration-200 ${id.includes('admin') ? 'bg-red-600 hover:bg-red-700' : (id.includes('auth') ? 'bg-green-600 hover:bg-green-700' : (id.includes('sign-out') ? 'bg-blue-600 hover:bg-blue-700' : ''))}`;
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
            profileBtn.className = 'px-4 py-2 rounded-lg hover:bg-gray-700 transition duration-200 flex items-center space-x-2';
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
                    Welcome to MyWebsite!
                </h1>
                ${currentUser && userData ? `
                    <p class="text-xl text-gray-700 mb-4">
                        Hello, <span class="font-semibold text-blue-600">${userData.username || currentUser.email}</span>!
                        You are logged in as a <span class="font-semibold text-purple-600">${userData.role}</span>.
                    </p>
                    <p class="text-lg text-gray-600 mb-6">
                        Explore your profile settings or check out the admin panel if you have the permissions.
                    </p>
                    <div class="flex flex-col sm:flex-row justify-center gap-4">
                        <button id="go-to-profile-btn" class="py-3 px-6 rounded-full bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg">
                            Go to Profile
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
            { name: 'Blue-Purple Gradient', class: 'bg-gradient-to-r from-blue-400 to-purple-600' },
            { name: 'Green-Cyan Gradient', class: 'bg-gradient-to-r from-green-400 to-cyan-600' },
            { name: 'Red-Orange Gradient', class: 'bg-gradient-to-r from-red-400 to-orange-600' },
            // Add more options as desired
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
                            <label for="profile-background" class="block text-gray-700 text-sm font-semibold mb-2">Website Background</label>
                            <select id="profile-background" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none">
                                ${backgroundOptions.map(option => `
                                    <option value="${option.class}" ${userData.backgroundUrl === option.class ? 'selected' : ''}>
                                        ${option.name}
                                    </option>
                                `).join('')}
                            </select>
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
        const backgroundSelect = document.getElementById('profile-background');
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
            const newBackgroundUrl = backgroundSelect.value;

            try {
                const updatedData = await updateProfileData({
                    username: newUsername,
                    profilePicUrl: newProfilePicUrl,
                    backgroundUrl: newBackgroundUrl
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
                    <h2 class="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600 mb-6">About Our Website</h2>
                    <p class="text-lg text-gray-700 mb-4">
                        Welcome to a secure and user-friendly platform designed to streamline your online experience. We offer robust user authentication, allowing you to sign up and sign in with ease, keeping your data safe.
                    </p>
                    <p class="text-lg text-gray-700 mb-4">
                        Our platform is built with a focus on personalization. You can update your profile information, choose a custom background theme, and manage your personal details within a dedicated settings section.
                    </p>
                    <p class="text-lg text-gray-700 mb-4">
                        For administrators, we provide a powerful admin panel. This feature allows designated users to oversee all registered accounts, view user details, and manage roles (assigning 'admin' or 'member' status) to ensure smooth operation and access control.
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
                    <p class="text-lg text-gray-700 text-center mb-6">Manage user roles and accounts here.</p>

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
            usersTableBody.innerHTML = usersList.map(user => {
                const profileIconSrc = user.profilePicUrl || `https://placehold.co/100x100/F0F0F0/000000?text=${(user.username || user.email || 'U').charAt(0).toUpperCase()}`;
                const isDisabled = user.id === currentUser.uid ? 'disabled' : ''; // Use currentUser.uid

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
                            </select>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                                class="text-red-600 hover:text-red-900 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                ${isDisabled}
                                data-delete-user-id="${user.id}" data-username="${user.username}"
                            >
                                Delete
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            // Add event listeners for role change and delete buttons
            usersTableBody.querySelectorAll('[data-role-select-id]').forEach(selectElement => {
                selectElement.addEventListener('change', async (e) => {
                    const userId = e.target.dataset.roleSelectId;
                    const newRole = e.target.value;
                    showMessageModal(`Are you sure you want to change this user's role to "${newRole}"?`, 'confirm', async () => {
                        try {
                            await updateUserRoleFirestore(userId, newRole);
                            showMessageModal(`User role updated to "${newRole}" successfully!`);
                            renderAdminPanelPage(); // Re-render admin panel to reflect changes
                        } catch (error) {
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
    }


    // --- Navigation and Initialization ---

    /**
     * Navigates to a specific page and renders its content.
     * @param {string} page - The page to navigate to ('home', 'auth', 'profile', 'about', 'admin', 'logout').
     */
    async function navigateTo(page) {
        // Store the current page in a data attribute on the content area for tracking
        contentArea.dataset.currentPage = page;

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
        mobileMenuIconClose.classList.toggle('hidden', isHidden);
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
                    const defaultProfilePic = `https://placehold.co/100x100/F0F0F0/000000?text=${(user.displayName || user.email || 'U').charAt(0).toUpperCase()}`;
                    const defaultBackground = 'bg-gradient-to-r from-blue-400 to-purple-600';
                    await setDoc(userDocRef, {
                        email: user.email,
                        username: user.displayName || user.email.split('@')[0],
                        role: 'member',
                        profilePicUrl: defaultProfilePic,
                        backgroundUrl: defaultBackground
                    });
                    userData = {
                        email: user.email,
                        username: user.displayName || user.email.split('@')[0],
                        role: 'member',
                        profilePicUrl: defaultProfilePic,
                        backgroundUrl: defaultBackground
                    };
                }
                updateBodyBackground(); // Apply user's saved background
                renderNavbar(); // Update navbar with user info
                // If the user was on the auth page and just logged in/signed up, redirect home
                // If not, stay on current page if it's not auth or logout.
                if (contentArea.dataset.currentPage === 'auth' || contentArea.dataset.currentPage === 'logout' || !contentArea.dataset.currentPage) {
                    navigateTo('home');
                } else {
                    // Re-render current page to ensure data is fresh (e.g. profile, admin panel)
                    navigateTo(contentArea.dataset.currentPage);
                }

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
