import { effectiveDisplayName, type AppUser } from "../types/user";
import type { BlogImage, BlogPost, PostInput, StoryBlock } from "../types/post";
import { createSlug } from "../utils/formatDate";
import { removeImages } from "./imageStorage";
import { getSupabaseClient } from "./supabase";
import { canAdmin, canEditPost, canWrite } from "./permissions";

type PostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  content_blocks: StoryBlock[];
  category: string;
  images: BlogImage[];
  author_id: string;
  author_name: string;
  author_avatar_url: string | null;
  author_avatar_storage_key: string | null;
  status: BlogPost["status"];
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

function legacyContentBlocks(body: string, images: BlogImage[]): StoryBlock[] {
  const blocks: StoryBlock[] = [];
  const inlineImages = images.filter((image) => image.layout === "inline");
  let inlineIndex = 0;

  images
    .filter((image) => image.layout === "featured")
    .forEach((image) =>
      blocks.push({
        id: `image-${image.id}`,
        type: "image",
        imageId: image.id,
      }),
    );
  body
    .split(/\n\s*\n/)
    .filter(Boolean)
    .forEach((paragraph, index) => {
      blocks.push({
        id: `text-${index}`,
        type: "markdown",
        content: paragraph,
      });
      const inlineImage = inlineImages[inlineIndex++];
      if (inlineImage)
        blocks.push({
          id: `image-${inlineImage.id}`,
          type: "image",
          imageId: inlineImage.id,
        });
    });
  inlineImages.slice(inlineIndex).forEach((image) =>
    blocks.push({
      id: `image-${image.id}`,
      type: "image",
      imageId: image.id,
    }),
  );
  images
    .filter((image) => image.layout !== "featured" && image.layout !== "inline")
    .forEach((image) =>
      blocks.push({
        id: `image-${image.id}`,
        type: "image",
        imageId: image.id,
      }),
    );
  return blocks;
}

function normalizePost(post: PostRow): BlogPost {
  const images = (post.images ?? []).map((image) => ({
    ...image,
    size: image.size ?? "full",
  }));
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    body: post.body,
    contentBlocks: Array.isArray(post.content_blocks)
      ? post.content_blocks
      : legacyContentBlocks(post.body ?? "", images),
    category: post.category,
    images,
    authorId: post.author_id,
    authorName: post.author_name,
    ...(post.author_avatar_url
      ? { authorAvatarUrl: post.author_avatar_url }
      : {}),
    ...(post.author_avatar_storage_key
      ? { authorAvatarStorageKey: post.author_avatar_storage_key }
      : {}),
    status: post.status,
    createdAt: post.created_at,
    updatedAt: post.updated_at,
    ...(post.published_at ? { publishedAt: post.published_at } : {}),
  };
}

function validateForPublish(input: PostInput) {
  const storyText =
    input.contentBlocks
      ?.filter((block) => block.type === "markdown")
      .map((block) => block.content)
      .join("\n\n") ?? input.body;
  if (
    !input.title.trim() ||
    !input.excerpt.trim() ||
    storyText.trim().length < 20
  ) {
    throw new Error(
      "Publishing requires a title, short introduction, and at least 20 characters of story text.",
    );
  }
  if (input.images.some((image) => !image.alt.trim())) {
    throw new Error("Add alternative text to every image before publishing.");
  }
}

function throwPostError(error: { code?: string; message: string }): never {
  throw new Error(error.message || "Unable to save this story.");
}

function rowFromInput(
  input: PostInput,
  author: AppUser,
  slug: string,
  id?: string,
) {
  return {
    ...(id ? { id } : {}),
    slug,
    title: input.title.trim(),
    excerpt: input.excerpt.trim(),
    body: input.body,
    content_blocks:
      input.contentBlocks ?? legacyContentBlocks(input.body, input.images),
    category: input.category,
    images: input.images,
    author_id: author.id,
    author_name: effectiveDisplayName(author),
    author_avatar_url: author.profileImageKey ? null : (author.avatarUrl ?? null),
    author_avatar_storage_key: author.profileImageKey ?? null,
    status: input.status,
  };
}

