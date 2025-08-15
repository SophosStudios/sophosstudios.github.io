# SophosWRLD — Single Page App (SPA)

This ZIP includes a working **single-page app** scaffold with navigation, forums, profiles, settings, and an admin area. It runs in **demo mode** without Firebase, but is structured to plug into your existing Firebase project.

## Files
- `index.html` — the SPA (Tailwind via CDN, vanilla JS router, demo data)
- `assets/avatar.png` — placeholder avatar

## Quick Start (no backend)
Open `index.html` in a browser. All data is in-memory demo data, so refreshing clears changes.

## Hooking Up Firebase
1. Create a Firebase web app and Firestore.
2. In `index.html`, paste your `firebaseConfig` in the **Firebase Setup** section.
3. Replace the demo data calls (`seedDemo`, `render*` using `state`) with Firestore queries:
   - `artifacts/{appId}/public/data/users`
   - `artifacts/{appId}/public/data/forumCategories`
   - `artifacts/{appId}/public/data/forumThreads`
   - per-thread subcollection: `forumThreads/{threadId}/posts`
4. Map fields: 
   - user: `{ uid, name, bio, avatar, role, currency, accentColor, privacy }`
   - category: `{ name, description, order }`
   - thread: `{ threadId, categoryId, categoryName, title, body, authorId, authorName, authorAvatar, createdAt, lastPostAt, replyCount, pinned, locked }`
   - post: `{ body, authorId, authorName, authorAvatar, createdAt }`

> Tip: migrate gradually — keep the UI but swap the demo arrays for Firestore collections. 

## Admin Panel
The Admin area is wired in UI. Add role checks in Firestore Security Rules and write admin-only endpoints if needed.

Have fun!
