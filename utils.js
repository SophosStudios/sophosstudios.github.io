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
 * @param {string} type - 'info', 'error', 'success', or 'confirm'.
 * @param {function} onConfirm - Callback for 'confirm' type.
 */
export function showMessageModal(message, type = 'info', onConfirm = null) {
    const modalContainer = document.getElementById('modal-container');
    const modalId = 'message-modal';
    const existingModal = document.getElementById(modalId);
    if (existingModal) existingModal.remove();

    const modalHtml = `
        <div id="${modalId}" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full border-2 border-red-500">
                <p class="text-lg text-gray-200 mb-4">${message}</p>
                <div class="flex justify-end space-x-2">
                    ${type === 'confirm' ? `
                        <button id="modal-confirm-btn" class="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition">Confirm</button>
                    ` : ''}
                    <button id="modal-close-btn" class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition">Close</button>
                </div>
            </div>
        </div>
    `;
    modalContainer.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('modal-close-btn').addEventListener('click', () => document.getElementById(modalId).remove());
    if (type === 'confirm' && onConfirm) {
        document.getElementById('modal-confirm-btn').addEventListener('click', () => {
            onConfirm();
            document.getElementById(modalId).remove();
        });
    }
}

/**
 * Updates the website's theme with a new accent color.
 * @param {string} color - The new hex color for the accent.
 */
export function updateTheme(color) {
    const styleId = 'custom-theme-style';
    let style = document.getElementById(styleId);
    if (!style) {
        style = document.createElement('style');
        style.id = styleId;
        document.head.appendChild(style);
    }
    style.innerHTML = `
        .accent-red { background-color: ${color}; }
        .accent-red:hover { background-color: ${color}; opacity: 0.8; }
        ::-webkit-scrollbar-thumb { background: ${color}; }
        nav, .border-red-500 { border-color: ${color}; }
        .text-red-500 { color: ${color}; }
        .focus\\:ring-red-500:focus { --tw-ring-color: ${color}; }
        .bg-red-600 { background-color: ${color}; }
        .hover\\:bg-red-700:hover { background-color: ${color}; opacity: 0.8; }
        .text-red-400 { color: ${color}; opacity: 0.8; }
    `;
}
