create extension if not exists pgcrypto;

create type public.app_role as enum ('viewer', 'writer', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  google_subject text,
  email text not null default '',
  display_name text not null default 'Google user',
  avatar_url text,
  nickname text,
  profile_image_key text,
  role public.app_role not null default 'viewer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null default '',
  excerpt text not null default '',
  body text not null default '',
  content_blocks jsonb not null default '[]'::jsonb,
  category text not null default 'Thoughts',
  images jsonb not null default '[]'::jsonb,
  author_id uuid not null references public.profiles (id) on delete cascade,
  author_name text not null default '',
  author_avatar_url text,
  author_avatar_storage_key text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index posts_published_at_idx
  on public.posts (published_at desc)
  where status = 'published';
create index posts_author_updated_idx
  on public.posts (author_id, updated_at desc);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function public.can_write_posts()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('writer', 'admin')
  );
$$;

revoke all on function public.is_admin() from public, anon;
revoke all on function public.can_write_posts() from public, anon;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.can_write_posts() to anon, authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, google_subject, email, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'sub',
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', new.email, 'Google user'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.sync_post_author_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.posts
  set author_name = coalesce(nullif(new.nickname, ''), new.display_name),
      author_avatar_url = new.avatar_url,
      author_avatar_storage_key = new.profile_image_key
  where author_id = new.id;
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_profile_updated
  before update of nickname, avatar_url, profile_image_key, display_name on public.profiles
  for each row execute function public.sync_post_author_profile();

create or replace function public.set_post_metadata()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  profile public.profiles%rowtype;
begin
  if tg_op = 'INSERT' then
    select * into profile from public.profiles where id = new.author_id;
    new.author_name := coalesce(nullif(profile.nickname, ''), profile.display_name, 'Google user');
    new.author_avatar_url := profile.avatar_url;
    new.author_avatar_storage_key := profile.profile_image_key;
    new.created_at := now();
  end if;

  new.updated_at := now();
  if new.status = 'published' then
    new.published_at := coalesce(new.published_at, now());
  else
    new.published_at := null;
  end if;
  return new;
end;
$$;

create trigger set_post_metadata_before_write
  before insert or update on public.posts
  for each row execute function public.set_post_metadata();

create or replace function public.admin_set_user_role(
  target_user_id uuid,
  requested_role public.app_role
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin()
     or target_user_id = (select auth.uid())
     or requested_role = 'admin'
     or not exists (
       select 1 from public.profiles
       where id = target_user_id and role <> 'admin'
     ) then
    raise exception 'You are not allowed to change this role.' using errcode = '42501';
  end if;

  update public.profiles
  set role = requested_role, updated_at = now()
  where id = target_user_id;
end;
$$;

revoke all on function public.admin_set_user_role(uuid, public.app_role) from public, anon;
grant execute on function public.admin_set_user_role(uuid, public.app_role) to authenticated;

alter table public.profiles enable row level security;
alter table public.posts enable row level security;

create policy profiles_select_self_or_admin on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and (
      profile_image_key is null
      or split_part(profile_image_key, '/', 1) = (select auth.uid())::text
    )
  );

create policy posts_select_published_or_owned on public.posts
  for select to anon, authenticated
  using (
    status = 'published'
    or (
      (select auth.uid()) is not null
      and (
        (author_id = (select auth.uid()) and (select public.can_write_posts()))
        or (select public.is_admin())
      )
    )
  );

create policy posts_insert_writer on public.posts
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (select public.can_write_posts())
    and not exists (
      select 1
      from jsonb_array_elements(images) as image(value)
      where image.value ? 'storageKey'
        and split_part(image.value ->> 'storageKey', '/', 1) <> (select auth.uid())::text
    )
  );

create policy posts_update_writer_or_admin on public.posts
  for update to authenticated
  using (
    (author_id = (select auth.uid()) and (select public.can_write_posts()))
    or (select public.is_admin())
  )
  with check (
    (
      author_id = (select auth.uid())
      and (select public.can_write_posts())
      and not exists (
        select 1
        from jsonb_array_elements(images) as image(value)
        where image.value ? 'storageKey'
          and split_part(image.value ->> 'storageKey', '/', 1) <> (select auth.uid())::text
      )
    )
    or (select public.is_admin())
  );

create policy posts_delete_admin on public.posts
  for delete to authenticated
  using ((select public.is_admin()));

grant select on public.profiles to authenticated;
grant update (nickname, profile_image_key) on public.profiles to authenticated;
grant select on public.posts to anon, authenticated;
grant insert (slug, title, excerpt, body, content_blocks, category, images, author_id, status) on public.posts to authenticated;
grant update (slug, title, excerpt, body, content_blocks, category, images, status) on public.posts to authenticated;
grant delete on public.posts to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-images',
  'blog-images',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy blog_images_read_owner_or_published on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'blog-images'
    and (
      (
        (select auth.uid())::text = (storage.foldername(name))[1]
        and (
          (select public.can_write_posts())
          or exists (
            select 1 from public.profiles p
            where p.id = (select auth.uid()) and p.profile_image_key = name
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

create policy blog_images_insert_owner on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'blog-images'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy blog_images_delete_owner_or_admin on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'blog-images'
    and (
      (select auth.uid())::text = (storage.foldername(name))[1]
      or (select public.is_admin())
    )
    and not exists (
      select 1 from public.posts p
      where p.images @> jsonb_build_array(jsonb_build_object('storageKey', name))
         or p.author_avatar_storage_key = name
    )
    and not exists (
      select 1 from public.profiles p where p.profile_image_key = name
    )
  );