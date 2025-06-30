// Firebase SDKs are imported in index.html via <script type="module">
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    signInAnonymously,
    signInWithCustomToken,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    query,
    onSnapshot,
    addDoc,
    deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Import configuration from config.js
import { FIREBASE_CONFIG, INITIAL_AUTH_TOKEN } from './config.js';

// --- Firebase Initialization and Global State ---

// This APP_ID is used for Firestore collection paths to ensure data isolation
// within the Canvas environment. It should be unique to this application.
const APP_ID = "coders-hub-app";

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

// Global state variables
let currentUser = null;
let userRole = 'member';
let userId = null;
let loadingAuth = true;
let currentUnsubscribe = null; // To manage Firestore snapshot listeners

// --- Utility Functions ---

/**
 * Shows a custom confirmation modal.
 * @param {string} message - The message to display in the modal.
 * @param {function} onConfirm - Callback function to execute if confirmed.
 * @param {function} [onCancel] - Optional callback function to execute if cancelled.
 */
function showCustomConfirm(message, onConfirm, onCancel) {
    const modalContainer = document.getElementById('custom-modal-container');
    modalContainer.innerHTML = `
        <div class="custom-modal-overlay">
            <div class="custom-modal-content">
                <h3>Confirm Action</h3>
                <p>${message}</p>
                <div class="custom-modal-buttons">
                    <button class="confirm-btn">Confirm</button>
                    <button class="cancel-btn">Cancel</button>
                </div>
            </div>
        </div>
    `;
    const modalOverlay = modalContainer.querySelector('.custom-modal-overlay');

    modalContainer.querySelector('.confirm-btn').onclick = () => {
        onConfirm();
        modalContainer.innerHTML = ''; // Clear modal
    };
    modalContainer.querySelector('.cancel-btn').onclick = () => {
        if (onCancel) onCancel();
        modalContainer.innerHTML = ''; // Clear modal
    };
    // Allow clicking outside to cancel
    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) {
            if (onCancel) onCancel();
            modalContainer.innerHTML = '';
        }
    };
}

/**
 * Creates a sparkle effect on the given element.
 * @param {HTMLElement} element - The DOM element to apply sparkles to.
 * @param {string} role - The user's role to determine if sparkles should show.
 */
function createSparkleEffect(element, role) {
    if (!element) return;

    // Clear existing sparkles if any
    element.querySelectorAll('.sparkle-container').forEach(el => el.remove());

    if (role === 'admin' || role === 'premium') {
        const sparkleContainer = document.createElement('div');
        sparkleContainer.className = 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none overflow-hidden sparkle-container';
        element.style.position = 'relative'; // Ensure parent is positioned for absolute children

        for (let i = 0; i < 5; i++) {
            const sparkle = document.createElement('span');
            sparkle.className = 'absolute bg-yellow-300 rounded-full opacity-0 animate-sparkle';
            sparkle.style.width = `${Math.random() * 8 + 2}px`;
            sparkle.style.height = `${Math.random() * 8 + 2}px`;
            sparkle.style.top = `${Math.random() * 100}%`;
            sparkle.style.left = `${Math.random() * 100}%`;
            sparkle.style.animationDelay = `${Math.random() * 0.5}s`;
            sparkleContainer.appendChild(sparkle);
        }
        element.appendChild(sparkleContainer);
    }
}

/**
 * Handles page navigation with a fade animation and closes the mobile menu.
 * @param {string} page - The name of the page to navigate to.
 */
function navigateTo(page) {
    const appContent = document.getElementById('app-content');
    if (appContent.classList.contains('fade-in-page')) {
        appContent.classList.remove('fade-in-page');
    }
    appContent.classList.add('fade-out-page'); // Start fade-out animation

    // Close mobile menu if open
    const navLinksContainer = document.getElementById('nav-links-container');
    if (navLinksContainer.classList.contains('flex')) {
        navLinksContainer.classList.remove('flex');
        navLinksContainer.classList.add('hidden');
    }

    // Wait for animation to complete before changing content
    setTimeout(() => {
        currentPage = page;
        renderPage();
        appContent.classList.remove('fade-out-page');
        appContent.classList.add('fade-in-page'); // Start fade-in animation
    }, 300); // Match CSS animation duration
}

/**
 * Renders the current page content based on the global `currentPage` variable.
 */
function renderPage() {
    // Unsubscribe from previous page's Firestore listener if exists
    if (currentUnsubscribe) {
        currentUnsubscribe();
        currentUnsubscribe = null;
    }

    const appContent = document.getElementById('app-content');
    appContent.innerHTML = ''; // Clear current content

    switch (currentPage) {
        case 'home':
            renderHomePage();
            break;
        case 'auth':
            renderAuthPage();
            break;
        case 'projects':
            renderProjectsPage();
            break;
        case 'forum':
            renderForumPage();
            break;
        case 'shop':
            renderShopPage();
            break;
        case 'admin':
            renderAdminPage();
            break;
        case 'profile':
            renderProfilePage();
            break;
        default:
            renderHomePage();
    }
}

/**
 * Updates the navigation bar's authentication status (Login/Signup, Profile, Logout).
 */
