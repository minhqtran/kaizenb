# KaizenBlog

React, TypeScript, Vite, and React Router frontend backed by Supabase Auth, Postgres, Row Level Security, and private Storage. Public posts are readable without signing in; writing, drafts, and administration require a Supabase-authenticated user with the appropriate database role.

## Run locally

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Configure Supabase and Google sign-in before using the app; see the portable [Supabase setup guide](./supabase.md).

## Structure

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
- `npm run lint` runs ESLint.
- `npm run build` type-checks and creates the production bundle.
- `npm run preview` serves the production bundle locally.
