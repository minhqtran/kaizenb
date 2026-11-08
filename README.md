# Goodword Blog Prototype

React 19, TypeScript, Vite, and React Router. This phase is frontend-only: Google Identity Services supplies sign-in identity, while profile/role records and blog metadata live in browser storage. There is no backend or secure authorization boundary yet.

## Run locally

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Set up the Google OAuth web client before sign-in will work. See the GIS setup below. The configured origin must match the browser URL exactly (`localhost` and `127.0.0.1` are different origins).

## Structure

```text
src/
  auth/         Auth context and session hook
  components/   Shared layout, guards, and image renderers
  content/      Repository-hosted public posts
  data/         Seed article content
  pages/        Public, writer, and admin route screens
  services/     Google identity, role policy, local repositories, IndexedDB images
  types/        Profile, role, and blog domain models
  utils/        Formatting helpers
```

## Google Sign-In setup

1. In Google Cloud Console, create an OAuth 2.0 Client ID with application type **Web application**.
2. Add the exact Vite origin you use, such as `http://localhost:5173`, to **Authorized JavaScript origins**.
3. Copy `.env.example` to `.env.local` and set `VITE_GOOGLE_CLIENT_ID` to the client ID. This is a public client identifier, not a secret. Never put a client secret in Vite environment variables.
4. Restart Vite after changing environment values. The sign-in page shows a setup message instead of simulating a login when the client ID is missing.

The app loads the official Google Identity Services client and renders Google's sign-in button. It reads `sub`, email, verified-email status, name, and picture from the returned ID-token claims. The browser decodes claims for this prototype but does **not** verify the token signature, issuer, audience, or expiry.

## Initial admin

The app never makes the first user an admin. Prefer setting `VITE_INITIAL_ADMIN_GOOGLE_SUB` to the designated account's stable Google subject. If you do not know it yet, you may temporarily set `VITE_INITIAL_ADMIN_EMAIL` to one exact, controlled email address; only a Google-verified matching email is accepted. A configured subject takes precedence over email.

For subject setup, sign in once as the intended account, inspect that user's `googleSubject` in browser localStorage under `goodword.users.v1`, put the value in `.env.local`, restart Vite, sign out, then sign in again. Do not share or commit `.env.local`. Email bootstrap is a development convenience; move admin designation to a trusted backend before deployment.

## Test roles

- **Viewer:** Sign in with an account that is not the configured bootstrap admin. New profiles receive `viewer`; public stories remain readable, while `/write`, `/my-stories`, and `/admin/*` are guarded.
- **Writer:** Sign in as the bootstrapped admin, sign in a second Google account as a viewer, then use **People & permissions** to promote that account. The writer can author and edit only posts with their own `authorId`.
- **Admin:** Use only the account designated by the environment bootstrap. It can manage users and all posts. Admin roles cannot be assigned or changed through the user table; writer role actions only promote viewers or revoke writers.

Use separate Google accounts or browser profiles to exercise these roles. Prototype records can be cleared from browser storage with `localStorage.removeItem('goodword.users.v1')`, `localStorage.removeItem('goodword.session.v1')`, and `localStorage.removeItem('goodword.posts.v1')`. IndexedDB image blobs are stored in the `goodword-media` database.

## Authoring and storage

Writers can save drafts, preview with the public article layout, publish, and edit their own work. Images support multiple selection, later additions, alt text, captions, reorder/remove controls, and featured, full-width, inline (inserted after article paragraphs in sequence), side-by-side, or framed layouts. Uploads accept JPEG, PNG, WebP, and GIF up to 8 MB each. Image blobs are kept in IndexedDB through `src/services/imageStorage.ts`; post/user metadata is kept in localStorage. Drafts and posts written in the editor persist in that browser only and are not shared by the Copy link action.

Posts in `src/content/posts/` are bundled with the site and readable without signing in from any browser. Add or edit a `BlogPost` there and export it from `src/content/posts/index.ts` to publish repository-hosted content; set the author's byline, and store any public post images as deployable assets and reference their public URLs. The Tâm sự 1 post's images belong in `public/images/posts/t-n-m-i-part-1/`; see that folder's README for the expected filenames. Repository-hosted posts take precedence over local posts with the same slug and are not editable through the browser editor. This is a temporary way to share selected posts; move these records and images to shared backend storage when one is available.

## Prototype security and production work

LocalStorage roles and ownership checks are for UX demonstration only; users can modify them in developer tools. Google ID-token verification, secure sessions, role authorization, post ownership, and admin bootstrap must be enforced by the backend. Before production, add authenticated API repositories, server-side Google token verification, CSRF/session protections as appropriate, authorization on every post/user operation, and object storage for uploaded images. Do not treat frontend route guards or decoded token claims as security controls.

## Commands

- `npm run dev` starts Vite.
- `npm test` runs role-policy and Google-claim tests.
- `npm run lint` runs ESLint.
- `npm run build` type-checks and creates the production bundle.
- `npm run preview` serves the production bundle locally.
