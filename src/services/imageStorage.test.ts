import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./apiClient";
import {
  getImage,
  removeImages,
  saveImage,
  validateImageFile,
} from "./imageStorage";

const { uploadToSignedUrl } = vi.hoisted(() => ({
  uploadToSignedUrl: vi.fn(),
}));

vi.mock("./apiClient", () => ({ apiRequest: vi.fn() }));
vi.mock("./supabaseClient", () => ({
  getSupabaseClient: () => ({
    storage: { from: () => ({ uploadToSignedUrl }) },
  }),
}));

const requestMock = vi.mocked(apiRequest);

describe("image validation", () => {
  it("accepts supported image types within the 8 MB limit", () => {
    expect(() =>
      validateImageFile(new File(["image"], "portrait.webp", { type: "image/webp" })),
    ).not.toThrow();
  });

  it("rejects unsupported types and oversized images", () => {
    expect(() =>
      validateImageFile(new File(["text"], "portrait.svg", { type: "image/svg+xml" })),
    ).toThrow("not a supported image");
    const oversizedImage = new File(
      [new Uint8Array(8 * 1024 * 1024 + 1)],
      "portrait.png",
      { type: "image/png" },
    );
    expect(() => validateImageFile(oversizedImage)).toThrow("larger than 8 MB");
  });
});

describe("remote image storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(["post-images", "avatars"] as const)(
    "requests a signed upload for the %s folder and transfers directly to Storage",
    async (purpose) => {
      requestMock.mockResolvedValueOnce({
        key: `user-1/${purpose}/image-1.webp`,
        token: "signed-token",
        path: `user-1/${purpose}/image-1.webp`,
      } as never);
      uploadToSignedUrl.mockResolvedValueOnce({ data: {}, error: null });
      const file = new File(["image"], "cover.webp", { type: "image/webp" });

      await expect(saveImage(file, purpose)).resolves.toBe(
        `user-1/${purpose}/image-1.webp`,
      );
      expect(requestMock).toHaveBeenCalledWith("images/upload", {
        method: "POST",
        body: JSON.stringify({
          contentType: "image/webp",
          purpose,
          size: file.size,
        }),
      });
      expect(uploadToSignedUrl).toHaveBeenCalledWith(
        `user-1/${purpose}/image-1.webp`,
        "signed-token",
        file,
        { contentType: "image/webp", upsert: false },
      );
    },
  );

  it("retrieves authorized signed URLs and deletes remote objects", async () => {
    requestMock.mockResolvedValueOnce({ url: "https://storage.example/image" } as never);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("image")));
    await expect(getImage("user-1/post-images/image.webp")).resolves.toBeInstanceOf(Blob);
    expect(requestMock).toHaveBeenCalledWith(
      "images/read?key=user-1%2Fpost-images%2Fimage.webp",
    );

    requestMock.mockResolvedValueOnce({ ok: true } as never);
    await removeImages(["user-1/post-images/image.webp"]);
    expect(requestMock).toHaveBeenLastCalledWith(
      "images?key=user-1%2Fpost-images%2Fimage.webp",
      { method: "DELETE" },
    );
  });
});