# Supabase setup guide

This guide gets KaizenBlog's shared posts and image uploads working on another computer. The app is already wired to Supabase; this document covers creating/configuring the Supabase project, running the database migration, configuring Google sign-in, and deploying the frontend.

## What this setup provides

- Supabase Auth with Google sign-in.
- Post metadata and content in Supabase Postgres.
- Row Level Security (RLS) for public published posts, author-owned drafts, and admin tools.
- A private Supabase Storage bucket for post images and profile pictures.
- An initially empty shared database. Posts saved only in the old browser's localStorage and images in its IndexedDB are not imported.

## Requirements

- A Supabase account and a new or existing Supabase project.
- A Google Cloud project where you can configure OAuth credentials.
- Access to the Vercel project to configure production environment variables.
- Node.js and npm installed on the development computer.

## 1. Get the code and install dependencies

Clone the repository or pull the latest changes onto the other computer, then run these commands from the repository folder in PowerShell:

```powershell
npm install
Copy-Item .env.example .env.local
```

Do not commit `.env.local`.

## 2. Create/configure the Supabase project

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard), or select the project you intend to use.
2. In **Project Settings → API** (or **Data API**), copy:
   - The Project URL.
   - The public anon/publishable key.
3. Keep the **service-role key** private. This frontend does not need it. Never put it in a `VITE_` variable, source file, or Git commit.

## 3. Apply the database migration

In the Supabase Dashboard, open **SQL Editor**, create a query, paste the complete contents of:

```text
supabase/migrations/20261108140000_shared_blog.sql
```

Run it against the project. It creates the `profiles` and `posts` tables, role and timestamp functions, RLS policies, and the private `media` Storage bucket. It also creates profiles for any Supabase Auth users that already exist. The posts table is intentionally empty.

This migration is designed to be rerunnable. If you change the migration later, apply the new SQL changes to the Supabase project too; changing a local file alone does not update the hosted database.

## 4. Configure Google OAuth

### Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/) and select/create a project.
2. Configure the OAuth consent screen with the app's required name and contact details.
3. Create an OAuth client ID with application type **Web application**.
4. Add this URI under **Authorized redirect URIs**, replacing `<project-ref>` with the Supabase project reference:

   ```text
   https://<project-ref>.supabase.co/auth/v1/callback
   ```

5. Copy the OAuth client ID and client secret.

### Supabase Dashboard

1. Open **Authentication → Providers → Google**.
2. Enable Google and enter the Google OAuth client ID and client secret.
3. Open **Authentication → URL Configuration**:
   - Set the **Site URL** to the production site, for example `https://kaizenb.vercel.app`.
   - Add the local development callback to the redirect allow list:

     ```text
     http://localhost:5173/**
     ```

   - Add the production frontend:

     ```text
     https://kaizenb.vercel.app/**
     ```

   - Add any Vercel preview domains you plan to use. Only allow domains you control.

The Google client secret belongs in Supabase's provider settings, not in this repository or frontend environment variables.

## 5. Configure local environment variables

Edit `.env.local` and set the values from the Supabase project:

```dotenv
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<public-anon-or-publishable-key>
```

Use the public anon/publishable key, not the service-role key. Restart Vite after changing environment variables:

```powershell
npm run dev
```

Open the local address printed by Vite, sign in with Google, and verify that a row for the account appears in `public.profiles`.

## 6. Grant the first admin

All new accounts start with the `viewer` role. To initialize the first admin, use Supabase **SQL Editor** (a trusted project-admin operation):

```sql
select id, email, role from public.profiles;
```

Copy your account's UUID and run:

```sql
update public.profiles
set role = 'admin'
where id = '<your-profile-uuid>';
```

Sign out and sign back in to refresh the role in the app. Admins can promote viewers to writers or revoke writer access from **People & permissions**. The app does not allow assigning admin through its UI.

## 7. Configure Vercel and deploy

In the Vercel project settings, add these environment variables for the environments you use:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Then redeploy. Confirm the production URL is in Supabase's Authentication redirect allow list. The repository's `vercel.json` rewrite supports direct visits and browser refreshes on post routes such as `/posts/my-story`.

## 8. Verify the setup

From the repository folder, run:

```powershell
npm test
npm run lint
npm run build
```

Then verify manually in the configured app:

1. Sign in with Google and check that a profile row is created.
2. Promote your profile to admin using the SQL in step 6, then sign out/in.
3. Create a writer account by signing in with another Google account and promoting it from **People & permissions**.
4. As that writer, create and publish a post with an image.
5. Open the published post URL in a signed-out browser or private window. The post and its published images should load without signing in.
6. Save a draft and confirm that it is not visible when signed out or signed in as another writer.

## Troubleshooting

- **“Shared storage is not configured”**: check the two `VITE_SUPABASE_*` values and restart Vite; for production, set them in Vercel and redeploy.
- **Google sign-in redirect error**: make sure the Supabase callback URI is an authorized redirect URI in Google Cloud, and that the local/production frontend URLs are in Supabase's redirect allow list.
- **Post/profile request returns an RLS or permission error**: check that the migration completed successfully and that the signed-in profile has the intended role.
- **Image upload or display fails**: confirm the `media` bucket and its policies exist, and check that the signed-in user is a writer/admin when uploading post images.
- **Account stays a viewer after promotion**: sign out and back in to reload the profile role.

## Security notes

- Never commit `.env.local`, Google OAuth client secrets, or the Supabase service-role key.
- The anon/publishable key is expected to be visible in the frontend; RLS policies must remain enabled.
- Do not remove or weaken the RLS policies to fix a frontend permission issue. Diagnose the authenticated user and policy first.
- Public visitors can read published posts only. Drafts and user management require the appropriate authenticated role.
