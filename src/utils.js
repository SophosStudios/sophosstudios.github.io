// src/utils.js
// Contains general utility functions for UI, theme, and data processing.

/**
 * Global variable to manage the active message modal.
 * @type {HTMLElement|null}
 */
let currentModal = null;

/**
 * Shows a loading spinner.
 */
export function showLoadingSpinner() {
    let spinner = document.getElementById('loading-spinner');
    if (!spinner) {
        spinner = document.createElement('div');
        spinner.id = 'loading-spinner';
        spinner.className = 'fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-50';
        spinner.innerHTML = `<div class="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-white"></div>`;
        document.body.appendChild(spinner);
    }
    spinner.classList.remove('hidden');
}

/**
 * Hides the loading spinner.
 */
export function hideLoadingSpinner() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.classList.add('hidden');
    }
}

/**
 * Displays a message modal.
 * @param {string} message - The message to display.
 * @param {string} type - 'info', 'error', or 'confirm'.
 * @param {function} onConfirm - Callback for 'confirm' type (only for 'confirm' type).
 */
export function showMessageModal(message, type = 'info', onConfirm = null) {
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
        <div class="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl text-center max-w-sm w-full">
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
 * @param {object} userData - The user's data object containing theme preference.
 */
export function applyThemeClasses(userData) {
    document.documentElement.classList.remove('light-theme', 'dark-theme'); // Remove existing themes
    if (userData && userData.theme === 'dark') {
        document.documentElement.classList.add('dark-theme');
        document.documentElement.classList.add('dark'); // For Tailwind's dark mode
    } else {
        document.documentElement.classList.add('light-theme');
        document.documentElement.classList.remove('dark');
    }
}

/**
 * Updates the body's background. Can be a Tailwind class string or a direct image URL.
 * This function also calls applyThemeClasses to ensure theme consistency.
 * @param {object} userData - The user's data object containing backgroundUrl and theme.
 */
export function updateBodyBackground(userData) {
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

    applyThemeClasses(userData); // Apply theme classes after background
}

/**
 * Extracts the YouTube video ID from a given YouTube URL.
 * @param {string} url - The YouTube URL.
 * @returns {string|null} The YouTube video ID or null if not found.
 */
export function extractYouTubeVideoId(url) {
    const regExp = /(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=|embed\/|v\/|)([\w-]{11})(?:\S+)?/;
    const match = url.match(regExp);
    return (match && match[1].length === 11) ? match[1] : null;
}

/**
 * Gets the VFX (emoji and color class) for a given role.
 * @param {string} role - The user's role.
 * @returns {string} HTML string with emoji and styled role text.
 */
export function getRoleVFX(role) {
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
        case 'co-founder': // New co-founder role
            emoji = '🌟'; // Star emoji
            colorClass = 'text-yellow-600'; // Co-founder color
            break;
        case 'partner': // New partner role
            emoji = '🤝'; // Handshake emoji
            colorClass = 'text-indigo-600'; // Partner color
            break;
        default:
            emoji = '';
            colorClass = 'text-gray-800';
    }
    // Apply a subtle animation for all roles, or only privileged ones
    const animationClass = (role === 'admin' || role === 'founder' || role === 'co-founder' || role === 'partner') ? 'animate-pulse' : '';
    return `<span class="font-semibold ${colorClass} ${animationClass}">${emoji} ${role}</span>`;
}