export async function getPosts(): Promise<BlogPost[]> {
  const { data, error } = await getSupabaseClient()
    .from("posts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  if (error) throw new Error(error.message || "Unable to load stories.");
  if (!data) throw new Error("The shared story list could not be read.");
  return (data as PostRow[]).map(normalizePost);
}

export async function getAllPosts(actor: AppUser): Promise<BlogPost[]> {
  if (!canAdmin(actor)) throw new Error("Only admins can manage all posts.");
  const { data, error } = await getSupabaseClient()
    .from("posts")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message || "Unable to load posts.");
  if (!data) throw new Error("The shared story list could not be read.");
  return (data as PostRow[]).map(normalizePost);
}

export async function getMyPosts(actor: AppUser): Promise<BlogPost[]> {
  if (!canWrite(actor))
    throw new Error("Writer access is required to view your stories.");
  let query = getSupabaseClient()
    .from("posts")
    .select("*")
    .order("updated_at", { ascending: false });
  if (!canAdmin(actor)) query = query.eq("author_id", actor.id);
  const { data, error } = await query;
  if (error) throw new Error(error.message || "Unable to load your stories.");
  if (!data) throw new Error("Your shared stories could not be read.");
  return (data as PostRow[]).map(normalizePost);
}

export async function getPost(
  slug: string,
  actor?: AppUser | null,
): Promise<BlogPost> {
  const { data, error } = await getSupabaseClient()
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message || "Unable to load this story.");
  if (!data) throw new Error("This story could not be found.");
  const post = normalizePost(data as PostRow);
  if (post.status === "draft" && !canEditPost(actor, post.authorId))
    throw new Error("This story could not be found.");
  return post;
}

export async function createPost(
  input: PostInput,
  actor: AppUser,
): Promise<BlogPost> {
  if (!canWrite(actor))
    throw new Error("Writer access is required to create stories.");
  if (input.status === "published") validateForPublish(input);
  const baseSlug = createSlug(input.slug || input.title) || `story-${Date.now()}`;
  for (let suffix = 1; suffix <= 100; suffix += 1) {
    const slug = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`;
    const { data, error } = await getSupabaseClient()
      .from("posts")
      .insert(rowFromInput(input, actor, slug))
      .select("*")
      .single();
    if (!error && data) return normalizePost(data as PostRow);
    if (!error) throw new Error("The saved story was not returned.");
    if (error.code !== "23505") throwPostError(error);
  }
  throw new Error("Unable to find an available URL for this story.");
}

export async function updatePost(
  slug: string,
  input: PostInput,
  actor: AppUser,
): Promise<BlogPost> {
  const existing = await getPost(slug, actor);
  if (!canEditPost(actor, existing.authorId))
    throw new Error("You cannot edit this story.");
  if (input.status === "published") validateForPublish(input);
  const baseSlug = createSlug(input.slug || input.title) || `story-${Date.now()}`;
  const author = {
    ...actor,
    id: existing.authorId,
    displayName: existing.authorName,
    avatarUrl: existing.authorAvatarUrl,
    profileImageKey: existing.authorAvatarStorageKey,
  };
  for (let suffix = 1; suffix <= 100; suffix += 1) {
    const slug = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`;
    const { data, error } = await getSupabaseClient()
      .from("posts")
      .update(rowFromInput(input, author, slug, existing.id))
      .eq("id", existing.id)
      .select("*")
      .single();
    if (!error && data) return normalizePost(data as PostRow);
    if (!error) throw new Error("The updated story was not returned.");
    if (error.code !== "23505") throwPostError(error);
  }
  throw new Error("Unable to find an available URL for this story.");
}

export async function deletePost(slug: string, actor: AppUser): Promise<void> {
  if (!canAdmin(actor)) throw new Error("Only admins can remove posts.");
  const existing = await getPost(slug, actor);
  const { error } = await getSupabaseClient()
    .from("posts")
    .delete()
    .eq("id", existing.id);
  if (error) throw new Error(error.message || "Unable to remove this story.");
  try {
    await removeImages(
      existing.images
        .map((image) => image.storageKey)
        .filter((key): key is string => Boolean(key)),
    );
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Unable to remove story images.";
    throw new Error(`Story deleted, but image cleanup failed: ${message}`, {
      cause,
    });
  }
}

export async function getPostsByCategory(
  category: string,
): Promise<BlogPost[]> {
  const normalizedCategory = category.trim().toLowerCase();
  return (await getPosts()).filter(
    (post) => post.category.trim().toLowerCase() === normalizedCategory,
  );
}
