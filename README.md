# Lost & Found Wall

A frontend-only campus lost & found board built with plain HTML, CSS and JavaScript. All data is kept in the browser's `localStorage`, so there is no backend or install step.

## Run it
Open `index.html` in any modern browser. Sample posts, users and a chat are added on first load.

## Features
- **Post lost or found items** with title, category, location, date, description and an optional photo (compressed before saving).
- **Wall** with live search, Lost/Found toggle, category chips and location filter, plus a stats strip.
- **Owner-only "Mark as claimed"**: only the person who created a post sees the button (and the delete button). Everyone else gets a message box instead.
- **My Posts** tab shows your active posts and your past submissions in separate sections.
- **Returned** tab is a public archive of every claimed item.
- **In-app messaging**: no phone numbers or emails are collected or shown. Finders and owners talk through per-post chat threads with unread badges. Chats close automatically once an item is claimed.
- Demo sign-in with four sample students (or create your own with a name and roll number). Use **Switch user** to see both sides of a conversation.
- Responsive layout for phones and desktops.

## Files
| File | Purpose |
| --- | --- |
| `index.html` | Page shell, header and modal containers |
| `style.css` | All styling |
| `app.js` | State, localStorage persistence, rendering, filters, claim logic and chat |

## Notes and limits
- Because there is no server, accounts and messages live in one browser only. Switching users simulates multiple students on the same device.
- The claim restriction is enforced in the UI and again in the click handlers. A real deployment would need server-side checks.
- To reset the demo data, clear this site's localStorage (DevTools, Application tab) and reload.

## Possible next steps
- Match suggestions between lost and found posts using category and keyword overlap.
- A real backend (Firebase or Supabase) for shared accounts and live chat.
