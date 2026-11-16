# KaizenB Blog

A blog built with React, TypeScript, Vite, and React Router. Vercel serves the frontend and runs the API; Supabase provides Google authentication, Postgres, and private image storage.

## How it works

- `src/` contains the pages, editor, authentication context, and browser API clients.
- `api/index.ts` exports the Vercel Function implemented in `server/apiHandler.ts`.
- `vercel.json` rewrites `/api/*` requests to that function and other routes to `index.html` for React Router.
- The browser signs in through Supabase Auth using Google OAuth and PKCE, then sends its Supabase access token to the API as a Bearer token.
- The API verifies the user with Supabase Auth and reads their role from `public.profiles`. Database and Storage access uses the user's permissions and Row Level Security (RLS).

## 1. Set up the Supabase schema

For a new project, run [20261116000100_initial_blog_backend.sql](supabase/migrations/20261116000100_initial_blog_backend.sql) once in Supabase's SQL Editor. It creates:

- `public.app_role`, `public.profiles`, and `public.posts`.
- A trigger that creates a `viewer` profile for newly registered Auth users.
- Role checks, post metadata triggers, and RLS policies.
- The private `blog-images` bucket and its policies.

This is an initial schema script, not a repeatable upgrade. The older `20261108140000_shared_blog.sql` uses overlapping table names, different role functions, and a `media` bucket. Do not apply both scripts as a migration sequence. Existing installations using the older schema need a reviewed upgrade; rerunning the initial script will encounter existing objects.

Run the current schema before the first sign-in. It does not backfill profiles for Auth users who already exist; if an account predates the schema, check its Auth user ID and corresponding `public.profiles` row before proceeding.

## 2. Configure Google OAuth and redirect URLs

1. In Google Cloud / Google Auth Platform, configure the consent screen and create an OAuth client of type **Web application**. If the app is in Testing, add the intended accounts as test users.
2. In Supabase **Authentication > Providers > Google**, enable Google and enter the OAuth Client ID and Client Secret.
3. Copy the callback URL shown by Supabase into the Google client's **Authorized redirect URIs**. It normally looks like:

   ```text
   https://<project-ref>.supabase.co/auth/v1/callback
   ```

4. In Supabase **Authentication > URL Configuration**, set **Site URL** to your production origin, for example `https://kaizenb.vercel.app`.
5. Add allowed **Redirect URLs** for the app pages used to start sign-in. For the usual sign-in page, include:

   ```text
   https://kaizenb.vercel.app/signin
   http://localhost:3000/signin
   ```

   Use the actual local port printed by `vercel dev`. Add the corresponding URLs for preview deployments you intend to test. The app passes `window.location.href` as `redirectTo`, so allow the actual starting URL, including query parameters where applicable. It does not hard-code a return to `/signin`. Supabase supports wildcard patterns for development and preview URLs; use precise production URLs where possible.

Google redirects to Supabase's callback first; Supabase then returns to the allowed app URL. The Google Client Secret belongs in Supabase's provider configuration. The application does not read `VITE_GOOGLE_CLIENT_ID` or `VITE_INITIAL_ADMIN_GOOGLE_SUB`.

