// src/utils.js
// This file contains general utility functions used across the application.

/**
 * Shows the global loading spinner.
 */
export function showLoadingSpinner() {
    const loadingSpinner = document.getElementById('loading-spinner');
    if (loadingSpinner) {
        loadingSpinner.classList.remove('hidden');
    }
}

/**
 * Hides the global loading spinner.
 */
export function hideLoadingSpinner() {
    const loadingSpinner = document.getElementById('loading-spinner');
    if (loadingSpinner) {
        loadingSpinner.classList.add('hidden');
    }
}

/**
 * Displays a custom message modal.
 * @param {string} message - The message to display.
 * @param {'info'|'error'|'confirm'} type - Type of modal (info, error, confirm).
 * @param {function} [onConfirm=null] - Callback for 'confirm' type when OK is clicked.
 */
export function showMessageModal(message, type = 'info', onConfirm = null) {
    const messageModalContainer = document.getElementById('message-modal-container');
    const messageModalText = document.getElementById('message-modal-text');
    const messageModalOkBtn = document.getElementById('message-modal-ok-btn');
    const messageModalCancelBtn = document.getElementById('message-modal-cancel-btn');

    if (!messageModalContainer || !messageModalText || !messageModalOkBtn || !messageModalCancelBtn) {
        console.error("Message modal elements not found. Falling back to alert.");
        alert(message); // Fallback to alert if modal elements are missing
        return;
    }

    messageModalText.textContent = message;
    messageModalOkBtn.onclick = () => {
        messageModalContainer.classList.add('hidden');
        if (type === 'confirm' && onConfirm) {
            onConfirm();
        }
    };

    if (type === 'confirm') {
        messageModalCancelBtn.classList.remove('hidden');
        messageModalCancelBtn.onclick = () => {
            messageModalContainer.classList.add('hidden');
        };
    } else {
        messageModalCancelBtn.classList.add('hidden');
    }

    messageModalContainer.classList.remove('hidden');
}

/**
 * Applies the user's selected theme (dark/light) to the document.
 * @param {object} userData - The user's Firestore data.
 */
export function applyThemeClasses(userData) {
    if (userData && userData.theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light-theme');
    } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light-theme');
    }
}

/**
 * Updates the body background based on user data.
 * @param {object} userData - The user's Firestore data.
 */
export function updateBodyBackground(userData) {
    const body = document.body;
    // Remove all existing background classes
    body.className = body.className.split(' ').filter(c => !c.startsWith('bg-gradient-to-')).join(' ');
    body.style.backgroundImage = ''; // Clear custom image

    if (userData && userData.backgroundUrl) {
        if (userData.backgroundUrl.startsWith('http') || userData.backgroundUrl.startsWith('https')) {
            // It's a custom image/GIF URL
            body.style.backgroundImage = `url('${userData.backgroundUrl}')`;
            body.style.backgroundSize = 'cover';
            body.style.backgroundPosition = 'center';
            body.style.backgroundAttachment = 'fixed';
            body.style.backgroundRepeat = 'no-repeat';
        } else {
            // It's a Tailwind gradient class
            body.classList.add(userData.backgroundUrl);
            body.style.backgroundSize = ''; // Reset if previously custom image
            body.style.backgroundPosition = '';
            body.style.backgroundAttachment = '';
            body.style.backgroundRepeat = '';
        }
    } else {
        // Default background if no user data or no backgroundUrl
        body.classList.add('bg-gradient-to-r', 'from-blue-400', 'to-purple-600');
    }
}

/**
 * Extracts YouTube video ID from various YouTube URL formats.
 * @param {string} url - The YouTube video URL.
 * @returns {string|null} The YouTube video ID or null if not found.
 */
export function extractYouTubeVideoId(url) {
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regExp);
    return (match && match[1].length === 11) ? match[1] : null;
}

/**
 * Returns a visually enhanced role string.
 * @param {string} role - The user's role.
 * @returns {string} HTML string with styled role.
 */
export function getRoleVFX(role) {
    switch (role) {
        case 'founder':
            return `<span class="text-yellow-500 font-bold">Founder <i class="fas fa-crown"></i></span>`;
        case 'co-founder':
            return `<span class="text-orange-500 font-bold">Co-Founder <i class="fas fa-chess-queen"></i></span>`;
        case 'admin':
            return `<span class="text-red-500 font-bold">Admin <i class="fas fa-shield-alt"></i></span>`;
        case 'partner':
            return `<span class="text-indigo-500 font-bold">Partner <i class="fas fa-handshake"></i></span>`;
        case 'member':
        default:
            return `<span class="text-blue-500">Member <i class="fas fa-user"></i></span>`;
    }
}
