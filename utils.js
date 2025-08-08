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
        spinner.innerHTML = `<div class="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-red-500"></div>`;
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
 * @param {string} type - 'info', 'error', 'confirm', 'success'.
 * @param {function} onConfirm - Callback for 'confirm' type.
 */
export function showMessageModal(message, type = 'info', onConfirm = null) {
    // Hide any existing modal first
    if (currentModal) {
        currentModal.remove();
        currentModal = null;
    }

    const modalContainer = document.getElementById('message-modal-container');
    const modalDiv = document.createElement('div');
    modalDiv.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]';
    modalDiv.innerHTML = `
        <div class="bg-gray-800 text-white p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 border-t-4 border-${type === 'error' ? 'red' : type === 'confirm' ? 'yellow' : 'blue'}-500 transform scale-95 transition-transform duration-200">
            <p class="text-center font-semibold text-lg mb-4">${message}</p>
            <div class="flex justify-end space-x-4">
                ${type === 'confirm' ? `<button id="cancel-btn" class="px-4 py-2 bg-gray-600 rounded-lg text-white font-bold hover:bg-gray-500">Cancel</button>` : ''}
                <button id="ok-btn" class="px-4 py-2 bg-red-600 rounded-lg text-white font-bold hover:bg-red-700">
                    ${type === 'confirm' ? 'Confirm' : 'OK'}
                </button>
            </div>
        </div>
    `;
    
    modalContainer.appendChild(modalDiv);
    currentModal = modalDiv;

    const okButton = modalDiv.querySelector('#ok-btn');
    okButton.addEventListener('click', () => {
        if (type === 'confirm' && onConfirm) {
            onConfirm();
        }
        currentModal.remove();
        currentModal = null;
    });

    if (type === 'confirm') {
        const cancelButton = modalDiv.querySelector('#cancel-btn');
        cancelButton.addEventListener('click', () => {
            currentModal.remove();
            currentModal = null;
        });
    }
}

/**
 * Updates the body's background image with a specific image URL.
 * @param {string} imageUrl - The URL of the image to set.
 */
export function updateBodyBackground(imageUrl) {
    document.body.style.backgroundImage = `url('${imageUrl}')`;
}

/**
 * Extracts a YouTube video ID from various YouTube URL formats.
 * @param {string} url - The YouTube URL.
 * @returns {string|null} The video ID, or null if not found.
 */
export function extractYouTubeVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
        return match[2];
    } else {
        return null;
    }
}

/**
 * Gets the VFX (emoji and color class) for a given role.
 * @param {string} role - The user's role.
 * @returns {string} HTML string with emoji and styled role text.
 */
export function getRoleVFX(role) {
    let emoji = '';
    let colorClass = 'text-white'; // Default color

    switch (role) {
        case 'member':
            emoji = '👤';
            colorClass = 'text-blue-600';
            break;
        case 'admin':
            emoji = '🛡️';
            colorClass = 'text-red-600';
            break;
        case 'founder':
            emoji = '✨';
            colorClass = 'text-purple-600';
            break;
        case 'co-founder':
            emoji = '🌟';
            colorClass = 'text-yellow-600';
            break;
        case 'partner':
            emoji = '🤝';
            colorClass = 'text-indigo-600';
            break;
        default:
            emoji = '';
            colorClass = 'text-white';
    }
    const animationClass = (role === 'admin' || role === 'founder' || role === 'co-founder') ? 'animate-pulse' : '';
    return `<span class="mr-1">${emoji}</span><span class="${colorClass} font-bold ${animationClass}">${role.toUpperCase()}</span>`;
}