See the official [Google provider setup](https://supabase.com/docs/guides/auth/social-sign-in/auth-google) and [redirect URL guide](https://supabase.com/docs/guides/auth/redirect-urls).

## 3. Configure environment variables

Copy `.env.example` to `.env.local` if the local file does not already exist. Set these four variables using one Supabase project:

| Variable | Used by | Value |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Browser | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Browser | Complete project publishable key |
| `SUPABASE_URL` | Vercel Function | Same project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Vercel Function | Same publishable key |

Publishable keys start with `sb_publishable_`. Copy the entire value from Supabase **Settings > API Keys** without surrounding quotes or whitespace in Vercel's value field. See [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).

The server resolves configuration in this order:

- URL: `SUPABASE_URL`, then `VITE_SUPABASE_URL`.
- Key: `SUPABASE_PUBLISHABLE_KEY`, then `SUPABASE_ANON_KEY`, then `VITE_SUPABASE_PUBLISHABLE_KEY`.

These are fallbacks for absent variables, not retries after an invalid value. A stale server key overrides a working browser key. `SUPABASE_ANON_KEY` is optional legacy support; it is unnecessary when `SUPABASE_PUBLISHABLE_KEY` is set. A legacy anon key can also be supplied through the browser's publishable-key variable.

The current implementation does not require a secret/service-role key. Never put one in a `VITE_` variable. `.env.local` is ignored by Git; do not commit credentials or session tokens.

## 4. Run locally

Install Node.js and npm compatible with the versions in `package.json` and `package-lock.json`.

```powershell
npm ci
# Only if .env.local does not already exist:
Copy-Item .env.example .env.local
# Fill in the four variables, then:
npm run dev
```

`npm run dev` runs Vercel's CLI through `npx`, providing both the frontend and `/api/*` functions. The first run may require a Vercel login and project linking. Restart the local runtime after changing environment variables.

`npm run dev:vite` serves the frontend alone. It has no API proxy configured, so it cannot exercise the complete authentication/profile, post, or image flows by itself.

## 5. Deploy to Vercel

1. Import the repository into a Vercel project using the **Vite** framework preset.
2. Use `npm run build` as the build command and `dist` as the output directory.
3. Add all four environment variables from step 3 in **Project Settings > Environment Variables** for Production and any Preview/Development environments you use. `.env.local` on your computer does not configure production.
4. Deploy the project and configure its production/preview redirect URLs in Supabase as described above.
5. Redeploy after changing Vercel environment variables. Browser `VITE_` values are embedded at build time, and existing deployments retain their configuration. See [Vercel environment variables](https://vercel.com/docs/environment-variables).

Keep the API rewrite ahead of the SPA fallback in `vercel.json`. Server runtime imports use explicit `.js` extensions for the emitted JavaScript, even when their source files are TypeScript. Preserve this convention when adding server modules to avoid Node ESM `ERR_MODULE_NOT_FOUND` failures.

## 6. Grant the initial administrator

Every new account starts as `viewer`. Owning the Vercel, Google Cloud, or Supabase project does not grant an application role. The UI displays the `admin` role as **Supreme Leader**.

Sign in once, then inspect the profiles in Supabase's SQL Editor:

```sql
select id, email, role from public.profiles;
```

After verifying the intended account's email and ID, replace the placeholder below with that profile's UUID and run:

```sql
update public.profiles
set role = 'admin', updated_at = now()
where id = '<verified-profile-uuid>'::uuid
returning id, email, role;
```

Confirm exactly one row is returned with the intended email and `admin` role. Sign out and sign back in to reload the role. No frontend rebuild is needed for this database change.

| Role | Application access |
| --- | --- |
| Public visitor | Read published stories and their images |
| `viewer` | Public access plus account nickname/avatar settings |
| `writer` | Viewer access plus creating, publishing, and editing their own stories |
| `admin` / Supreme Leader | Writer access plus managing all stories, deleting posts, and promoting/revoking writers |

Admins manage people at `/admin/users` and all stories at `/admin/posts`. The UI/API can only switch other non-admin accounts between `viewer` and `writer`; they cannot assign admin, change an admin, or change the acting admin's own role. Admin grants are a trusted database operation.

## Content and storage

- Stories are stored in Supabase Postgres. Published stories are public; drafts are restricted to authorized authors and admins.
- Publishing requires a title, excerpt, at least 20 characters of story text, and alt text for every attached image. Drafts allow incomplete content.
- Images and avatars use the private `blog-images` bucket. Supported uploads are JPEG, PNG, WebP, and GIF, up to 8 MB per file. The API issues signed upload URLs; the browser transfers the file directly to Storage. Read URLs expire after 30 minutes.
- Image cleanup retains objects still referenced by posts or profiles. Deleting posts is admin-only.
- The current app does not automatically import old localStorage posts/users or IndexedDB images. `src/data/mockPosts.ts` is not used to seed or fall back from the live posts API.

## Verification and troubleshooting

After deployment, check these behaviors:

1. Open `/api/posts` while signed out: expect a JSON array, which can be empty.
2. Open `/api/profile` in the address bar: expect `401` with `Sign in to continue.` The navigation does not attach the app's Bearer token.
3. Sign in through the website and inspect its `/api/profile` request in DevTools: expect `200` with your profile and role.
4. After granting admin, sign out/in and verify access to `/admin/users` and `/admin/posts`.

| Symptom | What to check |
| --- | --- |
| `FUNCTION_INVOCATION_FAILED` / `ERR_MODULE_NOT_FOUND` | Vercel runtime logs, explicit `.js` extensions in server runtime imports, and the deployed revision. |
| API returns HTML or another non-JSON response | API rewrite order and whether the runtime serves Vercel Functions; Vite alone and static preview do not. |
| Google login succeeds, then `Your session is invalid or has expired` | This message covers all backend `getUser` failures, including invalid API keys. Inspect Supabase Auth logs. For `UNAUTHORIZED_INVALID_API_KEY`, check the complete server key, its project, environment scope, and redeploy. Also check the token/session if logs indicate a token error. |
| Profile request returns `503` | Server Supabase URL/key configuration is missing. |
| `Your profile is not ready yet` (`403`) | Check that `public.profiles` contains the signed-in Auth user's UUID and that the profile-creation trigger exists. |
| Account remains `viewer` | Inspect `public.profiles.role` for the current account. Grant the initial admin using step 6, then sign out/in. Old initial-admin environment variables have no effect. |
| OAuth redirect mismatch or wrong return page | Distinguish Google's Supabase callback URI from Supabase's allowed app return URLs; verify scheme, host, port, path, and query. |
| Database permission or image errors | Verify the current schema, `blog-images` bucket, RLS policies, account role, and image ownership/references. |

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Full local runtime through Vercel CLI |
| `npm run dev:vite` | Frontend-only Vite server |
| `npm test` | Run Vitest tests |
| `npm run lint` | Run ESLint |
| `npm run build` | Type-check frontend and API, then build the frontend into `dist` |
| `npm run preview` | Preview the static frontend build; use Vercel for API verification |
