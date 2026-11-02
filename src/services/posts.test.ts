import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppUser } from "../types/user";
import {
  createPost,
  deletePost,
  getAllPosts,
  getMyPosts,
  getPost,
  getPosts,
  getPostsByCategory,
  updatePost,
} from "./posts";

const writer: AppUser = {
  id: "writer-1",
  googleSubject: "sub-1",
  email: "writer@example.test",
  displayName: "Writer One",
  role: "writer",
};
const otherWriter: AppUser = {
  id: "writer-2",
  googleSubject: "sub-2",
  email: "writer2@example.test",
  displayName: "Writer Two",
  role: "writer",
};
const admin: AppUser = {
  id: "admin-1",
  googleSubject: "sub-admin",
  email: "admin@example.test",
  displayName: "Admin",
  role: "admin",
};
const input = {
  title: "A new story",
  slug: "a-new-story",
  excerpt: "A short summary",
  body: "A little more than twenty characters in this draft.",
  images: [],
  category: "Life & culture",
  status: "draft" as const,
};

function installStorage() {
  const values = new Map<string, string>([["goodword.posts.v1", "[]"]]);
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
}

describe("local post repository", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    installStorage();
  });

  it("creates drafts with the signed-in writer as the canonical author", async () => {
    const post = await createPost(input, writer);
    expect(post.authorId).toBe(writer.id);
    expect(post.authorName).toBe(writer.displayName);
    expect(post.status).toBe("draft");
    expect(post.publishedAt).toBeUndefined();
    expect(await getPosts()).toHaveLength(0);
    expect((await getMyPosts(writer))[0].id).toBe(post.id);
  });

  it("hides drafts from viewers and other writers", async () => {
    const post = await createPost(input, writer);
    await expect(getPost(post.slug)).rejects.toThrow("could not be found");
    await expect(getPost(post.slug, otherWriter)).rejects.toThrow(
      "could not be found",
    );
    await expect(
      updatePost(post.slug, { ...input, title: "Changed" }, otherWriter),
    ).rejects.toThrow("cannot edit");
    await expect(getMyPosts(otherWriter)).resolves.toEqual([]);
  });

  it("preserves original author attribution when an admin edits another writer post", async () => {
    const post = await createPost(input, writer);
    const updated = await updatePost(
      post.slug,
      { ...input, title: "Admin edit", status: "published" },
      admin,
    );
    expect(updated.authorId).toBe(writer.id);
    expect(updated.authorName).toBe(writer.displayName);
    expect(updated.publishedAt).toBeTruthy();
    await expect(getPost(updated.slug)).resolves.toMatchObject({
      title: "Admin edit",
      authorId: writer.id,
    });
  });

  it("limits cross-author post discovery and deletion to admins", async () => {
    const post = await createPost(input, writer);
    await expect(getAllPosts(writer)).rejects.toThrow("Only admins");
    await expect(deletePost(post.slug, writer)).rejects.toThrow("Only admins");
    await expect(getAllPosts(admin)).resolves.toHaveLength(1);
    await deletePost(post.slug, admin);
    await expect(getAllPosts(admin)).resolves.toHaveLength(0);
  });

  it("rejects publishing incomplete stories and images without alt text", async () => {
    await expect(
      createPost({ ...input, status: "published", title: "" }, writer),
    ).rejects.toThrow("requires a title");
    await expect(
      createPost(
        {
          ...input,
          status: "published",
          images: [{ id: "image-1", src: "", alt: " ", layout: "featured" }],
        },
        writer,
      ),
    ).rejects.toThrow("alternative text");
  });

  it("normalizes legacy body and image records into their original reading order", async () => {
    localStorage.setItem(
      "goodword.posts.v1",
      JSON.stringify([
        {
          ...input,
          id: "legacy-post",
          slug: "legacy-post",
          authorId: writer.id,
          authorName: writer.displayName,
          status: "draft",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          body: "First paragraph.\n\nSecond paragraph.",
          images: [
            { id: "cover", src: "", alt: "Cover", layout: "featured" },
            { id: "inline", src: "", alt: "Inline", layout: "inline" },
            { id: "end", src: "", alt: "End", layout: "full-width" },
          ],
        },
      ]),
    );
    const post = await getPost("legacy-post", writer);
    expect(
      post.contentBlocks?.map((block) =>
        block.type === "image" ? block.imageId : block.content,
      ),
    ).toEqual([
      "cover",
      "First paragraph.",
      "inline",
      "Second paragraph.",
      "end",
    ]);
  });

  it("persists ordered blocks and filters published stories by category", async () => {
    const contentBlocks = [
      {
        id: "text-1",
        type: "markdown" as const,
        content: "A story about a favorite record, worth listening to again.",
      },
      { id: "image-1", type: "image" as const, imageId: "music-image" },
    ];
    const musicStory = await createPost(
      {
        ...input,
        category: "Music",
        status: "published",
        contentBlocks,
        images: [
          {
            id: "music-image",
            src: "",
            alt: "Record player",
            layout: "inline",
          },
        ],
      },
      writer,
    );
    await createPost(
      {
        ...input,
        title: "A thought",
        slug: "a-thought",
        category: "Thoughts",
        status: "published",
      },
      writer,
    );
    expect((await getPost(musicStory.slug)).contentBlocks).toEqual(
      contentBlocks,
    );
    expect(
      (await getPostsByCategory(" music ")).map((post) => post.id),
    ).toEqual([musicStory.id]);
  });
});