function renderAuthStatus() {
    const navAuthStatus = document.getElementById('nav-auth-status');
    const navAdminLi = document.getElementById('nav-admin-li');

    navAuthStatus.innerHTML = ''; // Clear previous content

    if (currentUser) {
        navAuthStatus.innerHTML = `
            <li>
                <button id="nav-profile" class="nav-btn hover:text-green-300">
                    Profile
                </button>
            </li>
            <li>
                <button id="nav-logout" class="btn-red py-1 px-3">
                    Logout
                </button>
            </li>
        `;
        document.getElementById('nav-profile').onclick = () => navigateTo('profile');
        document.getElementById('nav-logout').onclick = handleLogout;
    } else {
        navAuthStatus.innerHTML = `
            <li>
                <button id="nav-auth" class="btn-primary py-1 px-3">
                    Login / Signup
                </button>
            </li>
        `;
        document.getElementById('nav-auth').onclick = () => navigateTo('auth');
    }

    if (userRole === 'admin') {
        navAdminLi.classList.remove('hidden');
    } else {
        navAdminLi.classList.add('hidden');
    }
}

/**
 * Handles user logout.
 */
async function handleLogout() {
    try {
        await signOut(auth);
        navigateTo('home');
    } catch (error) {
        console.error("Logout error:", error);
    }
}

// --- Page Rendering Functions ---

function renderHomePage() {
    const appContent = document.getElementById('app-content');
    appContent.innerHTML = `
        <div class="p-8 max-w-4xl mx-auto bg-gray-800 rounded-xl shadow-2xl text-white border border-blue-700">
            <h2 class="text-4xl font-pixel mb-6 text-center text-blue-400">Welcome to Coders Hub!</h2>
            <div id="home-greeting" class="text-center"></div>
            <div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="home-feature-card">
                    <h3 class="text-2xl font-semibold mb-3 text-yellow-300">Share Your Code</h3>
                    <p class="text-gray-300">Upload your amazing coding projects for others to learn from and use. Get feedback and collaborate!</p>
                </div>
                <div class="home-feature-card">
                    <h3 class="text-2xl font-semibold mb-3 text-green-300">Community Forums</h3>
                    <p class="text-gray-300">Join discussions, ask questions, and share updates with fellow coders in our vibrant community.</p>
                </div>
                <div class="home-feature-card">
                    <h3 class="text-2xl font-semibold mb-3 text-red-300">Exclusive Ranks</h3>
                    <p class="text-gray-300">Visit the shop to unlock special website ranks and gain unique perks, linked directly to our Discord server!</p>
                </div>
                <div class="home-feature-card">
                    <h3 class="text-2xl font-semibold mb-3 text-indigo-300">Admin Tools</h3>
                    <p class="text-gray-300">For our dedicated administrators, powerful tools to manage users and ensure a safe and productive environment.</p>
                </div>
            </div>
        </div>
    `;

    const homeGreeting = document.getElementById('home-greeting');
    if (currentUser) {
        homeGreeting.innerHTML = `
            <p class="text-xl mb-4">
                Hello, <span id="user-email-sparkle" class="font-semibold text-green-400">${currentUser.email}</span>!
            </p>
            <p class="text-lg mb-4">Your current role is: <span class="font-bold text-purple-400">${userRole.toUpperCase()}</span></p>
            <p class="text-sm text-gray-400">Your User ID: ${userId}</p>
            <p class="mt-6 text-lg">Explore coding projects, join the forums, and enhance your profile!</p>
        `;
        createSparkleEffect(document.getElementById('user-email-sparkle'), userRole);
    } else {
        homeGreeting.innerHTML = `<p class="text-xl text-center">Please sign up or log in to access all features.</p>`;
    }
}

function renderAuthPage() {
    const appContent = document.getElementById('app-content');
    appContent.innerHTML = `
        <div class="p-8 max-w-md mx-auto bg-gray-800 rounded-xl shadow-2xl text-white border border-blue-700">
            <h2 id="auth-title" class="text-3xl font-pixel mb-6 text-center text-blue-400">Login</h2>
            <form id="auth-form" class="space-y-4">
                <div>
                    <label class="block text-gray-300 text-sm font-bold mb-2" for="email">Email</label>
                    <input type="email" id="email" class="input-field" required />
                </div>
                <div>
                    <label class="block text-gray-300 text-sm font-bold mb-2" for="password">Password</label>
                    <input type="password" id="password" class="input-field" required />
                </div>
                <p id="auth-error" class="text-red-500 text-xs italic"></p>
                <p id="auth-message" class="text-green-500 text-xs italic"></p>
                <button type="submit" id="auth-submit-btn" class="btn-primary w-full">Login</button>
            </form>
            <p class="mt-4 text-center text-gray-400">
                <span id="auth-toggle-text">Don't have an account?</span>
                <button id="auth-toggle-btn" class="text-blue-400 hover:text-blue-300 font-semibold transition-colors duration-200">Sign Up</button>
            </p>
        </div>
    `;

    const authTitle = document.getElementById('auth-title');
    const authForm = document.getElementById('auth-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const authError = document.getElementById('auth-error');
    const authMessage = document.getElementById('auth-message');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authToggleText = document.getElementById('auth-toggle-text');
    const authToggleBtn = document.getElementById('auth-toggle-btn');

    let isLogin = true;

    const handleSubmit = async (e) => {
        e.preventDefault();
        authError.textContent = '';
        authMessage.textContent = '';
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
                authMessage.textContent = 'Logged in successfully!';
                navigateTo('home');
            } else {
                await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
                authMessage.textContent = 'Account created successfully! Please log in.';
                isLogin = true;
                updateAuthForm();
            }
        } catch (err) {
            console.error("Auth error:", err);
            authError.textContent = err.message;
        }
    };

    const updateAuthForm = () => {
        authTitle.textContent = isLogin ? 'Login' : 'Sign Up';
        authSubmitBtn.textContent = isLogin ? 'Login' : 'Sign Up';
        authToggleText.textContent = isLogin ? "Don't have an account?" : "Already have an account?";
        authToggleBtn.textContent = isLogin ? 'Sign Up' : 'Login';
    };

    authForm.onsubmit = handleSubmit;
    authToggleBtn.onclick = () => {
        isLogin = !isLogin;
        updateAuthForm();
    };

    updateAuthForm(); // Initial render
}

