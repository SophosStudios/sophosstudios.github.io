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
        currentModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'message-modal';
    modal.className = 'fixed inset-0 bg-gray-900 bg-opacity-75 z-50 flex items-center justify-center p-4';
    
    let modalContent = `
        <div class="bg-gray-800 text-white p-6 rounded-lg shadow-xl max-w-sm w-full border-t-4 border-red-500 text-center animate-fade-in">
            <p class="text-lg font-semibold mb-4">${message}</p>
            <button id="modal-close-btn" class="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-red-500">
                OK
            </button>
        </div>
    `;

    if (type === 'confirm' && onConfirm) {
        modalContent = `
            <div class="bg-gray-800 text-white p-6 rounded-lg shadow-xl max-w-sm w-full border-t-4 border-red-500 text-center animate-fade-in">
                <p class="text-lg font-semibold mb-4">${message}</p>
                <div class="flex justify-center space-x-4">
                    <button id="modal-confirm-btn" class="bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-green-500">
                        Confirm
                    </button>
                    <button id="modal-cancel-btn" class="bg-gray-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-gray-500">
                        Cancel
                    </button>
                </div>
            </div>
        `;
    }

    modal.innerHTML = modalContent;
    document.body.appendChild(modal);
    currentModal = modal;

    if (type === 'confirm' && onConfirm) {
        document.getElementById('modal-confirm-btn').addEventListener('click', () => {
            onConfirm();
            modal.remove();
            currentModal = null;
        });
        document.getElementById('modal-cancel-btn').addEventListener('click', () => {
            modal.remove();
            currentModal = null;
        });
    } else {
        document.getElementById('modal-close-btn').addEventListener('click', () => {
            modal.remove();
            currentModal = null;
        });
    }
}

/**
 * Toggles a CSS class for a given element.
 * @param {HTMLElement} element - The DOM element.
 * @param {string} className - The class name to toggle.
 */
export function toggleClass(element, className) {
    if (element) {
        element.classList.toggle(className);
    }
}

/**
 * Updates the theme of the body based on a provided accent color.
 * @param {string} accentColor - A hex color code.
 */
export function updateTheme(accentColor) {
    document.documentElement.style.setProperty('--primary-color', accentColor);
    document.documentElement.style.setProperty('--primary-color-hover', accentColor);
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
            colorClass = 'text-white';
    }
    // Apply a subtle animation for all roles, or only privileged ones
    const animationClass = (role === 'admin' || role === 'founder') ? 'animate-pulse' : '';
    return `<span class="mr-1 ${animationClass}">${emoji}</span><span class="${colorClass} font-bold">${role.charAt(0).toUpperCase() + role.slice(1)}</span>`;
}
