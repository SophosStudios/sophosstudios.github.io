# SophosWRLD — Dashboard with Admin Panel

Dark dashboard with red accents. Includes:
- Google + Email/Password Auth
- Suspension flow (shows suspended screen + appeal creation)
- Forums (threads + posts) showing usernames and "~ Sincerely, {username}"
- Public Chat room (roomsPublic/general) showing usernames
- Tickets (user + admin views)
- Admin Panel: suspend/unsuspend, send password reset emails, and *delete accounts* via Cloud Function
- Polished inputs (no white textareas), icons (Font Awesome), and subtle animations

## Setup
1. Replace Firebase config and `APP_ID` in `index.html`.
2. **Firestore Rules**: deploy `firestore.rules`.
   ```bash
   firebase deploy --only firestore:rules
   ```
3. **Functions** (for account deletion from Admin Panel):
   ```bash
   cd functions
   npm install
   firebase deploy --only functions
   ```

> Note: Password reset sends the standard Firebase reset email. Deleting another user's auth account requires the provided Admin SDK Cloud Function (`deleteUserByUid`).

## Collections used
- `artifacts/{APP_ID}/public/data/users/{uid}`
- `artifacts/{APP_ID}/public/data/roomsPublic/general/messages/{messageId}`
- `artifacts/{APP_ID}/public/data/forumThreads/{threadId}`
- `artifacts/{APP_ID}/public/data/forumThreads/{threadId}/posts/{postId}`
- `artifacts/{APP_ID}/public/data/tickets/{ticketId}`

