<<<<<<< HEAD
import { getSupabaseClient } from "./supabase";

const bucketName = "media";
=======
import { apiRequest } from "./apiClient";
import { getSupabaseClient } from "./supabaseClient";

>>>>>>> e37e27e (let's see)
const allowedImageTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
const maximumImageSize = 8 * 1024 * 1024;

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

<<<<<<< HEAD
export async function saveImage(
  file: File,
  purpose: "post-images" | "avatars",
): Promise<string> {
  validateImageFile(file);
  const client = getSupabaseClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw new Error(userError.message);
  if (!userData.user) throw new Error("Sign in before uploading images.");

  const extension = file.name.split(".").pop()?.toLowerCase() || "img";
  const key = `${userData.user.id}/${purpose}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from(bucketName).upload(key, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(`Unable to upload ${file.name}: ${error.message}`);
  return key;
}

export async function getImage(key: string): Promise<Blob | null> {
  const { data, error } = await getSupabaseClient()
    .storage.from(bucketName)
    .download(key);
  if (error) throw new Error(`Unable to load image: ${error.message}`);
  return data;
}

export async function removeImages(keys: string[]) {
  if (!keys.length) return;
  const { error } = await getSupabaseClient()
    .storage.from(bucketName)
    .remove(keys);
  if (error) throw new Error(`Unable to remove images: ${error.message}`);
}
=======
export async function saveImage(file: File): Promise<string> {
  validateImageFile(file);
  const signedUpload = await apiRequest<{
    key: string;
    token: string;
    path: string;
  }>("images/upload", {
    method: "POST",
    body: JSON.stringify({ contentType: file.type, size: file.size }),
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
>>>>>>> e37e27e (let's see)
