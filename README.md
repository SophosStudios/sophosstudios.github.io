# SophosWRLD — SPA Dashboard (Dark + Red Accent)

- Single-file app with Firebase Auth (Email/Password + Google) and Firestore forums.
- Replace `firebaseConfig` and `APP_ID` at the bottom of `index.html`.
- Forums use paths like: `artifacts/{APP_ID}/public/data/forumThreads/{threadId}` and `posts` subcollection.

## Quick start
1. Open `index.html` in a static host (or directly in a modern browser).
2. Insert your Firebase config + APP_ID.
3. Sign in with Google or create an account.
4. Create a thread and reply.

## Notes
- Profile editor only updates self-writable fields to match your security rules.
- `escapeHTML` included for safe rendering.
