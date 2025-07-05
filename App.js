document.addEventListener('DOMContentLoaded', () => {
    const contentArea = document.getElementById('content-area');
    const navLinks = document.getElementById('nav-links');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileMenuIconOpen = document.getElementById('mobile-menu-icon-open');
    const mobileMenuIconClose = document.getElementById('mobile-menu-icon-close');
    const navHomeButton = document.getElementById('nav-home');
    const navAboutButton = document.getElementById('nav-about'); // Get reference for existing About button
    const navRoomsButton = document.getElementById('nav-rooms'); // Get reference for new Rooms button
    const APP_ID = '1:26686142400:web:48f8d3ae0b097731317a25'; // Replace with a unique identifier for your app

    let currentUser = null; // Stores authenticated user data (from session or backend check)
    let userData = null; // Stores detailed user data (from PHP/DB)
    let usersList = []; // For admin panel
    let currentModal = null; // To keep track of the currently open modal

    // Room-specific global state variables for chat functionality
    let currentRoomId = null;
    let currentRoomTitle = '';
    let presenceInterval = null; // Interval for presence updates
    let messagesInterval = null; // Interval for message updates (simulated)
    let isInCall = false; // New state variable: tracks if the current user is in a simulated call


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
     * @param {function} onConfirm - Callback for 'confirm' type.
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
        currentModal = modal;

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
            // Check if it's a direct URL (http or https) or a Tailwind class
            if (userData.backgroundUrl.startsWith('http://') || userData.backgroundUrl.startsWith('https://')) {
                document.body.style.backgroundImage = `url('${userData.backgroundUrl}')`;
                document.body.style.backgroundSize = 'cover';
                document.body.style.backgroundPosition = 'center';
                document.body.style.backgroundRepeat = 'no-repeat';
                document.body.style.backgroundAttachment = 'fixed';
            } else {
                // Assume it's a Tailwind CSS class string
                document.body.classList.add(...userData.backgroundUrl.split(' '));
                document.body.style.backgroundImage = ''; // Clear inline image background
            }
        } else {
            // Default fallback
            document.body.classList.add('bg-gradient-to-r', 'from-blue-400', 'to-purple-600');
            document.body.style.backgroundImage = ''; // Clear inline image background
        }
        // Always add core classes for consistent styling
        document.body.classList.add('min-h-screen', 'font-inter');
    }

    /**
     * Closes the mobile side drawer menu.
     * This function is crucial for mobile responsiveness.
     */
    function closeSideDrawer() {
        // Assuming mobileMenu is the drawer itself and mobileMenuIconOpen/Close are icons
        // Ensure these elements are correctly referenced from the DOM.
        if (mobileMenu) mobileMenu.classList.add('hidden');
        if (mobileMenuIconOpen) mobileMenuIconOpen.classList.remove('hidden');
        if (mobileMenuIconClose) mobileMenuIconClose.classList.add('hidden');
    }

    // --- Backend API Simulation / Callbacks ---
    // In a real application, these would be `fetch` calls to your PHP API.
    // For this example, we'll simulate success and failure, and use localStorage for user tokens.
    // ACTUAL PHP ENDPOINTS ARE EXPLAINED SEPARATELY.

    /**
     * Authenticates a user (login or signup).
     * @param {string} type - 'login' or 'signup'.
     * @param {object} formData - { email, password, username (for signup) }.
     * @returns {Promise<object>} - User data or error.
     */
    async function authenticateUser(type, formData) {
        showLoadingSpinner();
        try {
            // --- SIMULATED BACKEND RESPONSE (Replace with actual fetch) ---
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

            if (type === 'signup') {
                const existingUser = localStorage.getItem(`user_${formData.email}`);
                if (existingUser) {
                    throw new Error('This email is already registered.');
                }
                const newUser = {
                    id: `user_${Date.now()}`,
                    email: formData.email,
                    username: formData.username,
                    role: 'member',
                    profilePicUrl: `https://placehold.co/100x100/F0F0F0/000000?text=${formData.username.charAt(0).toUpperCase()}`,
                    backgroundUrl: 'bg-gradient-to-r from-blue-400 to-purple-600',
                    token: `fake-token-${Date.now()}` // Simulated token
                };
                localStorage.setItem(`user_${formData.email}`, JSON.stringify(newUser));
                localStorage.setItem('current_user_token', newUser.token); // Simulate logging in immediately
                return newUser;
            } else { // login
                const storedUser = localStorage.getItem(`user_${formData.email}`);
                if (!storedUser) {
                    throw new Error('Invalid email or password.');
                }
                const userObj = JSON.parse(storedUser);
                // Simple password check (NOT secure for real app, use password hashing in PHP)
                if (formData.password !== 'password') { // Assuming a default password for simulation
                    throw new Error('Invalid email or password.');
                }
                localStorage.setItem('current_user_token', userObj.token);
                return userObj;
            }
            // --- END SIMULATED BACKEND RESPONSE ---

        } catch (error) {
            console.error("Auth API error:", error);
            throw error;
        } finally {
            hideLoadingSpinner();
        }
    }

    /**
     * Fetches the current user's data from the backend using a session/token.
     * @returns {Promise<object|null>} - User data or null if not authenticated.
     */
    async function fetchCurrentUser() {
        const token = localStorage.getItem('current_user_token');
        if (!token) return null;

        showLoadingSpinner();
        try {
            // --- SIMULATED BACKEND RESPONSE (Replace with actual fetch) ---
            await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
            const allUsers = Object.keys(localStorage).filter(key => key.startsWith('user_')).map(key => JSON.parse(localStorage.getItem(key)));
            const loggedInUser = allUsers.find(user => user.token === token);
            if (!loggedInUser) {
                 localStorage.removeItem('current_user_token'); // Token invalid
                 return null;
            }
            return loggedInUser;
            // --- END SIMULATED BACKEND RESPONSE ---

        } catch (error) {
            console.error("Fetch current user API error:", error);
            localStorage.removeItem('current_user_token'); // Assume token is invalid
            return null;
        } finally {
            hideLoadingSpinner();
        }
    }

    /**
     * Updates the current user's profile data.
     * @param {object} newUserData - Data to update.
     * @returns {Promise<object>} - Updated user data.
     */
    async function updateProfileData(newUserData) {
        const token = localStorage.getItem('current_user_token');
        if (!token) {
            showMessageModal("You must be logged in to update your profile.", 'error');
            return null;
        }

        showLoadingSpinner();
        try {
            // --- SIMULATED BACKEND RESPONSE (Replace with actual fetch) ---
            await new Promise(resolve => setTimeout(resolve, 700)); // Simulate network delay
            const allUsers = Object.keys(localStorage).filter(key => key.startsWith('user_')).map(key => JSON.parse(localStorage.getItem(key)));
            const userIndex = allUsers.findIndex(user => user.token === token);

            if (userIndex === -1) {
                throw new Error('User not found or session expired.');
            }

            const updatedUser = { ...allUsers[userIndex], ...newUserData };
            localStorage.setItem(`user_${updatedUser.email}`, JSON.stringify(updatedUser));
            return updatedUser;
            // --- END SIMULATED BACKEND RESPONSE ---

        } catch (error) {
            console.error("Update profile API error:", error);
            throw error;
        } finally {
            hideLoadingSpinner();
        }
    }

    /**
     * Fetches all users for the admin panel.
     * @returns {Promise<Array<object>>} - List of all users.
     */
    async function fetchAllUsers() {
        const token = localStorage.getItem('current_user_token');
        if (!token) {
            showMessageModal("Not authorized to view users list.", 'error');
            return [];
        }

        showLoadingSpinner();
        try {
            // --- SIMULATED BACKEND RESPONSE (Replace with actual fetch) ---
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
            const allUsers = Object.keys(localStorage)
                .filter(key => key.startsWith('user_'))
                .map(key => JSON.parse(localStorage.getItem(key)));
            return allUsers;
            // --- END SIMULATED BACKEND RESPONSE ---

        } catch (error) {
            console.error("Fetch all users API error:", error);
            throw error;
        } finally {
            hideLoadingSpinner();
        }
    }

    /**
     * Updates a user's role by an admin.
     * @param {string} userId - ID of the user to update.
     * @param {string} newRole - The new role ('member' or 'admin').
     * @returns {Promise<boolean>} - True on success.
     */
    async function updateUserRole(userId, newRole) {
        const token = localStorage.getItem('current_user_token');
        if (!token) {
            showMessageModal("Not authorized to change roles.", 'error');
            return false;
        }

        showLoadingSpinner();
        try {
            // --- SIMULATED BACKEND RESPONSE (Replace with actual fetch) ---
            await new Promise(resolve => setTimeout(resolve, 700)); // Simulate network delay
            const allUsers = Object.keys(localStorage).filter(key => key.startsWith('user_')).map(key => JSON.parse(localStorage.getItem(key)));
            const userToUpdateIndex = allUsers.findIndex(user => user.id === userId);

            if (userToUpdateIndex === -1) {
                throw new Error('User not found.');
            }

            const updatedUser = { ...allUsers[userToUpdateIndex], role: newRole };
            localStorage.setItem(`user_${updatedUser.email}`, JSON.stringify(updatedUser));
            return true;
            // --- END SIMULATED BACKEND RESPONSE ---

        } catch (error) {
            console.error("Update role API error:", error);
            throw error;
        } finally {
            hideLoadingSpinner();
        }
    }

    /**
     * Deletes a user by an admin.
     * @param {string} userId - ID of the user to delete.
     * @returns {Promise<boolean>} - True on success.
     */
    async function deleteUser(userId) {
        const token = localStorage.getItem('current_user_token');
        if (!token) {
            showMessageModal("Not authorized to delete users.", 'error');
            return false;
        }

        showLoadingSpinner();
        try {
            // --- SIMULATED BACKEND RESPONSE (Replace with actual fetch) ---
            await new Promise(resolve => setTimeout(resolve, 700)); // Simulate network delay
            const allUsers = Object.keys(localStorage).filter(key => key.startsWith('user_')).map(key => JSON.parse(localStorage.getItem(key)));
            const userToDelete = allUsers.find(user => user.id === userId);

            if (!userToDelete) {
                throw new Error('User not found.');
            }
            localStorage.removeItem(`user_${userToDelete.email}`);
            return true;
            // --- END SIMULATED BACKEND RESPONSE ---

        } catch (error) {
            console.error("Delete user API error:", error);
            throw error;
        } finally {
            hideLoadingSpinner();
        }
    }

    /**
     * SIMULATED: Fetches all rooms from localStorage.
     * @returns {Promise<Array<object>>} - List of all rooms.
     */
    async function fetchAllRoomsSimulated() {
        showLoadingSpinner();
        try {
            await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
            const rooms = JSON.parse(localStorage.getItem('rooms_data') || '[]');
            return rooms;
        } catch (error) {
            console.error("Error fetching simulated rooms:", error);
            return [];
        } finally {
            hideLoadingSpinner();
        }
    }

    /**
     * SIMULATED: Sends a new chat message to localStorage.
     * @param {string} roomId - The ID of the room.
     * @param {string} messageText - The content of the message.
     */
    async function sendMessageSimulated(roomId, messageText) {
        if (!currentUser || !userData || !roomId) {
            showMessageModal("You must be logged in and in a room to send messages.", 'info');
            return;
        }
        if (!messageText.trim()) {
            showMessageModal("Message cannot be empty.", 'info');
            return;
        }

        try {
            showLoadingSpinner();
            await new Promise(resolve => setTimeout(resolve, 200)); // Simulate network delay

            const messagesKey = `room_messages_${roomId}`;
            const existingMessages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
            const newMessage = {
                id: `msg_${Date.now()}`,
                text: messageText,
                authorId: currentUser.id,
                authorUsername: userData.username || currentUser.email,
                profilePicUrl: userData.profilePicUrl || '',
                timestamp: new Date().toISOString()
            };
            existingMessages.push(newMessage);
            localStorage.setItem(messagesKey, JSON.stringify(existingMessages));

            // Clear input after sending, assuming the input element is accessible
            const messageInput = document.getElementById('message-input');
            if (messageInput) messageInput.value = '';
        } catch (error) {
            console.error("Error sending simulated message:", error);
            showMessageModal("Failed to send message: " + error.message, 'error');
        } finally {
            hideLoadingSpinner();
        }
    }

    /**
     * SIMULATED: Loads messages for the current room from localStorage.
     */
    function loadRoomMessagesSimulated() {
        if (!currentUser || !currentRoomId) return;

        // Clean up previous messages interval if any
        if (messagesInterval) clearInterval(messagesInterval);

        const chatMessagesDiv = document.getElementById('chat-messages');
        if (!chatMessagesDiv) return;

        const updateMessages = async () => {
            const messagesKey = `room_messages_${currentRoomId}`;
            const messages = JSON.parse(localStorage.getItem(messagesKey) || '[]')
                                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            chatMessagesDiv.innerHTML = ''; // Clear existing messages

            // Get all simulated users for display purposes
            const allUsers = Object.keys(localStorage)
                .filter(key => key.startsWith('user_'))
                .map(key => JSON.parse(localStorage.getItem(key)));
            const usersMap = {};
            allUsers.forEach(user => usersMap[user.id] = user);

            messages.forEach((msg) => {
                const senderData = usersMap[msg.authorId] || { username: 'Unknown User', profilePicUrl: '' };
                const profilePic = senderData.profilePicUrl || `https://placehold.co/40x40/F0F0F0/000000?text=${(senderData.username || 'U').charAt(0).toUpperCase()}`;

                const messageElement = document.createElement('div');
                // Discord-like message styling
                messageElement.className = `
                    flex items-start gap-3 p-3 rounded-lg w-full text-white
                    ${msg.authorId === currentUser.id ? 'bg-indigo-700 self-end ml-auto flex-row-reverse' : 'bg-gray-700 self-start mr-auto'}
                `;
                messageElement.innerHTML = `
                    <img src="${profilePic}" alt="Avatar" class="w-10 h-10 rounded-full object-cover border-2 border-gray-500 flex-shrink-0" onerror="this.onerror=null; this.src='https://placehold.co/40x40/F0F0F0/000000?text=${(senderData.username || 'U').charAt(0).toUpperCase()}'">
                    <div class="flex flex-col ${msg.authorId === currentUser.id ? 'items-end' : 'items-start'} flex-grow">
                        <p class="font-semibold text-sm ${msg.authorId === currentUser.id ? 'text-blue-300' : 'text-gray-200'}">${msg.authorUsername}</p>
                        <p class="break-words text-lg">${msg.text}</p>
                        <p class="text-xs text-gray-400 mt-1">${new Date(msg.timestamp).toLocaleString()}</p>
                    </div>
                `;
                chatMessagesDiv.appendChild(messageElement);
            });
            chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight; // Scroll to bottom
        };

        updateMessages(); // Initial load
        messagesInterval = setInterval(updateMessages, 1000); // Poll for new messages every second (simulated)
    }

    /**
     * SIMULATED: Updates the current user's presence status in the current room.
     * This uses localStorage to simulate presence.
     * @param {boolean} inCallStatus - True if the user is in a call, false otherwise.
     */
    async function updateMyPresenceSimulated(inCallStatus) {
        if (!currentUser || !currentRoomId) return;

        try {
            const presenceKey = `room_presence_${currentRoomId}`;
            const allPresence = JSON.parse(localStorage.getItem(presenceKey) || '{}');

            allPresence[currentUser.id] = {
                userId: currentUser.id,
                username: userData.username || currentUser.email,
                profilePicUrl: userData.profilePicUrl || '',
                lastSeen: new Date().toISOString(),
                inCall: inCallStatus,
            };
            localStorage.setItem(presenceKey, JSON.stringify(allPresence));
        } catch (error) {
            console.error("Error updating simulated presence:", error);
        }
    }

    /**
     * SIMULATED: Sets up real-time presence tracking for the current user in the room.
     * This polls localStorage for updates.
     */
    async function setupPresenceSimulated() {
        if (!currentUser || !currentRoomId) return;

        // Clean up previous presence listener and interval if any
        if (presenceInterval) clearInterval(presenceInterval);

        // Initial presence update, reflecting current isInCall status
        updateMyPresenceSimulated(isInCall);

        // Poll for other users' presence
        presenceInterval = setInterval(() => {
            const activeUsersListDiv = document.getElementById('active-users-list');
            if (!activeUsersListDiv) return;

            activeUsersListDiv.innerHTML = '';
            let activeUsersCount = 0;
            const activeThreshold = new Date(Date.now() - 15 * 1000).toISOString(); // Users seen in last 15 seconds

            const presenceKey = `room_presence_${currentRoomId}`;
            const allPresence = JSON.parse(localStorage.getItem(presenceKey) || '{}');

            Object.values(allPresence).forEach((presenceData) => {
                if (presenceData.lastSeen && presenceData.lastSeen > activeThreshold) {
                    activeUsersCount++;
                    const userElement = document.createElement('div');
                    userElement.className = 'flex items-center space-x-3 p-2 bg-gray-700 rounded-md shadow-sm text-white'; // Discord-like
                    const userProfilePic = presenceData.profilePicUrl || `https://placehold.co/30x30/F0F0F0/000000?text=${(presenceData.username || 'U').charAt(0).toUpperCase()}`;

                    userElement.innerHTML = `
                        <img src="${userProfilePic}" alt="User Avatar" class="w-8 h-8 rounded-full object-cover border-2 ${presenceData.inCall ? 'border-green-500' : 'border-gray-500'}">
                        <span class="font-semibold text-gray-200">${presenceData.username}</span>
                        ${presenceData.userId === currentUser.id ? '<span class="text-xs text-blue-300">(You)</span>' : ''}
                        ${presenceData.inCall ? '<i class="fas fa-phone text-green-500 ml-2" title="In Call"></i>' : ''}
                    `;
                    activeUsersListDiv.appendChild(userElement);
                }
            });

            if (activeUsersCount === 0) {
                activeUsersListDiv.innerHTML = '<p class="text-gray-400 text-center text-sm">No one else is online.</p>';
            }
        }, 3000); // Update presence list every 3 seconds (simulated)
    }

    /**
     * Initiates a simulated call for the current user.
     */
    async function joinCallSimulated() {
        if (!currentUser || !currentRoomId) return;
        isInCall = true;
        await updateMyPresenceSimulated(true);
        showMessageModal("You have joined the call!", 'info');
        // Update button states immediately
        const joinCallBtn = document.getElementById('join-call-btn');
        const leaveCallBtn = document.getElementById('leave-call-btn');
        if (joinCallBtn) joinCallBtn.classList.add('hidden');
        if (leaveCallBtn) leaveCallBtn.classList.remove('hidden');
    }

    /**
     * Ends a simulated call for the current user.
     */
    async function leaveCallSimulated() {
        if (!currentUser || !currentRoomId) return;
        isInCall = false;
        await updateMyPresenceSimulated(false);
        showMessageModal("You have left the call.", 'info');
        // Update button states immediately
        const joinCallBtn = document.getElementById('join-call-btn');
        const leaveCallBtn = document.getElementById('leave-call-btn');
        if (joinCallBtn) joinCallBtn.classList.remove('hidden');
        if (leaveCallBtn) leaveCallBtn.classList.add('hidden');
    }

    // --- UI Rendering Functions ---

    /**
     * Renders the Navbar links based on authentication status.
     */
    function renderNavbar() {
        navLinks.innerHTML = '';
        mobileMenu.innerHTML = '';

        const createButton = (id, text, page, iconHtml = '', isMobile = false) => {
            const btn = document.createElement('button');
            btn.id = id;
            btn.className = `
                ${isMobile ? 'block w-full text-left px-4 py-2 text-md' : 'px-4 py-2'}
                rounded-lg hover:bg-gray-700 transition duration-200 text-white
                ${id.includes('admin') ? 'bg-red-600 hover:bg-red-700 shadow-md' :
                  (id.includes('auth') ? 'bg-green-600 hover:bg-green-700 shadow-md' :
                  (id.includes('sign-out') ? 'bg-blue-600 hover:bg-blue-700 shadow-md' : ''))}
            `;
            btn.innerHTML = `${iconHtml}<span>${text}</span>`;
            btn.addEventListener('click', () => {
                navigateTo(page);
                closeSideDrawer(); // Ensure mobile menu closes on navigation
            });
            return btn;
        };

        // Static buttons that always exist in HTML but need event listeners
        navHomeButton.onclick = () => navigateTo('home');
        navAboutButton.onclick = () => navigateTo('about');
        navRoomsButton.onclick = () => navigateTo('rooms');

        // Dynamically add links to desktop nav
        if (currentUser && userData) {
            if (userData.role === 'admin') {
                navLinks.appendChild(createButton('nav-admin', 'Admin Panel', 'admin'));
            }

            const profileIconHtml = userData.profilePicUrl ?
                `<img src="${userData.profilePicUrl}" alt="Profile" class="w-8 h-8 rounded-full object-cover border-2 border-gray-400" onerror="this.onerror=null; this.src='https://placehold.co/100x100/F0F0F0/000000?text=${userData.username ? userData.username.charAt(0).toUpperCase() : 'U'}'">` :
                `<span class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">${userData.username ? userData.username.charAt(0).toUpperCase() : 'U'}</span>`;

            const profileBtn = document.createElement('button');
            profileBtn.id = 'nav-profile';
            profileBtn.className = 'px-4 py-2 rounded-lg hover:bg-gray-700 transition duration-200 flex items-center space-x-2 text-white';
            profileBtn.innerHTML = `${profileIconHtml}<span>${userData.username || currentUser.email}</span>`;
            profileBtn.addEventListener('click', () => navigateTo('profile'));
            navLinks.appendChild(profileBtn);

            navLinks.appendChild(createButton('nav-sign-out', 'Sign Out', 'logout'));
        } else {
            navLinks.appendChild(createButton('nav-auth', 'Sign In / Up', 'auth'));
        }

        // Dynamically add links to mobile menu
        mobileMenu.appendChild(createButton('mobile-nav-home', 'Home', 'home', '', true));
        mobileMenu.appendChild(createButton('mobile-nav-about', 'About', 'about', '', true));
        mobileMenu.appendChild(createButton('mobile-nav-rooms', 'Rooms', 'rooms', '', true)); // Rooms for mobile
        if (currentUser && userData) {
            if (userData.role === 'admin') {
                mobileMenu.appendChild(createButton('mobile-nav-admin', 'Admin Panel', 'admin', '', true));
            }
            mobileMenu.appendChild(createButton('mobile-nav-profile', 'Profile', 'profile', '', true));
            mobileMenu.appendChild(createButton('mobile-nav-sign-out', 'Sign Out', 'logout', '', true));
        } else {
            mobileMenu.appendChild(createButton('mobile-nav-auth', 'Sign In / Up', 'auth', '', true));
        }
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
                        <button id="go-to-rooms-btn" class="py-3 px-6 rounded-full bg-indigo-600 text-white font-bold text-lg hover:bg-indigo-700 transition duration-300 transform hover:scale-105 shadow-lg">
                            Go to Rooms
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
            document.getElementById('go-to-rooms-btn').addEventListener('click', () => navigateTo('rooms'));
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
            const username = usernameInput.value; // Will be empty if not in signup mode

            try {
                if (isSignUpMode) {
                    const newUser = await authenticateUser('signup', { email, password, username });
                    if (newUser) {
                        showMessageModal('Account created successfully! Please sign in.');
                        isSignUpMode = false; // Switch to sign-in form
                        authTitle.textContent = 'Sign In';
                        authSubmitBtn.textContent = 'Sign In';
                        toggleAuthModeBtn.textContent = 'Need an account? Sign Up';
                        usernameField.classList.add('hidden');
                        usernameInput.value = '';
                        passwordInput.value = '';
                        usernameInput.required = false;
                        forgotPasswordBtn.classList.remove('hidden');
                    }
                } else {
                    const loggedInUser = await authenticateUser('login', { email, password });
                    if (loggedInUser) {
                        currentUser = loggedInUser; // Update global state
                        userData = loggedInUser;
                        updateBodyBackground(); // Update background on login
                        showMessageModal('Signed in successfully!');
                        navigateTo('home');
                    }
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
            showLoadingSpinner();
            try {
                // --- SIMULATED BACKEND RESPONSE (Replace with actual fetch) ---
                await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
                const storedUser = localStorage.getItem(`user_${email}`);
                if (!storedUser) {
                    throw new Error("No account found with that email.");
                }
                showMessageModal("Password reset email sent! Check your inbox. (Simulation: No actual email sent)");
                // --- END SIMULATED BACKEND RESPONSE ---

            } catch (error) {
                showMessageModal(error.message, 'error');
            } finally {
                hideLoadingSpinner();
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
            { name: 'Red-Black Gradient', class: 'bg-gradient-to-r from-red-800 to-black' },
            { name: 'Orange-Red Gradient', class: 'bg-gradient-to-r from-orange-600 to-red-600' },
        ];

        contentArea.innerHTML = `
            <div class="flex flex-col items-center justify-center p-4">
                <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-xl backdrop-blur-sm bg-opacity-80 border border-gray-200">
                    <h2 class="text-3xl font-extrabold text-center text-gray-800 mb-8">Your Profile Settings</h2>

                    <div class="flex flex-col items-center mb-6">
                        <img id="profile-pic-display" src="${userData.profilePicUrl || `https://placehold.co/100x100/F0F0F0/000000?text=${userData.username ? userData.username.charAt(0).toUpperCase() : 'U'}`}" alt="Profile" class="w-32 h-32 rounded-full object-cover border-4 border-blue-500 shadow-md">
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
        const backgroundSelect = document.getElementById('profile-background-select');
        const customBackgroundUrlInput = document.getElementById('custom-background-url'); // Get the custom URL input
        const profilePicDisplay = document.getElementById('profile-pic-display');

        profilePicUrlInput.addEventListener('input', () => {
          profilePicDisplay.src = profilePicUrlInput.value || `https://placehold.co/100x100/F0F0F0/000000?text=${usernameInput.value.charAt(0).toUpperCase()}`;
        });
        profilePicDisplay.onerror = () => { // Fallback for broken image URLs
            profilePicDisplay.src = `https://placehold.co/100x100/F0F0F0/000000?text=${usernameInput.value.charAt(0).toUpperCase()}`;
        };


        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newUsername = usernameInput.value;
            const newProfilePicUrl = profilePicUrlInput.value;
            
            let newBackgroundUrl;
            if (customBackgroundUrlInput && customBackgroundUrlInput.value) {
                newBackgroundUrl = customBackgroundUrlInput.value;
            } else {
                newBackgroundUrl = backgroundSelect.value;
            }

            try {
                const updatedData = await updateProfileData({
                    username: newUsername,
                    profilePicUrl: newProfilePicUrl || `https://placehold.co/100x100/F0F0F0/000000?text=${newUsername.charAt(0).toUpperCase()}`,
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

        // Fetch users list (or use already fetched if available and recent)
        usersList = await fetchAllUsers();

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
            usersTableBody.innerHTML = usersList.map(user => `
                <tr data-user-id="${user.id}" class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                        ${user.profilePicUrl ? `
                            <img src="${user.profilePicUrl}" alt="User Icon" class="w-10 h-10 rounded-full object-cover border-2 border-gray-300" onerror="this.onerror=null; this.src='https://placehold.co/100x100/F0F0F0/000000?text=${user.username ? user.username.charAt(0).toUpperCase() : 'U'}'">
                        ` : `
                            <span class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                                ${user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                            </span>
                        `}
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
                            ${user.id === currentUser.id ? 'disabled' : ''}
                            data-role-select-id="${user.id}"
                        >
                            <option value="member" ${user.role === 'member' ? 'selected' : ''}>Member</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                            class="text-red-600 hover:text-red-900 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            ${user.id === currentUser.id ? 'disabled' : ''}
                            data-delete-user-id="${user.id}" data-username="${user.username}"
                        >
                            Delete
                        </button>
                    </td>
                </tr>
            `).join('');

            // Add event listeners for role change and delete buttons
            usersTableBody.querySelectorAll('[data-role-select-id]').forEach(selectElement => {
                selectElement.addEventListener('change', async (e) => {
                    const userId = e.target.dataset.roleSelectId;
                    const newRole = e.target.value;
                    showMessageModal(`Are you sure you want to change this user's role to "${newRole}"?`, 'confirm', async () => {
                        try {
                            const success = await updateUserRole(userId, newRole);
                            if (success) {
                                showMessageModal(`User role updated to "${newRole}" successfully!`);
                                // Re-render admin panel to reflect changes
                                renderAdminPanelPage();
                            } else {
                                showMessageModal('Failed to update user role.', 'error');
                                renderAdminPanelPage(); // Re-render to revert dropdown if failed
                            }
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
                    showMessageModal(`Are you sure you want to delete user "${username}"? This action cannot be undone and will remove their data.`, 'confirm', async () => {
                        try {
                            const success = await deleteUser(userId);
                            if (success) {
                                showMessageModal(`User "${username}" deleted successfully!`);
                                // Re-render admin panel to reflect changes
                                renderAdminPanelPage();
                            } else {
                                showMessageModal('Failed to delete user.', 'error');
                            }
                        } catch (error) {
                            showMessageModal(error.message, 'error');
                        }
                    });
                });
            });
        }
    }

    /**
     * Renders the Rooms page, displaying available chat rooms.
     */
    async function renderRoomsPage() {
        if (!currentUser) {
             contentArea.innerHTML = `
                 <div class="flex flex-col items-center justify-center p-4">
                     <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-xl text-center backdrop-blur-sm bg-opacity-80 border border-gray-200">
                         <h2 class="text-3xl font-extrabold text-red-600 mb-4">Access Denied</h2>
                         <p class="text-lg text-gray-700">Please sign in to view the chat rooms.</p>
                     </div>
                 </div>
             `;
             return;
         }

        // Initialize some dummy rooms if they don't exist
        if (!localStorage.getItem('rooms_data')) {
            const initialRooms = [
                { id: 'room1', title: 'General Chat', description: 'A place for everyone to chat!', creatorUsername: 'Admin', timestamp: new Date().toISOString() },
                { id: 'room2', title: 'Developers Corner', description: 'Discussion about coding and projects.', creatorUsername: 'Admin', timestamp: new Date().toISOString() },
                { id: 'room3', title: 'Gaming Lounge', description: 'Talk about your favorite games!', creatorUsername: 'Moderator', timestamp: new Date().toISOString() }
            ];
            localStorage.setItem('rooms_data', JSON.stringify(initialRooms));
        }

        let rooms = [];
        try {
            rooms = await fetchAllRoomsSimulated(); // Use simulated fetch
        } catch (error) {
            showMessageModal(error.message, 'error');
            rooms = [];
        }

        contentArea.innerHTML = `
            <div class="flex flex-col items-center justify-center p-4 min-h-[calc(100vh-64px)]">
                <div class="bg-white p-8 rounded-xl shadow-2xl w-full max-w-3xl backdrop-blur-sm bg-opacity-80 border border-gray-200">
                    <h2 class="text-3xl font-extrabold text-center text-gray-800 mb-8">Available Chat Rooms</h2>

                    ${rooms.length === 0 ? `
                        <p class="text-center text-gray-600">No rooms available yet.</p>
                    ` : `
                        <div id="rooms-list" class="space-y-4">
                            ${rooms.map(room => `
                                <div class="bg-gray-100 p-6 rounded-lg shadow-md border border-gray-200 flex flex-col sm:flex-row justify-between items-center">
                                    <div>
                                        <h3 class="text-xl font-bold text-gray-800">${room.title}</h3>
                                        <p class="text-gray-700 text-sm">${room.description}</p>
                                        <p class="text-xs text-gray-500 mt-2">Created by ${room.creatorUsername} on ${new Date(room.timestamp).toLocaleString()}</p>
                                    </div>
                                    <button class="mt-4 sm:mt-0 py-2 px-6 rounded-full bg-blue-600 text-white font-bold text-md hover:bg-blue-700 transition duration-300 transform hover:scale-105 shadow-lg"
                                            data-join-room-id="${room.id}" data-room-title="${encodeURIComponent(room.title)}">
                                        Join Chat
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;

        // Add event listeners for "Join Chat" buttons within this page
        contentArea.querySelectorAll('[data-join-room-id]').forEach(button => {
            button.addEventListener('click', (e) => {
                const roomIdToJoin = e.target.dataset.joinRoomId;
                const roomTitleToJoin = decodeURIComponent(e.target.dataset.roomTitle); // Decode title
                navigateTo('room-chat', { id: roomIdToJoin, title: roomTitleToJoin });
            });
        });
    }

    /**
     * Renders the actual chat interface for a specific room.
     * @param {object} roomDetails - Object containing id and title of the room.
     */
    async function renderRoomChatPage(roomDetails) {
        if (!currentUser || !userData) {
            showMessageModal("You must be logged in to join chat rooms.", 'info');
            navigateTo('auth');
            return;
        }

        currentRoomId = roomDetails.id;
        currentRoomTitle = roomDetails.title;
        isInCall = false; // Reset call status when entering a new room

        contentArea.innerHTML = `
            <div class="flex flex-col md:flex-row items-start justify-center p-4 w-full h-full min-h-screen gap-4">
                <!-- Main Chat Area -->
                <div class="bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-2xl border border-gray-700" style="height: 80vh; max-height: 700px; display: flex; flex-direction: column;">
                    <h2 id="room-title-chat" class="text-3xl font-extrabold text-center text-white mb-6">Chat in "${currentRoomTitle}"</h2>

                    <!-- Call Buttons -->
                    <div class="flex justify-center mb-4 space-x-4">
                        <button id="join-call-btn" class="py-2 px-6 rounded-full bg-green-600 text-white font-bold text-lg hover:bg-green-700 transition duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center">
                            <i class="fas fa-phone mr-2"></i> Join Call
                        </button>
                        <button id="leave-call-btn" class="py-2 px-6 rounded-full bg-red-600 text-white font-bold text-lg hover:bg-red-700 transition duration-300 transform hover:scale-105 shadow-lg hidden flex items-center justify-center">
                            <i class="fas fa-phone-slash mr-2"></i> Leave Call
                        </button>
                    </div>

                    <div id="chat-messages" class="bg-gray-900 p-4 rounded-lg mb-4 space-y-3 overflow-y-auto" style="flex-grow: 1; scroll-behavior: smooth;">
                        <!-- Chat messages will be loaded here -->
                    </div>
                    <form id="chat-form" class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                        <textarea id="message-input" rows="1" class="flex-grow resize-none px-4 py-2 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white bg-gray-700 placeholder-gray-400" placeholder="Type your message..." required></textarea>
                        <button type="submit" id="send-button" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-full transition duration-300 transform hover:scale-105 shadow-lg">
                            Send
                        </button>
                    </form>
                    <div class="mt-4 text-center">
                        <button id="back-to-rooms-list-btn" class="py-2 px-4 rounded-full bg-gray-600 text-white font-bold text-sm hover:bg-gray-700 transition duration-300 transform hover:scale-105 shadow-lg">
                            Back to Room List
                        </button>
                    </div>
                </div>

                <!-- Active Users Panel -->
                <div class="bg-gray-800 p-6 rounded-xl shadow-2xl w-full max-w-xs border border-gray-700 h-fit md:h-[80vh]">
                    <h3 class="text-2xl font-extrabold text-center text-white mb-4">Active Users</h3>
                    <div id="active-users-list" class="space-y-2 overflow-y-auto max-h-[calc(80vh-100px)]">
                        <!-- Active users will be listed here -->
                        <p class="text-gray-400 text-center text-sm">Loading active users...</p>
                    </div>
                </div>
            </div>
        `;

        // Set up listeners for the current room
        loadRoomMessagesSimulated();
        setupPresenceSimulated(); // This will also handle initial button state

        // Add event listeners specific to this page
        document.getElementById('chat-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const messageInput = document.getElementById('message-input');
            sendMessageSimulated(currentRoomId, messageInput.value);
        });

        document.getElementById('back-to-rooms-list-btn').addEventListener('click', () => {
            navigateTo('rooms'); // Go back to the list of rooms
        });

        document.getElementById('join-call-btn').addEventListener('click', joinCallSimulated);
        document.getElementById('leave-call-btn').addEventListener('click', leaveCallSimulated);
    }


    // --- Navigation and Initialization ---

    /**
     * Cleans up active intervals related to the chat rooms.
     * This should be called before navigating away from a chat room.
     */
    function cleanupRoomIntervals() {
        if (presenceInterval) {
            clearInterval(presenceInterval);
            presenceInterval = null;
            console.log("Cleared presenceInterval.");
        }
        if (messagesInterval) {
            clearInterval(messagesInterval);
            messagesInterval = null;
            console.log("Cleared messagesInterval.");
        }
        // If current user was in a call, set inCall to false when leaving the room
        if (currentUser && currentRoomId && isInCall) {
            updateMyPresenceSimulated(false); // Update presence to indicate leaving call
        }
        currentRoomId = null; // Clear current room state
        currentRoomTitle = '';
        isInCall = false; // Reset call status for next room entry
    }

    /**
     * Navigates to a specific page and renders its content.
     * @param {string} page - The page to navigate to ('home', 'auth', 'profile', 'about', 'admin', 'logout', 'rooms', 'room-chat').
     * @param {object} [param=null] - Optional: {id, title} for room-chat.
     */
    async function navigateTo(page, param = null) {
        // Cleanup any active room intervals before navigating to a new page
        cleanupRoomIntervals();

        if (page === 'logout') {
            localStorage.removeItem('current_user_token');
            currentUser = null;
            userData = null;
            showMessageModal('You have been signed out.');
            page = 'home'; // Redirect to home after logout
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
            case 'rooms': // List of all chat rooms
                renderRoomsPage();
                break;
            case 'room-chat': // Specific chat room
                if (param && param.id && param.title) {
                    renderRoomChatPage(param);
                } else {
                    showMessageModal("Invalid room details provided.", 'error');
                    navigateTo('rooms'); // Go back to room list
                }
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

    // Initial check for authentication status and render initial page
    async function initializeApp() {
        showLoadingSpinner();
        currentUser = await fetchCurrentUser(); // Attempt to fetch user based on stored token
        if (currentUser) {
            userData = currentUser; // If currentUser fetched, assign to userData
            updateBodyBackground(); // Apply user's saved background
            navigateTo('home'); // Go to home if already logged in
        } else {
            navigateTo('home'); // Go to home if not logged in
        }
        hideLoadingSpinner();
    }

    // Call initialization function when the DOM is fully loaded
    initializeApp();

    // Event listeners for static navbar buttons (already defined in HTML)
    // Make sure these are attached here to ensure they are active
    navHomeButton.addEventListener('click', () => navigateTo('home'));
    navAboutButton.addEventListener('click', () => navigateTo('about'));
    navRoomsButton.addEventListener('click', () => navigateTo('rooms')); // Attach listener for new Rooms button
});
