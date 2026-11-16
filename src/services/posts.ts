import type { AppUser } from "../types/user";
import type { BlogPost, PostInput } from "../types/post";
import { apiRequest } from "./apiClient";
import { removeImages } from "./imageStorage";
import { validatePostInput } from "./postValidation";

export async function getPosts(): Promise<BlogPost[]> {
  const posts = await apiRequest<unknown>("posts");
  if (!Array.isArray(posts))
    throw new Error("The posts API did not return a list of stories.");
  return posts as BlogPost[];
}

export async function getAllPosts(actor: AppUser): Promise<BlogPost[]> {
  void actor;
  return apiRequest<BlogPost[]>("admin/posts");
}

export async function getMyPosts(actor: AppUser): Promise<BlogPost[]> {
  void actor;
  return apiRequest<BlogPost[]>("posts/mine");
}

export async function getPost(
  slug: string,
  actor?: AppUser | null,
): Promise<BlogPost> {
  void actor;
  return apiRequest<BlogPost>(`posts/${encodeURIComponent(slug)}`);
}

export async function createPost(
  input: PostInput,
  actor: AppUser,
): Promise<BlogPost> {
  void actor;
  validatePostInput(input);
  return apiRequest<BlogPost>("posts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updatePost(
  slug: string,
  input: PostInput,
  actor: AppUser,
): Promise<BlogPost> {
  void actor;
  validatePostInput(input);
  return apiRequest<BlogPost>(`posts/${encodeURIComponent(slug)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deletePost(slug: string, actor: AppUser): Promise<void> {
  void actor;
  const { imageKeys } = await apiRequest<{ imageKeys: string[] }>(
    `posts/${encodeURIComponent(slug)}`,
    { method: "DELETE" },
  );
  try {
    await removeImages(imageKeys);
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : "Unable to clean up images.";
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