function renderProjectsPage() {
    const appContent = document.getElementById('app-content');
    appContent.innerHTML = `
        <div class="p-8 max-w-5xl mx-auto bg-gray-800 rounded-xl shadow-2xl text-white border border-blue-700">
            <h2 class="text-4xl font-pixel mb-8 text-center text-blue-400">Coding Projects</h2>

            <div id="project-upload-section"></div>

            <h3 class="text-3xl font-pixel mb-6 text-yellow-300">Browse Projects</h3>
            <div id="projects-list" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <p class="text-center text-gray-400 col-span-full">Loading projects...</p>
            </div>
        </div>
    `;

    const projectUploadSection = document.getElementById('project-upload-section');
    const projectsList = document.getElementById('projects-list');
    const projectError = document.createElement('p');
    projectError.id = 'project-error';
    projectError.className = 'text-red-500 text-xs italic';
    const projectMessage = document.createElement('p');
    projectMessage.id = 'project-message';
    projectMessage.className = 'text-green-500 text-xs italic';

    if (currentUser) {
        projectUploadSection.innerHTML = `
            <div class="mb-12 card">
                <h3 class="text-2xl font-semibold mb-4 text-green-300">Upload Your Project</h3>
                <form id="add-project-form" class="space-y-4">
                    <div>
                        <label class="block text-gray-300 text-sm font-bold mb-2">Game/Category</label>
                        <input type="text" id="new-project-game" class="input-field" placeholder="e.g., Platformer, Web App, Utility" required />
                    </div>
                    <div>
                        <label class="block text-gray-300 text-sm font-bold mb-2">Project Name</label>
                        <input type="text" id="new-project-name" class="input-field" placeholder="e.g., My Awesome Game, Simple Calculator" required />
                    </div>
                    <div>
                        <label class="block text-gray-300 text-sm font-bold mb-2">Description</label>
                        <textarea id="new-project-description" class="input-field h-24" placeholder="Briefly describe your project and its features." required></textarea>
                    </div>
                    <div>
                        <label class="block text-gray-300 text-sm font-bold mb-2">Code</label>
                        <textarea id="new-project-code" class="input-field h-48 font-mono" placeholder="Paste your code here..." required></textarea>
                    </div>
                    <div id="project-form-messages"></div>
                    <button type="submit" class="btn-secondary w-full">Add Project</button>
                </form>
            </div>
        `;
        const addProjectForm = document.getElementById('add-project-form');
        const newProjectGame = document.getElementById('new-project-game');
        const newProjectName = document.getElementById('new-project-name');
        const newProjectDescription = document.getElementById('new-project-description');
        const newProjectCode = document.getElementById('new-project-code');
        const projectFormMessages = document.getElementById('project-form-messages');
        projectFormMessages.appendChild(projectError);
        projectFormMessages.appendChild(projectMessage);

        addProjectForm.onsubmit = async (e) => {
            e.preventDefault();
            projectError.textContent = '';
            projectMessage.textContent = '';
            if (!currentUser) {
                projectError.textContent = "You must be logged in to add a project.";
                return;
            }
            if (!newProjectGame.value || !newProjectName.value || !newProjectDescription.value || !newProjectCode.value) {
                projectError.textContent = "Please fill in all fields.";
                return;
            }

            try {
                await addDoc(collection(db, `artifacts/${APP_ID}/public/data/projects`), {
                    game: newProjectGame.value,
                    name: newProjectName.value,
                    description: newProjectDescription.value,
                    code: newProjectCode.value,
                    userId: currentUser.uid,
                    userName: currentUser.email,
                    createdAt: new Date().toISOString(),
                });
                projectMessage.textContent = 'Project added successfully!';
                newProjectGame.value = '';
                newProjectName.value = '';
                newProjectDescription.value = '';
                newProjectCode.value = '';
            } catch (err) {
                console.error("Error adding project:", err);
                projectError.textContent = "Failed to add project.";
            }
        };
    } else {
        projectUploadSection.innerHTML = ''; // Hide upload section if not logged in
    }

    // Real-time listener for projects
    const projectsColRef = collection(db, `artifacts/${APP_ID}/public/data/projects`);
    const q = query(projectsColRef);

    currentUnsubscribe = onSnapshot(q, (snapshot) => {
        const projectsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (projectsData.length === 0) {
            projectsList.innerHTML = `<p class="text-center text-gray-400 col-span-full">No projects uploaded yet. Be the first to share!</p>`;
        } else {
            projectsList.innerHTML = projectsData.map(project => `
                <div class="project-card">
                    <h4 class="text-xl font-semibold mb-2 text-blue-300">${project.name}</h4>
                    <p class="text-sm text-gray-400 mb-1">Category: <span class="font-medium">${project.game}</span></p>
                    <p class="text-sm text-gray-400 mb-3">By: <span class="font-medium">${project.userName}</span></p>
                    <p class="text-gray-300 text-sm mb-4 flex-grow">${project.description}</p>
                    <button data-code="${encodeURIComponent(project.code)}" class="copy-code-btn btn-green mt-auto">
                        Copy Code
                    </button>
                </div>
            `).join('');

            document.querySelectorAll('.copy-code-btn').forEach(button => {
                button.onclick = (e) => {
                    const code = decodeURIComponent(e.target.dataset.code);
                    const textarea = document.createElement('textarea');
                    textarea.value = code;
                    document.body.appendChild(textarea);
                    textarea.select();
                    try {
                        document.execCommand('copy');
                        alert('Code copied to clipboard!'); // Using alert for simplicity in standalone HTML
                    } catch (err) {
                        console.error('Failed to copy code:', err);
                        alert('Failed to copy code. Please copy manually.');
                    }
                    document.body.removeChild(textarea);
                };
            });
        }
    }, (err) => {
        console.error("Error fetching projects:", err);
        projectsList.innerHTML = `<p class="text-red-500 text-center col-span-full">Failed to load projects.</p>`;
    });
}

