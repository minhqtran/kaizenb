import { beforeEach, describe, expect, it, vi } from "vitest";
import { getImage, removeImages, saveImage, validateImageFile } from "./imageStorage";

const { client, bucket } = vi.hoisted(() => ({
  client: {
    auth: { getUser: vi.fn() },
    storage: { from: vi.fn() },
  },
  bucket: {
    upload: vi.fn(),
    download: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock("./supabase", () => ({ getSupabaseClient: () => client }));

describe("profile image validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    client.storage.from.mockReturnValue(bucket);
    bucket.upload.mockResolvedValue({ error: null });
    bucket.download.mockResolvedValue({ data: new Blob(["image"]), error: null });
    bucket.remove.mockResolvedValue({ error: null });
  });

  it("accepts supported image types within the existing 8 MB limit", () => {
    expect(() =>
      validateImageFile(
        new File(["image"], "portrait.webp", { type: "image/webp" }),
      ),
    ).not.toThrow();
  });

  it("rejects unsupported types and oversized images", () => {
    expect(() =>
      validateImageFile(
        new File(["text"], "portrait.svg", { type: "image/svg+xml" }),
      ),
    ).toThrow("not a supported image");
    const oversizedImage = new File(
      [new Uint8Array(8 * 1024 * 1024 + 1)],
      "portrait.png",
      { type: "image/png" },
    );
    expect(() => validateImageFile(oversizedImage)).toThrow("larger than 8 MB");
  });

  it("uploads images to the authenticated user's private media folder", async () => {
    const file = new File(["image"], "cover.webp", { type: "image/webp" });
    const path = await saveImage(file, "post-images");

    expect(path).toMatch(/^user-1\/post-images\/.+\.webp$/);
    expect(client.storage.from).toHaveBeenCalledWith("media");
    expect(bucket.upload).toHaveBeenCalledWith(path, file, {
      cacheControl: "3600",
      contentType: "image/webp",
      upsert: false,
    });
  });

  it("reads and removes media through Supabase Storage", async () => {
    const blob = await getImage("user-1/post-images/cover.webp");
    await removeImages(["user-1/post-images/cover.webp"]);

    expect(blob).toBeInstanceOf(Blob);
    expect(bucket.download).toHaveBeenCalledWith(
      "user-1/post-images/cover.webp",
    );
    expect(bucket.remove).toHaveBeenCalledWith([
      "user-1/post-images/cover.webp",
    ]);
  });
});
