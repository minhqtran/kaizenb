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

type TestRow = Record<string, unknown>;
type TestError = { code?: string; message: string };
type QueryResult = { data: unknown; error: TestError | null };

const { rows, client } = vi.hoisted(() => ({
  rows: [] as TestRow[],
  client: {
    from: vi.fn(),
    storage: { from: vi.fn() },
  },
}));

vi.mock("./supabase", () => ({ getSupabaseClient: () => client }));
vi.mock("./imageStorage", () => ({
  removeImages: vi.fn().mockResolvedValue(undefined),
}));

class FakeQuery {
  private action = "select";
  private payload: TestRow = {};
  private filters: Array<[string, unknown]> = [];

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, value]);
    return this;
  }

  order() {
    return this;
  }

  insert(value: TestRow) {
    this.action = "insert";
    this.payload = value;
    return this;
  }

  update(value: TestRow) {
    this.action = "update";
    this.payload = value;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  single() {
    return this.run().then((result) => ({
      ...result,
      data: Array.isArray(result.data) ? result.data[0] ?? null : result.data,
    }));
  }

  maybeSingle() {
    return this.single();
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?:
      | ((value: QueryResult) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.run().then(onfulfilled, onrejected);
  }

  private run(): Promise<QueryResult> {
    const matches = (row: TestRow) =>
      this.filters.every(([column, value]) => row[column] === value);
    if (this.action === "select")
      return Promise.resolve({
        data: rows.filter(matches).map((row) => ({ ...row })),
        error: null,
      });

    if (this.action === "insert") {
      if (rows.some((row) => row.slug === this.payload.slug))
        return Promise.resolve({
          data: null,
          error: { code: "23505", message: "duplicate slug" },
        });
      const now = "2026-11-08T00:00:00.000Z";
      const row = {
        ...this.payload,
        id: `post-${rows.length + 1}`,
        created_at: now,
        updated_at: now,
        published_at: this.payload.status === "published" ? now : null,
      };
      rows.unshift(row);
      return Promise.resolve({ data: [row], error: null });
    }

    const selectedRows = rows.filter(matches);
    if (this.action === "update") {
      const duplicate = rows.some(
        (row) =>
          row.slug === this.payload.slug && !selectedRows.includes(row),
      );
      if (duplicate)
        return Promise.resolve({
          data: null,
          error: { code: "23505", message: "duplicate slug" },
        });
      const now = "2026-11-08T00:00:00.000Z";
      selectedRows.forEach((row) => {
        Object.assign(row, this.payload, {
          updated_at: now,
          published_at:
            this.payload.status === "published"
              ? (row.published_at ?? now)
              : null,
        });
      });
      return Promise.resolve({ data: selectedRows, error: null });
    }

    for (const row of selectedRows) {
      const index = rows.indexOf(row);
      if (index >= 0) rows.splice(index, 1);
    }
    return Promise.resolve({ data: null, error: null });
  }
}

const writer: AppUser = {
  id: "writer-1",
  email: "writer@example.test",
  displayName: "Writer One",
  role: "writer",
};
<<<<<<< HEAD
const otherWriter: AppUser = {
  id: "writer-2",
  email: "writer2@example.test",
  displayName: "Writer Two",
  role: "writer",
};
const admin: AppUser = {
  id: "admin-1",
  email: "admin@example.test",
  displayName: "Admin",
  role: "admin",
};
const input = {
=======
const input: PostInput = {
>>>>>>> e37e27e (let's see)
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

<<<<<<< HEAD
describe("Supabase post repository", () => {
  beforeEach(() => {
    rows.length = 0;
    client.from.mockImplementation(() => new FakeQuery());
    client.storage.from.mockReturnValue({
      remove: vi.fn().mockResolvedValue({ error: null }),
    });
  });

  it("starts with an empty public feed", async () => {
    await expect(getPosts()).resolves.toEqual([]);
  });

  it("creates editable drafts for their writer without exposing them publicly", async () => {
    const post = await createPost(input, writer);
    expect(post).toMatchObject({
      authorId: writer.id,
      authorName: writer.displayName,
      status: "draft",
    });
    await expect(getPosts()).resolves.toEqual([]);
    await expect(getMyPosts(writer)).resolves.toMatchObject([
      { id: post.id, slug: post.slug },
    ]);
    await expect(getPost(post.slug)).rejects.toThrow("could not be found");
    await expect(getPost(post.slug, otherWriter)).rejects.toThrow(
      "could not be found",
    );
  });

  it("publishes stories for anonymous readers and filters by category", async () => {
    const post = await createPost(
      { ...input, status: "published", category: "Music" },
      writer,
    );
    await expect(getPost(post.slug)).resolves.toMatchObject({
      title: input.title,
      status: "published",
    });
    await expect(getPostsByCategory(" music ")).resolves.toMatchObject([
      { id: post.id, category: "Music" },
    ]);
  });

  it("preserves author attribution when an admin edits another writer's post", async () => {
    const post = await createPost(input, writer);
    const updated = await updatePost(
      post.slug,
      { ...input, title: "Admin edit" },
      admin,
    );
    expect(updated).toMatchObject({
      authorId: writer.id,
      authorName: writer.displayName,
      title: "Admin edit",
    });
  });

  it("restricts cross-author listing and deletion to admins", async () => {
    const post = await createPost(input, writer);
    await expect(getAllPosts(writer)).rejects.toThrow("Only admins");
    await expect(deletePost(post.slug, writer)).rejects.toThrow("Only admins");
    await expect(getAllPosts(admin)).resolves.toHaveLength(1);
    await deletePost(post.slug, admin);
    await expect(getAllPosts(admin)).resolves.toHaveLength(0);
  });

  it("rejects incomplete publishing and images without alternative text", async () => {
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

  it("normalizes legacy image sizing and preserves ordered content blocks", async () => {
    rows.push({
      id: "legacy-post",
      slug: "legacy-post",
      title: "Legacy story",
      excerpt: "A legacy story",
      body: "First paragraph.\n\nSecond paragraph.",
      content_blocks: null,
      category: "Thoughts",
      images: [
        { id: "cover", src: "", alt: "Cover", layout: "featured" },
        { id: "inline", src: "", alt: "Inline", layout: "inline" },
      ],
      author_id: writer.id,
      author_name: writer.displayName,
      author_avatar_url: null,
      author_avatar_storage_key: null,
      status: "draft",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      published_at: null,
    });
    const post = await getPost("legacy-post", writer);
    expect(post.images.map((image) => image.size)).toEqual(["full", "full"]);
    expect(post.contentBlocks?.map((block) =>
      block.type === "image" ? block.imageId : block.content,
    )).toEqual(["cover", "First paragraph.", "inline", "Second paragraph."]);
  });

  it("persists image size, ordered blocks, and resolves slug collisions", async () => {
    const contentBlocks = [
      {
        id: "text-1",
        type: "markdown" as const,
        content: "A story about a favorite record, worth listening to again.",
      },
      { id: "image-1", type: "image" as const, imageId: "music-image" },
    ];
    const first = await createPost(
      {
        ...input,
        status: "published",
        contentBlocks,
        images: [
          {
            id: "music-image",
            src: "",
            alt: "Record player",
            layout: "inline",
            size: "small",
          },
        ],
      },
      writer,
    );
    const second = await createPost(
      { ...input, status: "published" },
      writer,
    );

    expect(first.slug).toBe("a-new-story");
    expect(second.slug).toBe("a-new-story-2");
    await expect(getPost(first.slug)).resolves.toMatchObject({
      contentBlocks,
      images: [{ size: "small" }],
    });
=======
const requestMock = vi.mocked(apiRequest);
const removeImagesMock = vi.mocked(removeImages);

describe("remote post repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
    requestMock.mockResolvedValueOnce({ imageKeys: ["writer-1/cover.jpg"] } as never);
    await deletePost(post.slug, writer);
    expect(requestMock).toHaveBeenCalledWith(`posts/${post.slug}`, {
      method: "DELETE",
    });
    expect(removeImagesMock).toHaveBeenCalledWith(["writer-1/cover.jpg"]);
  });

  it("filters categories after loading published posts", async () => {
    requestMock.mockResolvedValueOnce([
      post,
      { ...post, id: "post-2", category: "Thoughts" },
    ] as never);
    await expect(getPostsByCategory(" life & CULTURE ")).resolves.toEqual([post]);
>>>>>>> e37e27e (let's see)
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