function renderForumPage() {
    const appContent = document.getElementById('app-content');
    appContent.innerHTML = `
        <div class="p-8 max-w-4xl mx-auto bg-gray-800 rounded-xl shadow-2xl text-white border border-blue-700">
            <h2 class="text-4xl font-pixel mb-8 text-center text-blue-400">Community Forums</h2>

            <div id="forum-post-section"></div>

            <h3 class="text-3xl font-pixel mb-6 text-yellow-300">Recent Discussions</h3>
            <div id="forum-posts-list" class="space-y-6">
                <p class="text-center text-gray-400">Loading forum posts...</p>
            </div>
        </div>
    `;

    const forumPostSection = document.getElementById('forum-post-section');
    const forumPostsList = document.getElementById('forum-posts-list');
    const forumError = document.createElement('p');
    forumError.id = 'forum-error';
    forumError.className = 'text-red-500 text-xs italic';
    const forumMessage = document.createElement('p');
    forumMessage.id = 'forum-message';
    forumMessage.className = 'text-green-500 text-xs italic';

    if (currentUser) {
        forumPostSection.innerHTML = `
            <div class="mb-12 card">
                <h3 class="text-2xl font-semibold mb-4 text-green-300">Create New Post</h3>
                <form id="add-post-form" class="space-y-4">
                    <div>
                        <label class="block text-gray-300 text-sm font-bold mb-2">Title</label>
                        <input type="text" id="new-post-title" class="input-field" required />
                    </div>
                    <div>
                        <label class="block text-gray-300 text-sm font-bold mb-2">Content</label>
                        <textarea id="new-post-content" class="input-field h-32" required></textarea>
                    </div>
                    <div id="forum-form-messages"></div>
                    <button type="submit" class="btn-secondary w-full">Publish Post</button>
                </form>
            </div>
        `;
        const addPostForm = document.getElementById('add-post-form');
        const newPostTitle = document.getElementById('new-post-title');
        const newPostContent = document.getElementById('new-post-content');
        const forumFormMessages = document.getElementById('forum-form-messages');
        forumFormMessages.appendChild(forumError);
        forumFormMessages.appendChild(forumMessage);

        addPostForm.onsubmit = async (e) => {
            e.preventDefault();
            forumError.textContent = '';
            forumMessage.textContent = '';
            if (!currentUser) {
                forumError.textContent = "You must be logged in to create a post.";
                return;
            }
            if (!newPostTitle.value || !newPostContent.value) {
                forumError.textContent = "Please fill in both title and content.";
                return;
            }

            try {
                await addDoc(collection(db, `artifacts/${APP_ID}/public/data/forumPosts`), {
                    title: newPostTitle.value,
                    content: newPostContent.value,
                    userId: currentUser.uid,
                    userName: currentUser.email,
                    createdAt: new Date().toISOString(),
                });
                forumMessage.textContent = 'Post added successfully!';
                newPostTitle.value = '';
                newPostContent.value = '';
            } catch (err) {
                console.error("Error adding post:", err);
                forumError.textContent = "Failed to add post.";
            }
        };
    } else {
        forumPostSection.innerHTML = ''; // Hide post section if not logged in
    }

    // Real-time listener for forum posts
    const postsColRef = collection(db, `artifacts/${APP_ID}/public/data/forumPosts`);
    const q = query(postsColRef);

    currentUnsubscribe = onSnapshot(q, (snapshot) => {
        const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        postsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort by createdAt descending

        if (postsData.length === 0) {
            forumPostsList.innerHTML = `<p class="text-center text-gray-400">No forum posts yet. Start a discussion!</p>`;
        } else {
            forumPostsList.innerHTML = postsData.map(post => `
                <div class="forum-post-card">
                    <h4 class="text-xl font-semibold mb-2 text-blue-300">${post.title}</h4>
                    <p class="text-sm text-gray-400 mb-1">By: <span class="font-medium">${post.userName}</span> on ${new Date(post.createdAt).toLocaleString()}</p>
                    <p class="text-gray-300 text-base">${post.content}</p>
                </div>
            `).join('');
        }
    }, (err) => {
        console.error("Error fetching forum posts:", err);
        forumPostsList.innerHTML = `<p class="text-red-500 text-center">Failed to load forum posts.</p>`;
    });
}

