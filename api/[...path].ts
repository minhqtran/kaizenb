import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { AppUser, UserRole } from "../src/types/user";
import type { BlogImage, BlogPost, PostInput, StoryBlock } from "../src/types/post";
import { createSlug } from "../src/utils/formatDate";
import { legacyContentBlocks, validatePostInput } from "../src/services/postValidation";

type ApiRequest = IncomingMessage & { body?: unknown };
type Actor = { user: User; profile: AppUser; client: SupabaseClient };

class ApiError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
  }
}

function sendJson(response: ServerResponse, statusCode: number, value: unknown) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(value));
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new ApiError(
      "Supabase server configuration is missing. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.",
      503,
    );
  return { url, key };
}

function createSupabaseClient(accessToken?: string): SupabaseClient {
  const { url, key } = getSupabaseConfig();
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    ...(accessToken
      ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
      : {}),
  });
}

function profileFromRow(row: Record<string, unknown>, userId: string): AppUser {
  return {
    id: userId,
    googleSubject:
      typeof row.google_subject === "string" ? row.google_subject : userId,
    email: typeof row.email === "string" ? row.email : "",
    displayName:
      typeof row.display_name === "string" ? row.display_name : "Google user",
    ...(typeof row.avatar_url === "string" ? { avatarUrl: row.avatar_url } : {}),
    ...(typeof row.nickname === "string" ? { nickname: row.nickname } : {}),
    ...(typeof row.profile_image_key === "string"
      ? { profileImageKey: row.profile_image_key }
      : {}),
    role: row.role === "writer" || row.role === "admin" ? row.role : "viewer",
  };
}

function postFromRow(row: Record<string, unknown>): BlogPost {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title ?? ""),
    excerpt: String(row.excerpt ?? ""),
    body: String(row.body ?? ""),
    contentBlocks: Array.isArray(row.content_blocks)
      ? (row.content_blocks as StoryBlock[])
      : [],
    category: String(row.category ?? "Thoughts"),
    images: Array.isArray(row.images) ? (row.images as BlogImage[]) : [],
    authorId: String(row.author_id),
    authorName: String(row.author_name ?? ""),
    ...(typeof row.author_avatar_url === "string"
      ? { authorAvatarUrl: row.author_avatar_url }
      : {}),
    ...(typeof row.author_avatar_storage_key === "string"
      ? { authorAvatarStorageKey: row.author_avatar_storage_key }
      : {}),
    status: row.status === "published" ? "published" : "draft",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    ...(typeof row.published_at === "string"
      ? { publishedAt: row.published_at }
      : {}),
  };
}

async function getActor(request: ApiRequest, required = true): Promise<Actor | null> {
  const authorization = request.headers.authorization;
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) {
    if (required) throw new ApiError("Sign in to continue.", 401);
    return null;
  }

  const client = createSupabaseClient(token);
  const { data: authData, error: authError } = await client.auth.getUser(token);
  if (authError || !authData.user)
    throw new ApiError("Your session is invalid or has expired. Sign in again.", 401);

  const { data: profileRow, error: profileError } = await client
    .from("profiles")
    .select("*")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (profileError) throw new ApiError(profileError.message, 500);
  if (!profileRow)
    throw new ApiError("Your profile is not ready yet. Try again shortly.", 403);

  return {
    user: authData.user,
    profile: profileFromRow(profileRow as Record<string, unknown>, authData.user.id),
    client,
  };
}

function parseBody(request: ApiRequest): Record<string, unknown> {
  if (request.body && typeof request.body === "object")
    return request.body as Record<string, unknown>;
  if (typeof request.body === "string") {
    try {
      return JSON.parse(request.body) as Record<string, unknown>;
    } catch {
      throw new ApiError("The request body must be valid JSON.", 400);
    }
  }
  return {};
}

function requireRole(actor: Actor, role: UserRole) {
  const allowed =
    role === "admin"
      ? actor.profile.role === "admin"
      : actor.profile.role === "writer" || actor.profile.role === "admin";
  if (!allowed)
    throw new ApiError(
      role === "admin" ? "Only admins can perform this action." : "Writer access is required.",
      403,
    );
}

function validatePost(input: PostInput) {
  try {
    validatePostInput(input);
  } catch (cause) {
    throw new ApiError(
      cause instanceof Error ? cause.message : "This story cannot be published.",
      400,
    );
  }
}

function postValues(input: PostInput) {
  return {
    title: input.title,
    slug: input.slug,
    excerpt: input.excerpt,
    body: input.body,
    content_blocks:
      input.contentBlocks ?? legacyContentBlocks(input.body, input.images),
    category: input.category,
    images: input.images,
    status: input.status,
  };
}

async function uniqueSlug(
  client: SupabaseClient,
  value: string,
  currentId?: string,
) {
  const base = createSlug(value) || `story-${Date.now()}`;
  let slug = base;
  let suffix = 2;
  while (true) {
    const { data, error } = await client
      .from("posts")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw new ApiError(error.message, 500);
    if (!data || data.id === currentId) return slug;
    slug = `${base}-${suffix++}`;
  }
}

