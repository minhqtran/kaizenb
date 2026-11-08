import type { User } from "@supabase/supabase-js";
import type { AppUser, UserRole } from "../types/user";
import { getSupabaseClient } from "./supabase";

type ProfileRow = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  nickname: string | null;
  profile_image_path: string | null;
  role: UserRole;
};

function toAppUser(profile: ProfileRow): AppUser {
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.display_name,
    ...(profile.avatar_url ? { avatarUrl: profile.avatar_url } : {}),
    ...(profile.nickname ? { nickname: profile.nickname } : {}),
    ...(profile.profile_image_path
      ? { profileImageKey: profile.profile_image_path }
      : {}),
    role: profile.role,
  };
}

export async function getProfile(user: User): Promise<AppUser> {
  const { data, error } = await getSupabaseClient()
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (error) throw new Error(`Unable to load your profile: ${error.message}`);
  if (!data) throw new Error("The shared profile was not found.");
  return toAppUser(data as ProfileRow);
}

export async function getUsers(): Promise<AppUser[]> {
  const { data, error } = await getSupabaseClient()
    .from("profiles")
    .select("*")
    .order("display_name", { ascending: true });
  if (error) throw new Error(`Unable to load people: ${error.message}`);
  if (!data) throw new Error("The shared user list was empty.");
  return (data as ProfileRow[]).map(toAppUser);
}

export async function startGoogleSignIn(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  if (error) throw new Error(`Google sign-in failed: ${error.message}`);
}

export async function signOutUser(): Promise<void> {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw new Error(`Unable to sign out: ${error.message}`);
}

export async function changeUserRole(
  targetId: string,
  role: UserRole,
): Promise<AppUser[]> {
  if (role !== "viewer" && role !== "writer")
    throw new Error("Only viewer and writer roles can be assigned.");
  const { error } = await getSupabaseClient().rpc("set_user_role", {
    target_user_id: targetId,
    next_role: role,
  });
  if (error) throw new Error(error.message);
  return getUsers();
}

export async function updateUserProfile(
  nickname: string,
  profileImageKey: string | null,
): Promise<AppUser> {
  const { data, error } = await getSupabaseClient().rpc("update_my_profile", {
    nickname_input: nickname,
    profile_image_path_input: profileImageKey,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("The updated profile was not returned.");
  return toAppUser(data as ProfileRow);
}