function renderShopPage() {
    const appContent = document.getElementById('app-content');
    appContent.innerHTML = `
        <div class="p-8 max-w-4xl mx-auto bg-gray-800 rounded-xl shadow-2xl text-white border border-blue-700">
            <h2 class="text-4xl font-pixel mb-8 text-center text-blue-400">Coders Hub Shop</h2>
            <p class="text-lg text-center text-gray-300 mb-8">
                Elevate your status in the community! Purchase exclusive ranks that will also sync with our Discord server.
            </p>
            <p id="shop-error" class="text-red-500 text-center mb-4"></p>
            <p id="shop-message" class="text-green-500 text-center mb-4"></p>

            <div id="shop-ranks-grid" class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Ranks will be inserted here -->
            </div>

            <div class="mt-12 card">
                <h3 class="text-2xl font-semibold mb-4 text-purple-300">Discord Integration Note</h3>
                <p class="text-gray-300">
                    For ranks to automatically update your Discord server role and for the bot to message you,
                    a dedicated backend server is required to securely handle payments and communicate with the Discord API.
                    This front-end provides the interface, but the actual transaction and Discord actions would happen server-side.
                </p>
            </div>
        </div>
    `;

    const shopError = document.getElementById('shop-error');
    const shopMessage = document.getElementById('shop-message');
    const shopRanksGrid = document.getElementById('shop-ranks-grid');

    const ranks = [
        { id: 'dev', name: 'Developer Rank', price: '100 Coins', description: 'Show off your coding prowess!' },
        { id: 'pro', name: 'Pro Coder Rank', price: '250 Coins', description: 'Unlock advanced forum features and badges.' },
        { id: 'elite', name: 'Elite Coder Rank', price: '500 Coins', description: 'Gain exclusive access and special Discord role.' },
    ];

    shopRanksGrid.innerHTML = ranks.map(rank => `
        <div class="shop-rank-card">
            <h3 class="text-2xl font-semibold mb-2 text-yellow-300">${rank.name}</h3>
            <p class="text-xl font-bold text-green-400 mb-3">${rank.price}</p>
            <p class="text-gray-300 mb-4 flex-grow">${rank.description}</p>
            <button data-rank-id="${rank.id}" data-rank-name="${rank.name}" class="purchase-btn btn-primary mt-auto">
                Purchase
            </button>
        </div>
    `).join('');

    document.querySelectorAll('.purchase-btn').forEach(button => {
        button.onclick = (e) => {
            if (!currentUser) {
                shopError.textContent = "You must be logged in to make a purchase.";
                return;
            }
            shopMessage.textContent = '';
            shopError.textContent = '';

            const rankId = e.target.dataset.rankId;
            const rankName = e.target.dataset.rankName;

            shopMessage.textContent = `Attempting to purchase "${rankName}" (ID: ${rankId}). This would trigger a payment process and Discord bot interaction on a real backend.`;
            console.log(`User ${currentUser.email} attempting to purchase ${rankName}`);
        };
    });
}

