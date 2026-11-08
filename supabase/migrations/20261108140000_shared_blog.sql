create extension if not exists pgcrypto;
grant usage on schema public to anon, authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  display_name text not null default 'Writer',
  avatar_url text,
  nickname text,
  profile_image_path text,
  role text not null default 'viewer' check (role in ('viewer', 'writer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (length(trim(slug)) > 0),
  title text not null,
  excerpt text not null default '',
  body text not null default '',
  content_blocks jsonb not null default '[]'::jsonb,
  category text not null default 'Thoughts',
  images jsonb not null default '[]'::jsonb,
  author_id uuid not null references public.profiles (id) on delete cascade,
  author_name text not null,
  author_avatar_url text,
  author_avatar_storage_key text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint posts_content_blocks_array check (jsonb_typeof(content_blocks) = 'array'),
  constraint posts_images_array check (jsonb_typeof(images) = 'array'),
  constraint published_posts_have_content check (
    status <> 'published'
    or (length(trim(title)) > 0 and length(trim(excerpt)) > 0 and length(trim(body)) >= 20)
  )
);

create index if not exists posts_published_at_idx
  on public.posts (published_at desc)
  where status = 'published';
create index if not exists posts_author_updated_idx
  on public.posts (author_id, updated_at desc);
create index if not exists posts_category_published_idx
  on public.posts (lower(category), published_at desc)
  where status = 'published';

create or replace function public.prepare_post_row()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  post_author public.profiles;
begin
  if tg_op = 'UPDATE' then
    if new.author_id <> old.author_id then
      raise exception 'A story author cannot be changed.';
    end if;
    new.created_at := old.created_at;
  else
    new.created_at := now();
  end if;

  select * into post_author
  from public.profiles
  where id = new.author_id;
  if not found then
    raise exception 'Story author profile was not found.';
  end if;
  new.author_name := coalesce(post_author.nickname, post_author.display_name);
  new.author_avatar_url := case
    when post_author.profile_image_path is null then post_author.avatar_url
    else null
  end;
  new.author_avatar_storage_key := post_author.profile_image_path;
  new.updated_at := now();
  if tg_op = 'INSERT' then
    new.published_at := case when new.status = 'published' then now() else null end;
  elsif new.status = 'published' then
    new.published_at := case
      when old.status = 'published' then old.published_at
      else now()
    end;
  else
    new.published_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists prepare_posts on public.posts;
create trigger prepare_posts
  before insert or update on public.posts
  for each row execute function public.prepare_post_row();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.can_write_content()
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('writer', 'admin')
  );
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, 'Writer'), '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

insert into public.profiles (id, email, display_name, avatar_url)
select
  id,
  coalesce(email, ''),
  coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', split_part(coalesce(email, 'Writer'), '@', 1)),
  raw_user_meta_data ->> 'avatar_url'
from auth.users
on conflict (id) do nothing;

create or replace function public.update_my_profile(
  nickname_input text,
  profile_image_path_input text
)
returns public.profiles
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  updated_profile public.profiles;
  normalized_nickname text := trim(coalesce(nickname_input, ''));
begin
  if normalized_nickname = '' or length(normalized_nickname) > 40 then
    raise exception 'Nickname must be between 1 and 40 characters.';
  end if;

  if profile_image_path_input is not null and (
    (select auth.uid()) is null
    or split_part(profile_image_path_input, '/', 1) <> (select auth.uid())::text
    or split_part(profile_image_path_input, '/', 2) <> 'avatars'
    or split_part(profile_image_path_input, '/', 3) = ''
  ) then
    raise exception 'Profile image path is invalid.';
  end if;

  update public.profiles
  set nickname = normalized_nickname,
      profile_image_path = profile_image_path_input,
      updated_at = now()
  where id = (select auth.uid())
  returning * into updated_profile;

  if not found then
    raise exception 'Profile not found.';
  end if;

  update public.posts
  set author_name = coalesce(updated_profile.nickname, updated_profile.display_name),
      author_avatar_url = case
        when updated_profile.profile_image_path is null then updated_profile.avatar_url
        else null
      end,
      author_avatar_storage_key = updated_profile.profile_image_path
  where author_id = updated_profile.id;

  return updated_profile;
