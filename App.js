import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCustomToken, // Added this import
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  setDoc,
  serverTimestamp,
  getDoc,
  runTransaction
} from 'firebase/firestore';

// Tailwind CSS is loaded via script tag in the return statement

// --- Reusable Modal Components ---
const Modal = ({ show, title, message, onClose, children }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-2xl max-w-lg w-full flex flex-col max-h-[90vh] overflow-hidden">
        <h3 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">{title}</h3>
        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
          {message && <p className="mb-4 text-gray-700">{message}</p>}
          {children}
        </div>
        <div className="flex justify-end mt-4 pt-2 border-t">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const ConfirmationModal = ({ show, title, message, onConfirm, onCancel }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-2xl max-w-sm w-full">
        <h3 className="text-xl font-bold mb-4 text-gray-800">{title}</h3>
        <p className="mb-6 text-gray-700">{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-75"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-75"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

const ErrorModal = ({ show, message, onClose }) => (
  <Modal show={show} title="Error!" message={message} onClose={onClose} />
);

const SuccessModal = ({ show, message, onClose }) => (
  <Modal show={show} title="Success!" message={message} onClose={onClose} />
);

// --- Utility Functions ---
// Provides a fallback image URL for profile icons that fail to load
const getProfileIconFallback = (url) => (e) => {
  e.target.onerror = null;
  e.target.src = "https://placehold.co/40x40/cccccc/ffffff?text=User"; // Generic placeholder
  e.target.className += " border border-gray-300"; // Add a subtle border to fallbacks
};

// --- App Component ---
export default function App() {
  const [firebaseApp, setFirebaseApp] = useState(null);
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); // Firebase Auth user object
  const [userProfile, setUserProfile] = useState(null); // Firestore profile data
  const [currentPage, setCurrentPage] = useState('home'); // Current view: 'login', 'signup', 'home', 'admin', 'profile'
  const [loading, setLoading] = useState(true);
  const [showError, setShowError] = useState({ show: false, message: '' });
  const [showSuccess, setShowSuccess] = useState({ show: false, message: '' });

  // Initialize Firebase
  useEffect(() => {
    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const authentication = getAuth(app);

      setFirebaseApp(app);
      setDb(firestore);
      setAuth(authentication);

      // Authenticate with custom token or anonymously
      onAuthStateChanged(authentication, async (user) => {
        if (user) {
          setCurrentUser(user);
          // Fetch user profile from Firestore
          const userDocRef = doc(firestore, `artifacts/${appId}/public/data/users`, user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            setUserProfile({ id: userDocSnap.id, ...userDocSnap.data() });
            console.log("User profile loaded:", userDocSnap.data());
          } else {
            console.warn("User profile not found in Firestore for UID:", user.uid);
            // This might happen if a user is created via Auth but their profile document isn't set yet.
            // Force user to profile setup or create a basic one.
            setUserProfile(null);
          }
          setLoading(false);
        } else {
          setCurrentUser(null);
          setUserProfile(null);
          // Try to sign in with custom token provided by the environment
          try {
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
              await signInWithCustomToken(authentication, __initial_auth_token);
              console.log("Signed in with custom token.");
            } else {
              await signInAnonymously(authentication);
              console.log("Signed in anonymously.");
            }
          } catch (error) {
            console.error("Error during initial sign-in:", error);
            setShowError({ show: true, message: `Authentication error: ${error.message}` });
          }
          setLoading(false);
        }
        setLoading(false);
      });

    } catch (error) {
      console.error("Error initializing Firebase:", error);
      setShowError({ show: true, message: `Firebase initialization failed: ${error.message}` });
      setLoading(false);
    }
  }, []);

  // --- Authentication Handlers ---
  const handleSignUp = async (email, password, username, confirmPassword) => {
    if (password !== confirmPassword) {
      setShowError({ show: true, message: "Passwords do not match." });
      return;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const userDocRef = doc(db, `artifacts/${__app_id}/public/data/users`, user.uid);

      // Check if this is the very first user (potential founder)
      const usersCollectionRef = collection(db, `artifacts/${__app_id}/public/data/users`);
      const existingUsers = await getDocs(usersCollectionRef);
      const isFounder = existingUsers.empty; // If no users exist, this is the founder

      await setDoc(userDocRef, {
        username: username,
        email: email,
        role: isFounder ? 'founder' : 'member', // Assign founder role if first user
        profileIcon: "https://placehold.co/40x40/cccccc/ffffff?text=User", // Default icon
        background: "bg-gradient-to-br from-indigo-50 to-blue-100", // Default background
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });
      setUserProfile({
        id: user.uid,
        username,
        email,
        role: isFounder ? 'founder' : 'member',
        profileIcon: "https://placehold.co/40x40/cccccc/ffffff?text=User",
        background: "bg-gradient-to-br from-indigo-50 to-blue-100",
      });
      setCurrentUser(user); // Ensure current user state is updated
      setShowSuccess({ show: true, message: "Account created successfully! Welcome!" });
      setCurrentPage('home');
    } catch (error) {
      console.error("Error signing up:", error);
      setShowError({ show: true, message: `Sign up failed: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (email, password) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const userDocRef = doc(db, `artifacts/${__app_id}/public/data/users`, user.uid);
      await updateDoc(userDocRef, {
        lastLoginAt: serverTimestamp(),
      });
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        setUserProfile({ id: userDocSnap.id, ...userDocSnap.data() });
      } else {
        // This case should ideally not happen if signup creates the profile,
        // but as a fallback, create a basic one if missing.
        await setDoc(userDocRef, {
          username: `User-${user.uid.substring(0, 5)}`,
          email: user.email,
          role: 'member',
          profileIcon: "https://placehold.co/40x40/cccccc/ffffff?text=User",
          background: "bg-gradient-to-br from-indigo-50 to-blue-100",
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
        });
        const newUserDocSnap = await getDoc(userDocRef);
        setUserProfile({ id: newUserDocSnap.id, ...newUserDocSnap.data() });
      }
      setCurrentUser(user); // Ensure current user state is updated
      setShowSuccess({ show: true, message: "Signed in successfully!" });
      setCurrentPage('home');
    } catch (error) {
      console.error("Error signing in:", error);
      setShowError({ show: true, message: `Sign in failed: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
      setShowSuccess({ show: true, message: "Signed out successfully." });
      setCurrentPage('login');
    } catch (error) {
      console.error("Error signing out:", error);
      setShowError({ show: true, message: `Sign out failed: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  // --- Auth & Profile Management Page ---
  const AuthPage = ({ type, onSignIn, onSignUp, onNavigate }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [username, setUsername] = useState('');

    const handleSubmit = (e) => {
      e.preventDefault();
      if (type === 'login') {
        onSignIn(email, password);
      } else {
        onSignUp(email, password, username, confirmPassword);
      }
    };

    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-4">
        <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
          <h2 className="text-4xl font-bold mb-8 text-center text-gray-800">
            {type === 'login' ? 'Welcome Back!' : 'Join Us!'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
                placeholder="you@example.com"
              />
            </div>
            {type === 'signup' && (
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
                  placeholder="Your display name"
                />
              </div>
            )}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
                placeholder="Strong password"
              />
            </div>
            {type === 'signup' && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-200"
                  placeholder="Re-enter password"
                />
              </div>
            )}
            <button
              type="submit"
              className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-75"
            >
              {type === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          </form>
          <div className="mt-8 text-center text-gray-600">
            {type === 'login' ? (
              <p>Don't have an account? <button onClick={() => onNavigate('signup')} className="text-indigo-600 hover:underline font-medium">Sign Up</button></p>
            ) : (
              <p>Already have an account? <button onClick={() => onNavigate('login')} className="text-indigo-600 hover:underline font-medium">Sign In</button></p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // --- Header Navigation ---
  const Header = ({ userProfile, onSignOut, onNavigate }) => {
    return (
      <header className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-lg p-4 flex flex-col sm:flex-row justify-between items-center sticky top-0 z-40">
        <div className="flex items-center mb-4 sm:mb-0">
          <img
            src={userProfile?.profileIcon || "https://placehold.co/40x40/cccccc/ffffff?text=User"}
            alt="Profile Icon"
            className="w-10 h-10 rounded-full mr-3 border-2 border-white object-cover"
            onError={getProfileIconFallback()}
          />
          <h1 className="text-3xl font-extrabold tracking-tight">CodeShare</h1>
        </div>
        <nav className="flex flex-wrap justify-center sm:justify-end gap-x-6 gap-y-2 text-lg font-medium">
          <button onClick={() => onNavigate('home')} className="hover:text-blue-200 transition duration-200">Home</button>
          {userProfile?.role === 'admin' || userProfile?.role === 'founder' ? (
            <button onClick={() => onNavigate('admin')} className="hover:text-blue-200 transition duration-200">Admin Panel</button>
          ) : null}
          {currentUser && (
            <button onClick={() => onNavigate('profile')} className="hover:text-blue-200 transition duration-200">Profile</button>
          )}
          <button onClick={onSignOut} className="hover:text-blue-200 transition duration-200">Sign Out</button>
        </nav>
      </header>
    );
  };

  // --- Home Page (Code Feed) ---
  const HomePage = ({ db, currentUser, userProfile, setShowError, setShowSuccess }) => {
    const [codePosts, setCodePosts] = useState([]);
    const [sections, setSections] = useState([]);
    const [newPostTitle, setNewPostTitle] = useState('');
    const [newPostCode, setNewPostCode] = useState('');
    const [newPostLanguage, setNewPostLanguage] = useState('javascript');
    const [newPostSectionId, setNewPostSectionId] = useState('');
    const [filterSectionId, setFilterSectionId] = useState('');

    const CODE_LANGUAGES = ['javascript', 'python', 'html', 'css', 'react', 'java', 'c++', 'other'];

    // Fetch sections
    useEffect(() => {
      if (!db) return;
      const sectionsCollectionRef = collection(db, `artifacts/${__app_id}/public/data/sections`);
      const unsubscribe = onSnapshot(sectionsCollectionRef, (snapshot) => {
        const fetchedSections = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSections(fetchedSections.sort((a, b) => a.name.localeCompare(b.name)));
        if (!newPostSectionId && fetchedSections.length > 0) {
          setNewPostSectionId(fetchedSections[0].id); // Set default section for new posts
        }
      }, (error) => {
        console.error("Error fetching sections:", error);
        setShowError({ show: true, message: `Failed to load sections: ${error.message}` });
      });
      return () => unsubscribe();
    }, [db, newPostSectionId, setShowError]);

    // Fetch approved code posts
    useEffect(() => {
      if (!db) return;
      const codePostsCollectionRef = collection(db, `artifacts/${__app_id}/public/data/codePosts`);
      let q = query(codePostsCollectionRef, where('status', '==', 'approved'));

      if (filterSectionId) {
        q = query(q, where('sectionId', '==', filterSectionId));
      }
      // Firestore does not allow orderBy on fields not used in where clause without an index.
      // We will sort client-side by timestamp for simplicity.
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort by timestamp descending (latest first)
        fetchedPosts.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0));
        setCodePosts(fetchedPosts);
      }, (error) => {
        console.error("Error fetching code posts:", error);
        setShowError({ show: true, message: `Failed to load code posts: ${error.message}` });
      });
      return () => unsubscribe();
    }, [db, filterSectionId, setShowError]);


    const handlePostCode = async () => {
      if (!currentUser || !userProfile) {
        setShowError({ show: true, message: "You must be signed in to post code." });
        return;
      }
      if (!newPostTitle.trim() || !newPostCode.trim() || !newPostSectionId) {
        setShowError({ show: true, message: "Please fill in all fields (Title, Code, Section)." });
        return;
      }

      setLoading(true);
      try {
        await addDoc(collection(db, `artifacts/${__app_id}/public/data/codePosts`), {
          title: newPostTitle.trim(),
          codeContent: newPostCode.trim(),
          language: newPostLanguage,
          sectionId: newPostSectionId,
          authorId: currentUser.uid,
          authorName: userProfile.username,
          timestamp: serverTimestamp(),
          status: 'pending', // Requires admin approval
        });
        setNewPostTitle('');
        setNewPostCode('');
        setNewPostLanguage('javascript');
        setShowSuccess({ show: true, message: "Code submitted for approval! It will appear once an admin approves it." });
      } catch (error) {
        console.error("Error posting code:", error);
        setShowError({ show: true, message: `Failed to post code: ${error.message}` });
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
        <h2 className="text-4xl font-extrabold text-gray-800 mb-8 text-center">Community Code Snippets</h2>

        {currentUser && userProfile && (
          <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-3xl mb-8 border-t-4 border-indigo-500">
            <h3 className="text-2xl font-bold text-indigo-700 mb-4">Submit Your Code</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="postTitle" className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  id="postTitle"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Simple JavaScript Debounce Function"
                />
              </div>
              <div>
                <label htmlFor="postCode" className="block text-sm font-medium text-gray-700">Code</label>
                <textarea
                  id="postCode"
                  value={newPostCode}
                  onChange={(e) => setNewPostCode(e.target.value)}
                  rows="10"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm resize-y"
                  placeholder="Paste your code here..."
                ></textarea>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label htmlFor="postLanguage" className="block text-sm font-medium text-gray-700">Language</label>
                  <select
                    id="postLanguage"
                    value={newPostLanguage}
                    onChange={(e) => setNewPostLanguage(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {CODE_LANGUAGES.map(lang => (
                      <option key={lang} value={lang}>{lang.charAt(0).toUpperCase() + lang.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label htmlFor="postSection" className="block text-sm font-medium text-gray-700">Section</label>
                  <select
                    id="postSection"
                    value={newPostSectionId}
                    onChange={(e) => setNewPostSectionId(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {sections.length === 0 ? (
                      <option value="">No sections available</option>
                    ) : (
                      sections.map(section => (
                        <option key={section.id} value={section.id}>{section.name}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>
              <button
                onClick={handlePostCode}
                className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-300 ease-in-out transform hover:scale-105"
              >
                Submit Code
              </button>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-3xl mb-8 border-t-4 border-purple-500">
          <h3 className="text-2xl font-bold text-purple-700 mb-4">Browse Code</h3>
          <div className="mb-4">
            <label htmlFor="filterSection" className="block text-sm font-medium text-gray-700 mb-1">Filter by Section:</label>
            <select
              id="filterSection"
              value={filterSectionId}
              onChange={(e) => setFilterSectionId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="">All Sections</option>
              {sections.map(section => (
                <option key={section.id} value={section.id}>{section.name}</option>
              ))}
            </select>
          </div>
          {codePosts.length === 0 ? (
            <p className="text-gray-600 text-center py-4">No approved code snippets yet or none in this section. Be the first to post!</p>
          ) : (
            <div className="space-y-6">
              {codePosts.map(post => {
                const sectionName = sections.find(s => s.id === post.sectionId)?.name || 'Uncategorized';
                return (
                  <div key={post.id} className="p-5 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center mb-3">
                      <img
                        src={post.authorProfileIcon || "https://placehold.co/30x30/dddddd/333333?text=A"} // Placeholder for author's icon
                        alt="Author Icon"
                        className="w-8 h-8 rounded-full mr-2 border border-gray-300 object-cover"
                        onError={getProfileIconFallback()}
                      />
                      <p className="text-sm text-gray-600 font-medium">
                        {post.authorName || 'Anonymous'} in <span className="font-semibold text-purple-700">{sectionName}</span>
                        <span className="ml-2 text-gray-500">
                          {post.timestamp ? ` on ${new Date(post.timestamp.toDate()).toLocaleString()}` : ''}
                        </span>
                      </p>
                    </div>
                    <h4 className="text-xl font-bold text-gray-800 mb-2">{post.title}</h4>
                    <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto text-sm font-mono">
                      <code>{post.codeContent}</code>
                    </pre>
                    <p className="text-right text-xs text-gray-400 mt-2">Language: {post.language.toUpperCase()}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- Profile Page ---
  const ProfilePage = ({ db, currentUser, userProfile, setUserProfile, setShowError, setShowSuccess }) => {
    const [editUsername, setEditUsername] = useState(userProfile?.username || '');
    const [editProfileIcon, setEditProfileIcon] = useState(userProfile?.profileIcon || '');
    const [editBackground, setEditBackground] = useState(userProfile?.background || '');

    useEffect(() => {
      if (userProfile) {
        setEditUsername(userProfile.username);
        setEditProfileIcon(userProfile.profileIcon);
        setEditBackground(userProfile.background);
      }
    }, [userProfile]);

    const handleUpdateProfile = async () => {
      if (!currentUser || !db) return;

      setLoading(true);
      try {
        const userDocRef = doc(db, `artifacts/${__app_id}/public/data/users`, currentUser.uid);
        await updateDoc(userDocRef, {
          username: editUsername.trim(),
          profileIcon: editProfileIcon.trim(),
          background: editBackground.trim(),
        });
        setUserProfile(prev => ({
          ...prev,
          username: editUsername.trim(),
          profileIcon: editProfileIcon.trim(),
          background: editBackground.trim(),
        }));
        setShowSuccess({ show: true, message: "Profile updated successfully!" });
      } catch (error) {
        console.error("Error updating profile:", error);
        setShowError({ show: true, message: `Failed to update profile: ${error.message}` });
      } finally {
        setLoading(false);
      }
    };

    const BACKGROUND_OPTIONS = [
      { name: "Indigo Gradient", value: "bg-gradient-to-br from-indigo-50 to-blue-100" },
      { name: "Gray Pattern", value: "bg-gray-200 bg-pattern-grid" }, // Example: requires custom CSS pattern
      { name: "Sunset Gradient", value: "bg-gradient-to-br from-red-100 to-yellow-200" },
      { name: "Ocean Waves", value: "https://images.unsplash.com/photo-1517976192994-e537463f25c7?auto=format&fit=crop&q=80&w=2070&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" },
    ];

    const PROFILE_ICON_OPTIONS = [
      { name: "Default User", value: "https://placehold.co/40x40/cccccc/ffffff?text=User" },
      { name: "Gear Icon", value: "https://cdn-icons-png.flaticon.com/512/1057/1057093.png" },
      { name: "Code Icon", value: "https://cdn-icons-png.flaticon.com/512/2920/2920251.png" },
      { name: "Robot Icon", value: "https://cdn-icons-png.flaticon.com/512/8662/8662366.png" },
    ];


    return (
      <div className={`min-h-screen p-6 flex flex-col items-center ${userProfile?.background || 'bg-gray-100'}`}>
        <style>
          {`
          /* Custom pattern for "Gray Pattern" background option */
          .bg-pattern-grid {
              background-image: linear-gradient(to right, lightgray 1px, transparent 1px),
                                linear-gradient(to bottom, lightgray 1px, transparent 1px);
              background-size: 20px 20px;
          }
          `}
        </style>
        <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl border-t-4 border-green-500">
          <h2 className="text-4xl font-extrabold text-gray-800 mb-8 text-center">Your Profile</h2>

          <div className="flex flex-col items-center mb-8">
            <img
              src={editProfileIcon || "https://placehold.co/100x100/cccccc/ffffff?text=User"}
              alt="Profile Icon"
              className="w-24 h-24 rounded-full object-cover mb-4 border-4 border-indigo-400 shadow-md"
              onError={getProfileIconFallback("https://placehold.co/100x100/cccccc/ffffff?text=User")}
            />
            <p className="text-xl font-semibold text-gray-800">{userProfile?.username || 'Loading...'}</p>
            <p className="text-sm text-gray-500 mb-2">{userProfile?.email}</p>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${userProfile?.role === 'founder' ? 'bg-yellow-500 text-white' : userProfile?.role === 'admin' ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-800'}`}>
              {userProfile?.role?.toUpperCase()}
            </span>
            <p className="text-sm text-gray-600 mt-2">Your User ID: <span className="font-mono text-gray-700 break-all">{currentUser?.uid}</span></p>
          </div>

          <div className="space-y-6">
            <div>
              <label htmlFor="editUsername" className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                id="editUsername"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label htmlFor="editProfileIcon" className="block text-sm font-medium text-gray-700 mb-1">Profile Icon URL</label>
              <input
                type="text"
                id="editProfileIcon"
                value={editProfileIcon}
                onChange={(e) => setEditProfileIcon(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                placeholder="e.g., https://example.com/icon.png"
              />
              <select
                className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                onChange={(e) => setEditProfileIcon(e.target.value)}
                value={editProfileIcon}
              >
                <option value="">Select a predefined icon</option>
                {PROFILE_ICON_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="editBackground" className="block text-sm font-medium text-gray-700 mb-1">Background Style/URL</label>
              <input
                type="text"
                id="editBackground"
                value={editBackground}
                onChange={(e) => setEditBackground(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                placeholder="e.g., bg-red-100 or https://example.com/bg.jpg"
              />
              <select
                className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                onChange={(e) => setEditBackground(e.target.value)}
                value={editBackground}
              >
                <option value="">Select a predefined background</option>
                {BACKGROUND_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleUpdateProfile}
              className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition duration-300 ease-in-out transform hover:scale-105"
            >
              Update Profile
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- Admin Panel ---
  const AdminPanel = ({ db, currentUser, userProfile, setShowError, setShowSuccess }) => {
    const [allUsers, setAllUsers] = useState([]);
    const [sections, setSections] = useState([]);
    const [pendingCodePosts, setPendingCodePosts] = useState([]);
    const [newSectionName, setNewSectionName] = useState('');
    const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [showDeleteSectionConfirm, setShowDeleteSectionConfirm] = useState(false);
    const [sectionToDelete, setSectionToDelete] = useState(null);

    // Fetch all users
    useEffect(() => {
      if (!db || !currentUser) return;
      const usersCollectionRef = collection(db, `artifacts/${__app_id}/public/data/users`);
      const unsubscribe = onSnapshot(usersCollectionRef, (snapshot) => {
        const fetchedUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Filter out the current user from the list if not founder, or allow founder to see all
        setAllUsers(fetchedUsers.filter(u => u.id !== currentUser.uid)); // Filter out self for role changes
      }, (error) => {
        console.error("Error fetching all users:", error);
        setShowError({ show: true, message: `Failed to load users: ${error.message}` });
      });
      return () => unsubscribe();
    }, [db, currentUser, setShowError]);

    // Fetch sections
    useEffect(() => {
      if (!db) return;
      const sectionsCollectionRef = collection(db, `artifacts/${__app_id}/public/data/sections`);
      const unsubscribe = onSnapshot(sectionsCollectionRef, (snapshot) => {
        const fetchedSections = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSections(fetchedSections.sort((a, b) => a.name.localeCompare(b.name)));
      }, (error) => {
        console.error("Error fetching sections:", error);
        setShowError({ show: true, message: `Failed to load sections: ${error.message}` });
      });
      return () => unsubscribe();
    }, [db, setShowError]);

    // Fetch pending code posts
    useEffect(() => {
      if (!db) return;
      const codePostsCollectionRef = collection(db, `artifacts/${__app_id}/public/data/codePosts`);
      const q = query(codePostsCollectionRef, where('status', '==', 'pending'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPendingCodePosts(fetchedPosts.sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0)));
      }, (error) => {
        console.error("Error fetching pending code posts:", error);
        setShowError({ show: true, message: `Failed to load pending posts: ${error.message}` });
      });
      return () => unsubscribe();
    }, [db, setShowError]);

    const handleChangeUserRole = async (targetUserId, newRole) => {
      if (!db || !currentUser || !userProfile) return;

      // Founder can change anyone's role, including making others admin.
      // Admin can change member roles, but not other admins or founder.
      if (userProfile.role === 'admin' && (newRole === 'founder' || newRole === 'admin')) {
        setShowError({ show: true, message: "Admins cannot assign 'founder' or 'admin' roles, or change other admins." });
        return;
      }
      const targetUser = allUsers.find(u => u.id === targetUserId);
      if (userProfile.role === 'admin' && targetUser?.role === 'admin') {
         setShowError({ show: true, message: "Admins cannot change another admin's role." });
         return;
      }
      if (userProfile.role === 'admin' && targetUser?.role === 'founder') {
         setShowError({ show: true, message: "Admins cannot change the founder's role." });
         return;
      }


      setLoading(true);
      try {
        const userDocRef = doc(db, `artifacts/${__app_id}/public/data/users`, targetUserId);
        await updateDoc(userDocRef, { role: newRole });
        setShowSuccess({ show: true, message: `User role for ${targetUserId} updated to ${newRole}.` });
      } catch (error) {
        console.error("Error changing user role:", error);
        setShowError({ show: true, message: `Failed to change role: ${error.message}` });
      } finally {
        setLoading(false);
      }
    };

    const handleSendPasswordReset = async (email) => {
      if (!auth || !currentUser || (userProfile.role !== 'admin' && userProfile.role !== 'founder')) {
        setShowError({ show: true, message: "You don't have permission to do this." });
        return;
      }
      setLoading(true);
      try {
        await sendPasswordResetEmail(auth, email);
        setShowSuccess({ show: true, message: `Password reset email sent to ${email}.` });
      } catch (error) {
        console.error("Error sending password reset:", error);
        setShowError({ show: true, message: `Failed to send reset email: ${error.message}` });
      } finally {
        setLoading(false);
      }
    };

    const confirmDeleteUser = (user) => {
      setUserToDelete(user);
      setShowDeleteUserConfirm(true);
    };

    const handleDeleteUser = async () => {
      if (!db || !userToDelete) return;
      if (userToDelete.role === 'founder') {
        setShowError({ show: true, message: "Cannot delete the founder." });
        return;
      }
      if (userToDelete.role === 'admin' && userProfile.role !== 'founder') {
        setShowError({ show: true, message: "Only a founder can delete another admin." });
        return;
      }

      setLoading(true);
      setShowDeleteUserConfirm(false); // Close confirmation modal
      try {
        // Run as a transaction to ensure atomicity
        await runTransaction(db, async (transaction) => {
          // Delete user's profile document
          const userDocRef = doc(db, `artifacts/${__app_id}/public/data/users`, userToDelete.id);
          transaction.delete(userDocRef);

          // Find and delete all code posts by this user
          const postsByUserQuery = query(
            collection(db, `artifacts/${__app_id}/public/data/codePosts`),
            where('authorId', '==', userToDelete.id)
          );
          const postsSnapshot = await getDocs(postsByUserQuery);
          postsSnapshot.forEach(postDoc => {
            transaction.delete(postDoc.ref);
          });
          // Note: Actual Firebase Auth user deletion requires a server (Cloud Functions)
          // This client-side code only deletes Firestore data.
          // For a real app, integrate with Firebase Admin SDK on a backend.
        });

        setShowSuccess({ show: true, message: `User ${userToDelete.username} and their posts deleted successfully.` });
        setUserToDelete(null);
      } catch (error) {
        console.error("Error deleting user and posts:", error);
        setShowError({ show: true, message: `Failed to delete user: ${error.message}` });
      } finally {
        setLoading(false);
      }
    };

    const handleCreateSection = async () => {
      if (!db || !newSectionName.trim()) {
        setShowError({ show: true, message: "Section name cannot be empty." });
        return;
      }
      if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'founder')) {
        setShowError({ show: true, message: "You don't have permission to create sections." });
        return;
      }
      setLoading(true);
      try {
        await addDoc(collection(db, `artifacts/${__app_id}/public/data/sections`), {
          name: newSectionName.trim(),
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid,
        });
        setNewSectionName('');
        setShowSuccess({ show: true, message: `Section "${newSectionName}" created.` });
      } catch (error) {
        console.error("Error creating section:", error);
        setShowError({ show: true, message: `Failed to create section: ${error.message}` });
      } finally {
        setLoading(false);
      }
    };

    const confirmDeleteSection = (section) => {
      setSectionToDelete(section);
      setShowDeleteSectionConfirm(true);
    };

    const handleDeleteSection = async () => {
      if (!db || !sectionToDelete) return;
      if (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'founder')) {
        setShowError({ show: true, message: "You don't have permission to delete sections." });
        return;
      }

      setLoading(true);
      setShowDeleteSectionConfirm(false);
      try {
        await runTransaction(db, async (transaction) => {
          // Delete the section document
          const sectionDocRef = doc(db, `artifacts/${__app_id}/public/data/sections`, sectionToDelete.id);
          transaction.delete(sectionDocRef);

          // Update any code posts that belonged to this section to 'uncategorized' or similar
          // For simplicity, we'll just set their sectionId to empty string.
          const postsInSectionQuery = query(
            collection(db, `artifacts/${__app_id}/public/data/codePosts`),
            where('sectionId', '==', sectionToDelete.id)
          );
          const postsSnapshot = await getDocs(postsInSectionQuery);
          postsSnapshot.forEach(postDoc => {
            transaction.update(postDoc.ref, { sectionId: '' }); // Or delete them, depending on desired behavior
          });
        });
        setShowSuccess({ show: true, message: `Section "${sectionToDelete.name}" and associated posts updated successfully.` });
        setSectionToDelete(null);
      } catch (error) {
        console.error("Error deleting section:", error);
        setShowError({ show: true, message: `Failed to delete section: ${error.message}` });
      } finally {
        setLoading(false);
      }
    };

    const handleApproveRejectCode = async (postId, status) => {
      if (!db || !currentUser || (userProfile.role !== 'admin' && userProfile.role !== 'founder')) {
        setShowError({ show: true, message: "You don't have permission to approve/reject code." });
        return;
      }
      setLoading(true);
      try {
        const postDocRef = doc(db, `artifacts/${__app_id}/public/data/codePosts`, postId);
        await updateDoc(postDocRef, {
          status: status,
          approvedBy: currentUser.uid,
          approvedAt: serverTimestamp(),
        });
        setShowSuccess({ show: true, message: `Code post ${status} successfully.` });
      } catch (error) {
        console.error(`Error ${status}ing code post:`, error);
        setShowError({ show: true, message: `Failed to ${status} code post: ${error.message}` });
      } finally {
        setLoading(false);
      }
    };

    if (userProfile?.role !== 'admin' && userProfile?.role !== 'founder') {
      return (
        <div className="flex justify-center items-center min-h-screen bg-red-50 p-4">
          <div className="bg-white p-8 rounded-xl shadow-2xl text-center border-l-4 border-red-500">
            <h2 className="text-3xl font-bold text-red-700 mb-4">Access Denied!</h2>
            <p className="text-gray-700 text-lg">You do not have administrative privileges to view this page.</p>
            <button
              onClick={() => setCurrentPage('home')}
              className="mt-6 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-300"
            >
              Go to Home Page
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-100 p-6 flex flex-col items-center">
        <h2 className="text-4xl font-extrabold text-gray-800 mb-8 text-center">Admin Panel</h2>

        {/* Current User Role Info */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-8 w-full max-w-4xl text-center text-sm text-gray-600 border-l-4 border-blue-400">
            <p>Your Role: <span className={`font-bold ${userProfile?.role === 'founder' ? 'text-yellow-700' : 'text-blue-700'}`}>{userProfile?.role?.toUpperCase()}</span></p>
            <p className="mt-1">Your User ID: <span className="font-mono text-gray-700 break-all">{currentUser?.uid}</span></p>
        </div>


        {/* Manage Users Section */}
        <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-4xl mb-8 border-t-4 border-blue-600">
          <h3 className="text-2xl font-bold text-blue-700 mb-4">Manage Users</h3>
          {allUsers.length === 0 ? (
            <p className="text-gray-600 text-center py-4">No other users registered.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-lg overflow-hidden">
                <thead className="bg-blue-100">
                  <tr>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-blue-800 uppercase tracking-wider">Username</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-blue-800 uppercase tracking-wider">Email</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-blue-800 uppercase tracking-wider">Role</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-blue-800 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map(user => (
                    <tr key={user.id} className="border-b last:border-b-0 hover:bg-gray-50 transition duration-150">
                      <td className="py-3 px-4 text-gray-900 font-medium flex items-center">
                        <img
                          src={user.profileIcon || "https://placehold.co/24x24/cccccc/ffffff?text=U"}
                          alt="User Icon"
                          className="w-6 h-6 rounded-full mr-2 object-cover"
                          onError={getProfileIconFallback()}
                        />
                        {user.username}
                      </td>
                      <td className="py-3 px-4 text-gray-700">{user.email}</td>
                      <td className="py-3 px-4">
                        <select
                          value={user.role}
                          onChange={(e) => handleChangeUserRole(user.id, e.target.value)}
                          className="px-2 py-1 rounded-md border border-gray-300 bg-white text-sm"
                          disabled={
                            userProfile.role !== 'founder' && (user.role === 'admin' || user.role === 'founder') // Admins can't change other admins/founders
                            || userProfile.role === 'admin' && (user.id === currentUser.uid) // Admin can't change self
                            || userProfile.role === 'founder' && user.id === currentUser.uid // Founder can't change own role from here (for safety)
                          }
                        >
                          <option value="member">Member</option>
                          <option value="admin" disabled={userProfile.role !== 'founder'}>Admin</option>
                          <option value="founder" disabled={true}>Founder</option> {/* Founder role can only be assigned once */}
                        </select>
                      </td>
                      <td className="py-3 px-4 space-x-2">
                        <button
                          onClick={() => handleSendPasswordReset(user.email)}
                          className="px-3 py-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 text-xs shadow-sm transition"
                          disabled={userProfile.role !== 'admin' && userProfile.role !== 'founder'}
                        >
                          Reset Pass
                        </button>
                        <button
                          onClick={() => confirmDeleteUser(user)}
                          className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-xs shadow-sm transition"
                          disabled={user.role === 'founder' || (user.role === 'admin' && userProfile.role !== 'founder') || user.id === currentUser.uid}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Manage Sections Section */}
        <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-4xl mb-8 border-t-4 border-green-600">
          <h3 className="text-2xl font-bold text-green-700 mb-4">Manage Sections</h3>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <input
              type="text"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
              placeholder="New section name (e.g., Python Web Dev)"
            />
            <button
              onClick={handleCreateSection}
              className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition duration-300"
              disabled={userProfile.role !== 'admin' && userProfile.role !== 'founder'}
            >
              Create Section
            </button>
          </div>
          {sections.length === 0 ? (
            <p className="text-gray-600 text-center py-4">No sections created yet.</p>
          ) : (
            <ul className="space-y-2">
              {sections.map(section => (
                <li key={section.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-md shadow-sm">
                  <span className="font-medium text-gray-800">{section.name}</span>
                  <button
                    onClick={() => confirmDeleteSection(section)}
                    className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-xs shadow-sm transition"
                    disabled={userProfile.role !== 'admin' && userProfile.role !== 'founder'}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pending Code Approvals Section */}
        <div className="bg-white p-6 rounded-xl shadow-lg w-full max-w-4xl mb-8 border-t-4 border-purple-600">
          <h3 className="text-2xl font-bold text-purple-700 mb-4">Pending Code Approvals ({pendingCodePosts.length})</h3>
          {pendingCodePosts.length === 0 ? (
            <p className="text-gray-600 text-center py-4">No code snippets pending approval.</p>
          ) : (
            <div className="space-y-6">
              {pendingCodePosts.map(post => (
                <div key={post.id} className="p-5 bg-yellow-50 rounded-lg shadow-sm border border-yellow-200">
                  <h4 className="text-xl font-bold text-gray-800 mb-2">{post.title}</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    By <span className="font-semibold">{post.authorName || 'Anonymous'}</span>
                    {' '} in {sections.find(s => s.id === post.sectionId)?.name || 'Uncategorized'}
                    {post.timestamp ? ` on ${new Date(post.timestamp.toDate()).toLocaleString()}` : ''}
                  </p>
                  <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto text-sm font-mono mb-4">
                    <code>{post.codeContent}</code>
                  </pre>
                  <p className="text-right text-xs text-gray-400 mb-4">Language: {post.language.toUpperCase()}</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => handleApproveRejectCode(post.id, 'approved')}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition shadow-md"
                      disabled={userProfile.role !== 'admin' && userProfile.role !== 'founder'}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleApproveRejectCode(post.id, 'rejected')}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition shadow-md"
                      disabled={userProfile.role !== 'admin' && userProfile.role !== 'founder'}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confirmation Modals */}
        <ConfirmationModal
          show={showDeleteUserConfirm}
          title="Delete User Confirmation"
          message={`Are you sure you want to delete user "${userToDelete?.username}"? This will also delete all their code posts and cannot be undone.`}
          onConfirm={handleDeleteUser}
          onCancel={() => setShowDeleteUserConfirm(false)}
        />
        <ConfirmationModal
          show={showDeleteSectionConfirm}
          title="Delete Section Confirmation"
          message={`Are you sure you want to delete section "${sectionToDelete?.name}"? Code posts in this section will become uncategorized.`}
          onConfirm={handleDeleteSection}
          onCancel={() => setShowDeleteSectionConfirm(false)}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-20 w-20 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="ml-4 text-lg text-gray-700">Loading application...</p>
      </div>
    );
  }

  // Main application routing logic
  const renderPage = () => {
    if (!currentUser) {
      if (currentPage === 'signup') {
        return <AuthPage type="signup" onSignUp={handleSignUp} onNavigate={setCurrentPage} />;
      }
      return <AuthPage type="login" onSignIn={handleSignIn} onNavigate={setCurrentPage} />;
    }

    switch (currentPage) {
      case 'home':
        return <HomePage db={db} currentUser={currentUser} userProfile={userProfile} setShowError={setShowError} setShowSuccess={setShowSuccess} />;
      case 'admin':
        return <AdminPanel db={db} currentUser={currentUser} userProfile={userProfile} setShowError={setShowError} setShowSuccess={setShowSuccess} />;
      case 'profile':
        return <ProfilePage db={db} currentUser={currentUser} userProfile={userProfile} setUserProfile={setUserProfile} setShowError={setShowError} setShowSuccess={setShowSuccess} />;
      default:
        return <HomePage db={db} currentUser={currentUser} userProfile={userProfile} setShowError={setShowError} setShowSuccess={setShowSuccess} />;
    }
  };

  return (
    <>
      {/* Tailwind CSS CDN */}
      <script src="https://cdn.tailwindcss.com"></script>
      {/* Inter Font */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
          body {
            font-family: 'Inter', sans-serif;
          }
          /* Custom scrollbar for better UX in modals and code blocks */
          .custom-scrollbar::-webkit-scrollbar {
              width: 8px;
              height: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
              background: #f1f1f1;
              border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
              background: #a8a8a8;
              border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background: #888;
          }
        `}
      </style>

      {currentUser && userProfile && (
        <Header userProfile={userProfile} onSignOut={handleSignOut} onNavigate={setCurrentPage} />
      )}

      {renderPage()}

      <ErrorModal
        show={showError.show}
        message={showError.message}
        onClose={() => setShowError({ show: false, message: '' })}
      />
      <SuccessModal
        show={showSuccess.show}
        message={showSuccess.message}
        onClose={() => setShowSuccess({ show: false, message: '' })}
      />
    </>
  );
}
