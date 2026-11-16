<<<<<<< HEAD
# KaizenBlog

React, TypeScript, Vite, and React Router frontend backed by Supabase Auth, Postgres, Row Level Security, and private Storage. Public posts are readable without signing in; writing, drafts, and administration require a Supabase-authenticated user with the appropriate database role.
=======
# Goodword Blog

React, TypeScript, Vite, and React Router run on Vercel. Vercel Functions under `api/` authenticate requests and access Supabase Postgres and Storage. Supabase Auth manages Google sign-in; database and storage access is protected by Row Level Security.

## Set up Supabase

1. Create a Supabase project.
2. In **Project Settings → API**, copy the Project URL and publishable key. The legacy `anon` key is also supported.
3. Open `supabase/migrations/20261116000100_initial_blog_backend.sql` and run its contents in the Supabase SQL Editor. This creates the profile/post schema, role policies, and private image bucket.
4. In **Authentication → Providers**, enable Google and add the OAuth Client ID and secret from Google Cloud. Add Supabase's callback URL shown on that provider page to Google's authorized redirect URIs.
5. In **Authentication → URL Configuration**, set the site URL and allow the local Vercel development URL plus your Vercel Preview and Production URLs. Supabase redirects back to `/signin`.

## Environment variables

Copy `.env.example` to `.env.local` and fill in the project URL and publishable key. `.env.local` is ignored by Git.

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are used by the browser for Supabase Auth.
- `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are used by Vercel Functions. For local `vercel dev`, set these to the same values as the Vite variables.

Set both pairs in **Vercel Project Settings → Environment Variables** for Development, Preview, and Production. No service-role key is required by the current implementation. Never expose a Supabase secret/service-role key through a `VITE_` variable or commit it to source control.
>>>>>>> e37e27e (let's see)

## Run locally

```powershell
npm install
Copy-Item .env.example .env.local
# Fill in the four Supabase variables in .env.local, then:
npm run dev
```

<<<<<<< HEAD
Configure Supabase and Google sign-in before using the app; see the portable [Supabase setup guide](./supabase.md).
=======
`npm run dev` downloads/runs Vercel's CLI through `npx` so `/api/*` functions work alongside the Vite app. `npm run dev:vite` starts Vite only and does not provide the API functions. The first Vercel CLI run may ask you to log in and link the local folder to a Vercel project.
>>>>>>> e37e27e (let's see)

## Initial administrator

<<<<<<< HEAD
```text
src/
  auth/         Supabase session and profile context
  components/   Shared layout, guards, and image renderers
  data/         Empty demo post collection
  pages/        Public, writer, and admin route screens
  services/     Supabase repositories, permissions, and media
  types/        Profile, role, and blog domain models
supabase/
  migrations/   Database schema, RLS policies, and private media policies
```

## Supabase setup

1. Create a Supabase project.
2. In **SQL Editor**, run the migration in `supabase/migrations/20261108140000_shared_blog.sql`. This creates an empty posts table, profiles, role-management functions, RLS policies, and the private `media` bucket.
3. In **Authentication → Providers**, enable Google and enter the Google OAuth client ID and client secret. In Google Cloud Console, add `https://<project-ref>.supabase.co/auth/v1/callback` as an authorized redirect URI. In Supabase **Authentication → URL Configuration**, set the production Site URL and add local (`http://localhost:5173/**`) and Vercel URLs to the redirect allow list.
4. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and the project's public anon/publishable key as `VITE_SUPABASE_ANON_KEY`. These values are intended for browser use; **never** put the service-role key in Vite variables or commit credentials.
5. Run the app and sign in with Google. New profiles are viewers by default. To establish the first admin, find your profile UUID in the Supabase SQL Editor and run a trusted SQL update:

   ```sql
   select id, email, role from public.profiles;
   update public.profiles set role = 'admin' where id = '<your-profile-uuid>';
   ```

   Sign out and back in (or refresh the session) to load the new role. Admins can promote viewers to writers from **People & permissions**; role changes are validated in a database function and cannot be performed by editing browser storage.

For Vercel, configure the same two public environment variables in the project's environment settings and redeploy. Configure the production Vercel URL in Supabase's redirect allow list. The existing `vercel.json` rewrite supports direct visits and refreshes on `/posts/<slug>`.

## Authoring and storage

Posts and profiles are stored in Supabase Postgres. Image uploads are stored in the private `media` bucket with Row Level Security: owners can manage their uploads, and anonymous visitors can read only images referenced by published posts. Drafts are visible only to their author and admins. Public post pages do not require a login.

The shared backend starts empty by design. Existing posts and image blobs still present in an old browser's localStorage/IndexedDB are not imported or deleted by this integration; they are no longer used as the app's source of truth. Recreate any content you want to publish in the shared editor.

The service-role key must remain server-side and is not required by the browser app. Authorization is enforced by Supabase Auth, database RLS, and narrowly scoped database functions—not by frontend route guards.

## Commands

- `npm run dev` starts Vite.
- `npm test` runs unit tests.
=======
New Supabase users receive the `viewer` role. After signing in once with the designated administrator account, use the Supabase SQL Editor to inspect the profile and grant that account admin access:

```sql
select id, email, role from public.profiles;
update public.profiles set role = 'admin' where email = 'admin@example.com';
```

Replace the example address with the exact verified account email and confirm the update affected exactly one row. Admin roles cannot be assigned from the browser; subsequent writer promotions and revocations are checked by the API and a guarded database function.

## Data and image behavior

Published posts are readable publicly. Writers can manage their own drafts; admins can manage all posts and user roles. Image objects are stored in the private `blog-images` bucket. The API issues signed upload/read URLs, and storage policies allow readers to retrieve images referenced by published posts while draft images remain restricted.

Existing localStorage posts/users and IndexedDB images are not automatically imported. They are isolated to the browser and origin where they were created; export/import support is a separate migration step. `src/data/mockPosts.ts` is no longer an automatic data source once the Supabase repository is active.

## Commands

- `npm run dev` starts the Vercel local runtime.
- `npm run dev:vite` starts Vite without Vercel Functions.
- `npm test` runs Vitest.
>>>>>>> e37e27e (let's see)
- `npm run lint` runs ESLint.
- `npm run build` type-checks the app and API, then builds the production bundle.
- `npm run preview` previews the static Vite bundle; use Vercel Preview to test API functions.