function renderAdminPage() {
    const appContent = document.getElementById('app-content');
    if (userRole !== 'admin') {
        appContent.innerHTML = `
            <div class="p-8 max-w-4xl mx-auto bg-gray-800 rounded-xl shadow-2xl text-white text-center border border-red-700">
                <h2 class="text-4xl font-pixel mb-6 text-red-400">Access Denied</h2>
                <p class="text-xl text-gray-300">You do not have administrative privileges to view this page.</p>
                <p id="admin-error" class="text-red-500 mt-4"></p>
            </div>
        `;
        document.getElementById('admin-error').textContent = "Access Denied: You must be an administrator to view this page.";
        return;
    }

    appContent.innerHTML = `
        <div class="p-8 max-w-6xl mx-auto bg-gray-800 rounded-xl shadow-2xl text-white border border-blue-700">
            <h2 class="text-4xl font-pixel mb-8 text-center text-red-400">Admin Panel</h2>
            <p class="text-lg text-center text-gray-300 mb-8">
                Manage users, roles, and content across the Coders Hub.
            </p>

            <p id="admin-error" class="text-red-500 text-center mb-4"></p>
            <p id="admin-message" class="text-green-500 text-center mb-4"></p>

            <div class="card mb-8">
                <h3 class="text-2xl font-semibold mb-4 text-orange-300">User Management</h3>
                <div id="users-table-container" class="overflow-x-auto">
                    <p class="text-center text-gray-400">Loading users...</p>
                </div>
            </div>

            <div class="card">
                <h3 class="text-2xl font-semibold mb-4 text-purple-300">Bot Customization (Conceptual)</h3>
                <p class="text-gray-300 mb-4">
                    This section would allow administrators to configure settings for the Discord bot,
                    such as welcome messages, automated responses, or rank names.
                    These settings would be stored in Firestore and read by your Discord bot.
                </p>
                <form class="space-y-4">
                    <div>
                        <label class="block text-gray-300 text-sm font-bold mb-2">Welcome Message</label>
                        <textarea class="input-field h-24" placeholder="e.g., Welcome to Coders Hub, {username}! Enjoy your stay."></textarea>
                    </div>
                    <div>
                        <label class="block text-gray-300 text-sm font-bold mb-2">Default Role on Join</label>
                        <input type="text" class="input-field" placeholder="e.g., Member" />
                    </div>
                    <button type="button" class="btn-primary w-full">
                        Save Bot Settings (Requires Backend)
                    </button>
                </form>
            </div>
        </div>
    `;

    const adminError = document.getElementById('admin-error');
    const adminMessage = document.getElementById('admin-message');
    const usersTableContainer = document.getElementById('users-table-container');

    const usersColRef = collection(db, `artifacts/${APP_ID}/users`);

    currentUnsubscribe = onSnapshot(usersColRef, async (snapshot) => {
        const usersList = [];
        for (const userDoc of snapshot.docs) {
            const profileDocRef = doc(db, `artifacts/${APP_ID}/users/${userDoc.id}/profile`, 'data');
            try {
                const profileSnap = await getDoc(profileDocRef);
                if (profileSnap.exists()) {
                    usersList.push({ id: userDoc.id, ...profileSnap.data() });
                } else {
                    usersList.push({ id: userDoc.id, email: userDoc.id, role: 'unknown' });
                }
            } catch (err) {
                console.error("Error fetching user profile:", err);
                usersList.push({ id: userDoc.id, email: userDoc.id, role: 'error' });
            }
        }
        renderUsersTable(usersList);
    }, (err) => {
        console.error("Error fetching users for admin:", err);
        adminError.textContent = "Failed to load user list.";
    });

    function renderUsersTable(users) {
        if (users.length === 0) {
            usersTableContainer.innerHTML = `<p class="text-center text-gray-400">No users found.</p>`;
            return;
        }

        usersTableContainer.innerHTML = `
            <table class="min-w-full divide-y divide-gray-600 rounded-lg overflow-hidden">
                <thead class="admin-table-header">
                    <tr>
                        <th scope="col" class="admin-table-cell-header">
                            User ID
                        </th>
                        <th scope="col" class="admin-table-cell-header">
                            Email
                        </th>
                        <th scope="col" class="admin-table-cell-header">
                            Role
                        </th>
                        <th scope="col" class="admin-table-cell-header">
                            Discord ID
                        </th>
                        <th scope="col" class="admin-table-cell-header">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody class="admin-table-row" id="users-table-body">
                    <!-- User rows will be inserted here -->
                </tbody>
            </table>
        `;

        const usersTableBody = document.getElementById('users-table-body');
        usersTableBody.innerHTML = users.map(user => `
            <tr data-user-id="${user.id}">
                <td class="admin-table-cell font-medium">${user.id}</td>
                <td class="admin-table-cell">${user.email || 'N/A'}</td>
                <td class="admin-table-cell">
                    <select class="role-select input-field py-1 px-2 text-white sm:text-sm" ${user.id === currentUser.uid ? 'disabled' : ''}>
                        <option value="member" ${user.role === 'member' ? 'selected' : ''}>Member</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        <option value="banned" ${user.role === 'banned' ? 'selected' : ''}>Banned</option>
                        <option value="premium" ${user.role === 'premium' ? 'selected' : ''}>Premium</option>
                    </select>
                </td>
                <td class="admin-table-cell">${user.discordId || 'N/A'}</td>
                <td class="admin-table-cell font-medium">
                    <button data-user-id="${user.id}" class="delete-profile-btn btn-red text-xs py-1 px-2 mr-2 disabled:opacity-50 disabled:cursor-not-allowed" ${user.id === currentUser.uid ? 'disabled' : ''}>
                        Delete Profile
                    </button>
                    <span class="text-gray-500 text-xs">(More actions require backend)</span>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('.role-select').forEach(select => {
            select.onchange = async (e) => {
                const targetUserId = e.target.closest('tr').dataset.userId;
                const newRole = e.target.value;
                adminError.textContent = '';
                adminMessage.textContent = '';
                if (userRole !== 'admin') {
                    adminError.textContent = "Permission Denied: Only administrators can change roles.";
                    return;
                }
                if (targetUserId === currentUser.uid) {
                    adminError.textContent = "You cannot change your own role.";
                    return;
                }

                try {
                    const userDocRef = doc(db, `artifacts/${APP_ID}/users/${targetUserId}/profile`, 'data');
                    await updateDoc(userDocRef, { role: newRole });
                    adminMessage.textContent = `Role for user ${targetUserId} updated to ${newRole}.`;
                } catch (err) {
                    console.error("Error changing user role:", err);
                    adminError.textContent = `Failed to change role for user ${targetUserId}.`;
                }
            };
        });

        document.querySelectorAll('.delete-profile-btn').forEach(button => {
            button.onclick = (e) => {
                const targetUserId = e.target.dataset.userId;
                adminError.textContent = '';
                adminMessage.textContent = '';
                if (userRole !== 'admin') {
                    adminError.textContent = "Permission Denied: Only administrators can delete accounts.";
                    return;
                }
                if (targetUserId === currentUser.uid) {
                    adminError.textContent = "You cannot delete your own account from here.";
                    return;
                }

                showCustomConfirm(`Are you sure you want to delete the profile data for user ${targetUserId}? This cannot be undone.`, async () => {
                    try {
                        const userProfileDocRef = doc(db, `artifacts/${APP_ID}/users/${targetUserId}/profile`, 'data');
                        await deleteDoc(userProfileDocRef);
                        adminMessage.textContent = `Profile data for user ${targetUserId} deleted.`;
                    } catch (err) {
                        console.error("Error deleting user profile:", err);
                        adminError.textContent = `Failed to delete profile for user ${targetUserId}.`;
                    }
                });
            };
        });
    }
}

function renderProfilePage() {
    const appContent = document.getElementById('app-content');
    if (!currentUser) {
        appContent.innerHTML = `
            <div class="p-8 max-w-4xl mx-auto bg-gray-800 rounded-xl shadow-2xl text-white text-center border border-blue-700">
                <h2 class="text-4xl font-pixel mb-6 text-blue-400">Profile</h2>
                <p class="text-xl text-gray-300">Please log in to view your profile.</p>
                <p id="profile-error" class="text-red-500 mt-4"></p>
            </div>
        `;
        return;
    }

    appContent.innerHTML = `
        <div class="p-8 max-w-4xl mx-auto bg-gray-800 rounded-xl shadow-2xl text-white border border-blue-700">
            <h2 class="text-4xl font-pixel mb-8 text-center text-blue-400">Your Profile</h2>

            <p id="profile-error" class="text-red-500 text-center mb-4"></p>
            <p id="profile-message" class="text-green-500 text-center mb-4"></p>

            <div class="card">
                <h3 class="text-2xl font-semibold mb-4 text-yellow-300">Account Information</h3>
                <p class="mb-2"><span class="font-semibold text-gray-300">Email:</span> <span id="profile-email"></span></p>
                <p class="mb-2"><span class="font-semibold text-gray-300">Role:</span> <span id="profile-role" class="font-bold text-purple-400"></span></p>
                <p class="mb-2"><span class="font-semibold text-gray-300">User ID:</span> <span id="profile-userid"></span></p>
                <p class="mb-2"><span class="font-semibold text-gray-300">Joined:</span> <span id="profile-joined"></span></p>
                <p class="mb-4"><span class="font-semibold text-gray-300">Last Login:</span> <span id="profile-lastlogin"></span></p>

                <h3 class="text-2xl font-semibold mb-4 text-green-300">Discord Link</h3>
                <div id="discord-link-section"></div>
            </div>

            <div class="mt-8 card">
                <h3 class="text-2xl font-semibold mb-4 text-red-300">Account Actions</h3>
                <button id="delete-my-account-btn" class="btn-red w-full">
                    Delete My Account (Removes Profile Data)
                </button>
            </div>
        </div>
    `;

    const profileError = document.getElementById('profile-error');
    const profileMessage = document.getElementById('profile-message');
    const discordLinkSection = document.getElementById('discord-link-section');
    const deleteMyAccountBtn = document.getElementById('delete-my-account-btn');

    let profileData = null;
    let editMode = false;
    let discordIdInput = '';

    const profileDocRef = doc(db, `artifacts/${APP_ID}/users/${userId}/profile`, 'data');
    currentUnsubscribe = onSnapshot(profileDocRef, (docSnap) => {
        if (docSnap.exists()) {
            profileData = docSnap.data();
            discordIdInput = profileData.discordId || '';
            updateProfileUI();
        } else {
            console.log("No profile data found for current user.");
            profileData = null;
            profileError.textContent = "No profile data found. Please try logging out and in again.";
        }
    }, (err) => {
        console.error("Error fetching profile:", err);
        profileError.textContent = "Failed to load profile data.";
    });

    function updateProfileUI() {
        if (!profileData) return;

        document.getElementById('profile-email').textContent = profileData.email;
        document.getElementById('profile-role').textContent = userRole.toUpperCase();
        createSparkleEffect(document.getElementById('profile-role'), userRole);
        document.getElementById('profile-userid').textContent = userId;
        document.getElementById('profile-joined').textContent = new Date(profileData.createdAt).toLocaleDateString();
        document.getElementById('profile-lastlogin').textContent = new Date(profileData.lastLogin).toLocaleString();

        if (editMode) {
            discordLinkSection.innerHTML = `
                <form id="update-profile-form" class="space-y-4">
                    <div>
                        <label class="block text-gray-300 text-sm font-bold mb-2" for="discordId">
                            Discord Username/ID
                        </label>
                        <input type="text" id="discordId" value="${discordIdInput}" class="input-field" placeholder="e.g., YourDiscordName#1234 or your_discord_id" />
                    </div>
                    <div class="flex space-x-4">
                        <button type="submit" class="btn-primary flex-1">
                            Save Changes
                        </button>
                        <button type="button" id="cancel-edit-btn" class="btn-gray flex-1">
                            Cancel
                        </button>
                    </div>
                </form>
            `;
            document.getElementById('discordId').oninput = (e) => discordIdInput = e.target.value;
            document.getElementById('update-profile-form').onsubmit = handleUpdateProfile;
            document.getElementById('cancel-edit-btn').onclick = () => {
                editMode = false;
                updateProfileUI();
            };
        } else {
            discordLinkSection.innerHTML = `
                <p class="mb-4"><span class="font-semibold text-gray-300">Linked Discord:</span> ${profileData.discordId || 'Not linked'}</p>
                <button id="edit-discord-btn" class="btn-secondary">
                    Link/Edit Discord
                </button>
            `;
            document.getElementById('edit-discord-btn').onclick = () => {
                editMode = true;
                updateProfileUI();
            };
        }
    }

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        if (!currentUser || !userId) return;

        profileMessage.textContent = '';
        profileError.textContent = '';
        try {
            const profileDocRef = doc(db, `artifacts/${APP_ID}/users/${userId}/profile`, 'data');
            await updateDoc(profileDocRef, {
                discordId: discordIdInput,
            });
            profileMessage.textContent = 'Profile updated successfully!';
            editMode = false;
            updateProfileUI();
        } catch (err) {
            console.error("Error updating profile:", err);
            profileError.textContent = "Failed to update profile.";
        }
    };

    deleteMyAccountBtn.onclick = () => {
        showCustomConfirm("Are you sure you want to delete your account? This action is irreversible and will remove all your data.", async () => {
            try {
                const profileDocRef = doc(db, `artifacts/${APP_ID}/users/${userId}/profile`, 'data');
                await deleteDoc(profileDocRef);
                await signOut(auth);
                profileMessage.textContent = 'Your profile data has been deleted and you have been logged out. For full account deletion, please contact support.';
                navigateTo('home');
            } catch (err) {
                console.error("Error deleting account:", err);
                profileError.textContent = "Failed to delete account. Please try again or contact support.";
            }
        });
    };
}

// --- Main Application Logic ---
let currentPage = 'home';

// Initial Firebase Auth Listener
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        userId = user.uid;
        const userDocRef = doc(db, `artifacts/${APP_ID}/users/${userId}/profile`, 'data');
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            userRole = userData.role || 'member';
            await updateDoc(userDocRef, { lastLogin: new Date().toISOString() });
        } else {
            await setDoc(userDocRef, {
                email: user.email,
                role: 'member',
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                discordId: '',
            });
            userRole = 'member';
        }
    } else {
        userId = null;
        userRole = 'member';
    }
    loadingAuth = false;
    renderAuthStatus();
    renderPage(); // Render the current page once auth is ready
});

// Sign in with custom token or anonymously on load
async function initialSignIn() {
    try {
        if (INITIAL_AUTH_TOKEN) {
            await signInWithCustomToken(auth, INITIAL_AUTH_TOKEN);
        } else {
            await signInAnonymously(auth);
        }
    } catch (error) {
        console.error("Firebase initial sign-in error:", error);
    }
}

// Event Listeners for Navigation
document.getElementById('nav-home').onclick = () => navigateTo('home');
document.getElementById('nav-projects').onclick = () => navigateTo('projects');
document.getElementById('nav-forum').onclick = () => navigateTo('forum');
document.getElementById('nav-shop').onclick = () => navigateTo('shop');
document.getElementById('nav-admin').onclick = () => navigateTo('admin');

// Mobile menu toggle
document.getElementById('menu-toggle').onclick = () => {
    const navLinksContainer = document.getElementById('nav-links-container');
    navLinksContainer.classList.toggle('hidden');
    navLinksContainer.classList.toggle('flex');
    navLinksContainer.classList.toggle('flex-col'); // Ensure vertical stacking when open
    navLinksContainer.classList.toggle('w-full'); // Take full width when open
    navLinksContainer.classList.toggle('absolute'); // Position absolutely for overlay effect
    navLinksContainer.classList.toggle('top-16'); // Position below header
    navLinksContainer.classList.toggle('left-0');
    navLinksContainer.classList.toggle('bg-gray-800'); // Add background to menu
    navLinksContainer.classList.toggle('p-4'); // Add padding
    navLinksContainer.classList.toggle('shadow-xl'); // Add shadow
    navLinksContainer.classList.toggle('z-40'); // Ensure it's above content but below header
};


// Set current year in footer
document.getElementById('current-year').textContent = new Date().getFullYear();

// Start the initial sign-in process
initialSignIn();

