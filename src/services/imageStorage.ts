import { apiRequest } from "./apiClient";
import { getSupabaseClient } from "./supabaseClient";

const allowedImageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const maximumImageSize = 8 * 1024 * 1024;

export type ImagePurpose = "post-images" | "avatars";

export function validateImageFile(file: File) {
  if (!allowedImageTypes.includes(file.type))
    throw new Error(
      `${file.name} is not a supported image. Use JPEG, PNG, WebP, or GIF.`,
    );
  if (file.size > maximumImageSize)
    throw new Error(
      `${file.name} is larger than 8 MB. Choose a smaller image.`,
    );
}

export async function saveImage(
  file: File,
  purpose: ImagePurpose,
): Promise<string> {
  validateImageFile(file);
  const signedUpload = await apiRequest<{
    key: string;
    token: string;
    path: string;
  }>("images/upload", {
    method: "POST",
    body: JSON.stringify({
      contentType: file.type,
      purpose,
      size: file.size,
    }),
  });
  const { error } = await getSupabaseClient()
    .storage.from("blog-images")
    .uploadToSignedUrl(signedUpload.path, signedUpload.token, file, {
      contentType: file.type,
      upsert: false,
    });
  if (error) throw new Error(`Unable to store ${file.name}: ${error.message}`);
  return signedUpload.key;
}

export async function getImage(key: string): Promise<Blob | null> {
  const { url } = await apiRequest<{ url: string }>(
    `images/read?key=${encodeURIComponent(key)}`,
  );
  const response = await fetch(url);
  if (!response.ok) throw new Error("Unable to read this image from storage.");
  return response.blob();
}

export async function removeImages(keys: string[]) {
  await Promise.all(
    keys.map((key) =>
      apiRequest<{ ok: boolean }>(`images?key=${encodeURIComponent(key)}`, {
        method: "DELETE",
      }),
    ),
  );
}