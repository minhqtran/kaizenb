import type { AppUser, UserRole } from "../types/user";
import { apiRequest } from "./apiClient";

export function getSessionUser(): Promise<AppUser> {
  return apiRequest<AppUser>("profile");
}

export function getUsers(): Promise<AppUser[]> {
  return apiRequest<AppUser[]>("users");
}

export function changeUserRole(
  targetId: string,
  nextRole: UserRole,
): Promise<AppUser[]> {
  return apiRequest<AppUser[]>(`users/${encodeURIComponent(targetId)}`, {
    method: "PATCH",
    body: JSON.stringify({ role: nextRole }),
  });
}

export function updateUserProfile(
  nickname: string,
  profileImageKey: string | null,
): Promise<AppUser> {
  return apiRequest<AppUser>("profile", {
    method: "PATCH",
    body: JSON.stringify({ nickname, profileImageKey }),
  });
}