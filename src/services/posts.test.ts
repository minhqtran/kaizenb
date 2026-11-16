import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppUser } from "../types/user";
import type { BlogPost, PostInput } from "../types/post";
import { apiRequest } from "./apiClient";
import { removeImages } from "./imageStorage";
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
import { legacyContentBlocks, validatePostInput } from "./postValidation";

vi.mock("./apiClient", () => ({ apiRequest: vi.fn() }));
vi.mock("./imageStorage", () => ({ removeImages: vi.fn() }));

const writer: AppUser = {
  id: "writer-1",
  googleSubject: "sub-1",
  email: "writer@example.test",
  displayName: "Writer One",
  role: "writer",
};
const input: PostInput = {
  title: "A new story",
  slug: "a-new-story",
  excerpt: "A short summary",
  body: "A little more than twenty characters in this draft.",
  images: [],
  category: "Life & culture",
  status: "draft",
};
const post: BlogPost = {
  ...input,
  id: "post-1",
  authorId: writer.id,
  authorName: writer.displayName,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const requestMock = vi.mocked(apiRequest);
const removeImagesMock = vi.mocked(removeImages);

describe("remote post repository", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads published posts through the API", async () => {
    requestMock.mockResolvedValueOnce([post] as never);
    await expect(getPosts()).resolves.toEqual([post]);
    expect(requestMock).toHaveBeenCalledWith("posts");
  });

  it("uses server-owned identity for post creation", async () => {
    requestMock.mockResolvedValueOnce(post as never);
    await createPost(input, writer);
    expect(requestMock).toHaveBeenCalledWith("posts", {
      method: "POST",
      body: JSON.stringify(input),
    });
  });

  it("routes writer and admin queries to their protected endpoints", async () => {
    requestMock.mockResolvedValue([] as never);
    await getMyPosts(writer);
    await getAllPosts(writer);
    expect(requestMock.mock.calls.map(([path]) => path)).toEqual([
      "posts/mine",
      "admin/posts",
    ]);
  });

  it("encodes slugs and uses PATCH for updates", async () => {
    requestMock.mockResolvedValueOnce(post as never);
    await getPost("story/one", writer);
    requestMock.mockResolvedValueOnce(post as never);
    await updatePost("story/one", input, writer);
    expect(requestMock.mock.calls).toEqual([
      ["posts/story%2Fone"],
      [
        "posts/story%2Fone",
        { method: "PATCH", body: JSON.stringify(input) },
      ],
    ]);
  });

  it("removes image objects returned by an admin delete", async () => {
    requestMock.mockResolvedValueOnce({ imageKeys: ["writer-1/post-images/cover.jpg"] } as never);
    await deletePost(post.slug, writer);
    expect(requestMock).toHaveBeenCalledWith(`posts/${post.slug}`, {
      method: "DELETE",
    });
    expect(removeImagesMock).toHaveBeenCalledWith([
      "writer-1/post-images/cover.jpg",
    ]);
  });

  it("reports image cleanup failure after the post was deleted", async () => {
    requestMock.mockResolvedValueOnce({ imageKeys: ["writer-1/post-images/cover.jpg"] } as never);
    removeImagesMock.mockRejectedValueOnce(new Error("Storage unavailable"));
    await expect(deletePost(post.slug, writer)).rejects.toThrow(
      "Story deleted, but image cleanup failed: Storage unavailable",
    );
  });

  it("filters categories after loading published posts", async () => {
    requestMock.mockResolvedValueOnce([
      post,
      { ...post, id: "post-2", category: "Thoughts" },
    ] as never);
    await expect(getPostsByCategory(" life & CULTURE ")).resolves.toEqual([post]);
  });
});

describe("post validation and legacy content", () => {
  it("rejects incomplete publishing and image alt text", () => {
    expect(() =>
      validatePostInput({ ...input, status: "published", title: "" }),
    ).toThrow("requires a title");
    expect(() =>
      validatePostInput({
        ...input,
        status: "published",
        images: [{ id: "image-1", src: "", alt: " ", layout: "featured" }],
      }),
    ).toThrow("alternative text");
  });

  it("keeps legacy text and image blocks in their reading order", () => {
    expect(
      legacyContentBlocks("First paragraph.\n\nSecond paragraph.", [
        { id: "cover", src: "", alt: "Cover", layout: "featured" },
        { id: "inline", src: "", alt: "Inline", layout: "inline" },
        { id: "end", src: "", alt: "End", layout: "full-width" },
      ]).map((block) =>
        block.type === "image" ? block.imageId : block.content,
      ),
    ).toEqual(["cover", "First paragraph.", "inline", "Second paragraph.", "end"]);
  });
});