function getImageKeys(post: BlogPost) {
  return post.images
    .map((image) => image.storageKey)
    .filter((key): key is string => Boolean(key));
}

function imageExtension(contentType: string) {
  const extension: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return extension[contentType];
}

async function handleRequest(request: ApiRequest, response: ServerResponse) {
  const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  const path = requestUrl.pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
  const method = request.method ?? "GET";

  if (path[0] === "posts" && path.length === 1 && method === "GET") {
    const actor = await getActor(request, false);
    const client = actor?.client ?? createSupabaseClient();
    const { data, error } = await client
      .from("posts")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false });
    if (error) throw new ApiError(error.message, 500);
    return sendJson(response, 200, (data ?? []).map((row) => postFromRow(row as Record<string, unknown>)));
  }

  if (path[0] === "posts" && path[1] === "mine" && method === "GET") {
    const actor = await getActor(request);
    requireRole(actor!, "writer");
    const query = actor!.client.from("posts").select("*").order("updated_at", { ascending: false });
    if (actor!.profile.role !== "admin") query.eq("author_id", actor!.user.id);
    const { data, error } = await query;
    if (error) throw new ApiError(error.message, 500);
    return sendJson(response, 200, (data ?? []).map((row) => postFromRow(row as Record<string, unknown>)));
  }

  if (path[0] === "admin" && path[1] === "posts" && method === "GET") {
    const actor = await getActor(request);
    requireRole(actor!, "admin");
    const { data, error } = await actor!.client
      .from("posts")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new ApiError(error.message, 500);
    return sendJson(response, 200, (data ?? []).map((row) => postFromRow(row as Record<string, unknown>)));
  }

  if (path[0] === "posts" && path.length === 1 && method === "POST") {
    const actor = await getActor(request);
    requireRole(actor!, "writer");
    const body = parseBody(request) as unknown as PostInput;
    validatePost(body);
    const values = postValues(body);
    values.slug = await uniqueSlug(actor!.client, body.slug || body.title);
    const { data, error } = await actor!.client
      .from("posts")
      .insert({ ...values, author_id: actor!.user.id })
      .select("*")
      .single();
    if (error) throw new ApiError(error.message, error.code === "23505" ? 409 : 500);
    return sendJson(response, 201, postFromRow(data as Record<string, unknown>));
  }

  if (path[0] === "posts" && path.length === 2) {
    const slug = decodeURIComponent(path[1]);
    const actor = await getActor(request, method !== "GET");
    const client = actor?.client ?? createSupabaseClient();
    if (method === "GET") {
      const { data, error } = await client
        .from("posts")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw new ApiError(error.message, 500);
      if (!data) throw new ApiError("This story could not be found.", 404);
      return sendJson(response, 200, postFromRow(data as Record<string, unknown>));
    }
    const { data: existingRow, error: existingError } = await actor!.client
      .from("posts")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (existingError) throw new ApiError(existingError.message, 500);
    if (!existingRow) throw new ApiError("This story could not be found.", 404);
    const existing = postFromRow(existingRow as Record<string, unknown>);

    if (method === "PATCH") {
      if (actor!.profile.role !== "admin" && existing.authorId !== actor!.user.id)
        throw new ApiError("You cannot edit this story.", 403);
      requireRole(actor!, "writer");
      const body = parseBody(request) as unknown as PostInput;
      validatePost(body);
      const values = postValues(body);
      values.slug = await uniqueSlug(actor!.client, body.slug || body.title, existing.id);
      const { data, error } = await actor!.client
        .from("posts")
        .update(values)
        .eq("id", existing.id)
        .select("*")
        .single();
      if (error) throw new ApiError(error.message, error.code === "23505" ? 409 : 500);
      return sendJson(response, 200, postFromRow(data as Record<string, unknown>));
    }

    if (method === "DELETE") {
      requireRole(actor!, "admin");
      const { error } = await actor!.client.from("posts").delete().eq("id", existing.id);
      if (error) throw new ApiError(error.message, 500);
      return sendJson(response, 200, { imageKeys: getImageKeys(existing) });
    }
  }

  if (path[0] === "profile" && path.length === 1) {
    const actor = await getActor(request);
    if (method === "GET") return sendJson(response, 200, actor!.profile);
    if (method === "PATCH") {
      const body = parseBody(request);
      const nickname = typeof body.nickname === "string" ? body.nickname.trim() : "";
      const profileImageKey =
        typeof body.profileImageKey === "string" ? body.profileImageKey : null;
      if (!nickname || nickname.length > 40)
        throw new ApiError("Nickname must be between 1 and 40 characters.", 400);
      if (profileImageKey && !profileImageKey.startsWith(`${actor!.user.id}/`))
        throw new ApiError("Profile images must belong to your account.", 400);
      const { data, error } = await actor!.client
        .from("profiles")
        .update({ nickname, profile_image_key: profileImageKey })
        .eq("id", actor!.user.id)
        .select("*")
        .single();
      if (error) throw new ApiError(error.message, 500);
      return sendJson(response, 200, profileFromRow(data as Record<string, unknown>, actor!.user.id));
    }
  }

  if (path[0] === "users" && path.length === 1 && method === "GET") {
    const actor = await getActor(request);
    requireRole(actor!, "admin");
    const { data, error } = await actor!.client
      .from("profiles")
      .select("*")
      .order("display_name", { ascending: true });
    if (error) throw new ApiError(error.message, 500);
    return sendJson(response, 200, (data ?? []).map((row) => profileFromRow(row as Record<string, unknown>, String(row.id))));
  }

  if (path[0] === "users" && path.length === 2 && method === "PATCH") {
    const actor = await getActor(request);
    requireRole(actor!, "admin");
    const body = parseBody(request);
    const role = body.role;
    if (role !== "writer" && role !== "viewer")
      throw new ApiError("Only viewer and writer roles can be assigned.", 400);
    const { error } = await actor!.client.rpc("admin_set_user_role", {
      target_user_id: decodeURIComponent(path[1]),
      requested_role: role,
    });
    if (error) throw new ApiError(error.message, error.code === "42501" ? 403 : 500);
    const { data, error: userError } = await actor!.client
      .from("profiles")
      .select("*")
      .order("display_name", { ascending: true });
    if (userError) throw new ApiError(userError.message, 500);
    return sendJson(response, 200, (data ?? []).map((row) => profileFromRow(row as Record<string, unknown>, String(row.id))));
  }

  if (path[0] === "images" && path[1] === "upload" && method === "POST") {
    const actor = await getActor(request);
    const body = parseBody(request);
    const contentType = typeof body.contentType === "string" ? body.contentType : "";
    const size = typeof body.size === "number" ? body.size : 0;
    const extension = imageExtension(contentType);
    if (!extension) throw new ApiError("Use JPEG, PNG, WebP, or GIF images.", 400);
    if (size <= 0 || size > 8 * 1024 * 1024)
      throw new ApiError("Images must be no larger than 8 MB.", 400);
    const key = `${actor!.user.id}/${randomUUID()}.${extension}`;
    const { data, error } = await actor!.client.storage
      .from("blog-images")
      .createSignedUploadUrl(key);
    if (error) throw new ApiError(error.message, 500);
    return sendJson(response, 201, { key, token: data.token, path: data.path });
  }

  if (path[0] === "images" && path[1] === "read" && method === "GET") {
    const actor = await getActor(request, false);
    const key = requestUrl.searchParams.get("key") ?? "";
    if (!key || key.includes("..")) throw new ApiError("Invalid image key.", 400);
    const client = actor?.client ?? createSupabaseClient();
    const { data, error } = await client.storage
      .from("blog-images")
      .createSignedUrl(key, 60 * 30);
    if (error || !data)
      throw new ApiError("This image could not be found.", 404);
    return sendJson(response, 200, { url: data.signedUrl });
  }

  if (path[0] === "images" && path.length === 1 && method === "DELETE") {
    const actor = await getActor(request);
    const key = requestUrl.searchParams.get("key") ?? "";
    if (!key || key.includes("..")) throw new ApiError("Invalid image key.", 400);
    if (!key.startsWith(`${actor!.user.id}/`)) requireRole(actor!, "admin");
    const [postImages, authorAvatars, profileImages] = await Promise.all([
      actor!.client
        .from("posts")
        .select("id")
        .contains("images", [{ storageKey: key }])
        .limit(1),
      actor!.client
        .from("posts")
        .select("id")
        .eq("author_avatar_storage_key", key)
        .limit(1),
      actor!.client
        .from("profiles")
        .select("id")
        .eq("profile_image_key", key)
        .limit(1),
    ]);
    const referenceError = [postImages, authorAvatars, profileImages].find(
      (result) => result.error,
    )?.error;
    if (referenceError) throw new ApiError(referenceError.message, 500);
    if (postImages.data?.length || authorAvatars.data?.length || profileImages.data?.length)
      return sendJson(response, 200, { ok: true, retained: true });
    const { error } = await actor!.client.storage.from("blog-images").remove([key]);
    if (error) throw new ApiError(error.message, 500);
    return sendJson(response, 200, { ok: true });
  }

  throw new ApiError("API route not found.", 404);
}

export default async function handler(request: ApiRequest, response: ServerResponse) {
  try {
    await handleRequest(request, response);
  } catch (cause) {
    const error = cause instanceof ApiError ? cause : new ApiError("The request could not be completed.", 500);
    if (!(cause instanceof ApiError)) console.error(cause);
    if (!response.headersSent) sendJson(response, error.statusCode, { error: error.message });
  }
}