end;
$$;

create or replace function public.set_user_role(
  target_user_id uuid,
  next_role text
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  current_role text;
begin
  if not public.is_admin() then
    raise exception 'Only admins can manage user roles.';
  end if;
  if target_user_id = (select auth.uid()) then
    raise exception 'You cannot change your own role.';
  end if;
  if next_role not in ('viewer', 'writer') then
    raise exception 'Only viewer and writer roles can be assigned.';
  end if;

  select role into current_role
  from public.profiles
  where id = target_user_id
  for update;
  if current_role is null or current_role not in ('viewer', 'writer') then
    raise exception 'This user role cannot be changed.';
  end if;

  update public.profiles
  set role = next_role, updated_at = now()
  where id = target_user_id;
end;
$$;

alter table public.profiles enable row level security;
alter table public.posts enable row level security;

drop policy if exists "Profiles are visible to owners and admins" on public.profiles;
create policy "Profiles are visible to owners and admins"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Public can read published posts" on public.posts;
create policy "Public can read published posts"
  on public.posts for select to anon, authenticated
  using (
    status = 'published'
    or (
      author_id = (select auth.uid())
      and (select public.can_write_content())
    )
    or (select public.is_admin())
  );

drop policy if exists "Writers can create their own posts" on public.posts;
create policy "Writers can create their own posts"
  on public.posts for insert to authenticated
  with check (author_id = (select auth.uid()) and (select public.can_write_content()));

drop policy if exists "Authors and admins can update posts" on public.posts;
create policy "Authors and admins can update posts"
  on public.posts for update to authenticated
  using (
    (author_id = (select auth.uid()) and (select public.can_write_content()))
    or (select public.is_admin())
  )
  with check (
    (author_id = (select auth.uid()) and (select public.can_write_content()))
    or (select public.is_admin())
  );

drop policy if exists "Admins can delete posts" on public.posts;
create policy "Admins can delete posts"
  on public.posts for delete to authenticated
  using ((select public.is_admin()));

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
revoke all on public.posts from anon, authenticated;
grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;
revoke all on function public.update_my_profile(text, text) from public, anon, authenticated;
revoke all on function public.set_user_role(uuid, text) from public, anon, authenticated;
revoke all on function public.can_write_content() from public, anon, authenticated;
grant execute on function public.update_my_profile(text, text) to authenticated;
grant execute on function public.set_user_role(uuid, text) to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.can_write_content() to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Owners can upload media" on storage.objects;
create policy "Owners can upload media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (
      ((storage.foldername(name))[2] = 'avatars')
      or (
        (storage.foldername(name))[2] = 'post-images'
        and (select public.can_write_content())
      )
    )
  );

drop policy if exists "Owners and published stories can read media" on storage.objects;
create policy "Owners and published stories can read media"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'media'
    and (
      (
        (storage.foldername(name))[1] = (select auth.uid())::text
        and (
          (storage.foldername(name))[2] = 'avatars'
          or (
            (storage.foldername(name))[2] = 'post-images'
            and (select public.can_write_content())
          )
        )
      )
      or (select public.is_admin())
      or exists (
        select 1 from public.posts p
        where p.status = 'published'
          and (
            p.images @> jsonb_build_array(jsonb_build_object('storageKey', name))
            or p.author_avatar_storage_key = name
          )
      )
    )
  );

drop policy if exists "Owners and admins can delete media" on storage.objects;
create policy "Owners and admins can delete media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'media'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_admin())
    )
  );

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.prepare_post_row() from public, anon, authenticated;
