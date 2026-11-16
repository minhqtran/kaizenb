import { beforeEach, describe, expect, it, vi } from "vitest";
<<<<<<< HEAD
import {
  changeUserRole,
  getProfile,
  getUsers,
  updateUserProfile,
} from "./users";

const { client } = vi.hoisted(() => ({
  client: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: { signInWithOAuth: vi.fn(), signOut: vi.fn() },
  },
}));

vi.mock("./supabase", () => ({ getSupabaseClient: () => client }));

const profile = {
  id: "user-1",
  email: "writer@example.test",
  display_name: "Writer",
  avatar_url: null,
  nickname: "Story Name",
  profile_image_path: "user-1/avatars/profile.webp",
  role: "writer" as const,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
};

function installProfileQuery(result: { data: unknown; error: null }) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    single: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockResolvedValue(result);
  client.from.mockReturnValue(query);
}

describe("Supabase user repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps the authenticated profile and shared role to the app user", async () => {
    installProfileQuery({ data: profile, error: null });
    await expect(
      getProfile({ id: profile.id } as never),
    ).resolves.toMatchObject({
      id: profile.id,
      nickname: "Story Name",
      profileImageKey: "user-1/avatars/profile.webp",
      role: "writer",
    });
  });

  it("loads the users list through the RLS-protected profiles table", async () => {
    installProfileQuery({ data: [profile], error: null });
    await expect(getUsers()).resolves.toMatchObject([
      { id: profile.id, role: "writer" },
    ]);
    expect(client.from).toHaveBeenCalledWith("profiles");
  });

  it("uses the trusted role RPC and refreshes the admin users list", async () => {
    client.rpc.mockResolvedValue({ data: null, error: null });
    installProfileQuery({ data: [profile], error: null });
    await expect(changeUserRole("user-1", "writer")).resolves.toMatchObject([
      { id: profile.id, role: "writer" },
    ]);
    expect(client.rpc).toHaveBeenCalledWith("set_user_role", {
      target_user_id: "user-1",
      next_role: "writer",
    });
  });

  it("rejects assigning admin through the client repository", async () => {
    await expect(
      changeUserRole("user-2", "admin"),
    ).rejects.toThrow("Only viewer and writer");
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("persists profile edits through the profile RPC", async () => {
    client.rpc.mockResolvedValue({ data: profile, error: null });
    await expect(
      updateUserProfile("Story Name", profile.profile_image_path),
    ).resolves.toMatchObject({ nickname: "Story Name", role: "writer" });
    expect(client.rpc).toHaveBeenCalledWith("update_my_profile", {
      nickname_input: "Story Name",
      profile_image_path_input: profile.profile_image_path,
    });
  });
});
=======
import type { AppUser } from "../types/user";
import { apiRequest } from "./apiClient";
import { changeUserRole, getSessionUser, getUsers, updateUserProfile } from "./users";

vi.mock("./apiClient", () => ({ apiRequest: vi.fn() }));

const user: AppUser = {
  id: "profile-1",
  googleSubject: "google-1",
  email: "person@example.test",
  displayName: "Person",
  role: "viewer",
};
const requestMock = vi.mocked(apiRequest);

describe("remote user repository", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads the current profile from the authenticated endpoint", async () => {
    requestMock.mockResolvedValueOnce(user as never);
    await expect(getSessionUser()).resolves.toEqual(user);
    expect(requestMock).toHaveBeenCalledWith("profile");
  });

  it("loads the user directory from the protected admin endpoint", async () => {
    requestMock.mockResolvedValueOnce([user] as never);
    await expect(getUsers()).resolves.toEqual([user]);
    expect(requestMock).toHaveBeenCalledWith("users");
  });

  it("submits role changes without a client-supplied actor", async () => {
    requestMock.mockResolvedValueOnce([user] as never);
    await changeUserRole("target-1", "writer");
    expect(requestMock).toHaveBeenCalledWith("users/target-1", {
      method: "PATCH",
      body: JSON.stringify({ role: "writer" }),
    });
  });

  it("updates nickname and profile image through the API", async () => {
    requestMock.mockResolvedValueOnce(user as never);
    await updateUserProfile("Story Name", "profile-1/avatar.jpg");
    expect(requestMock).toHaveBeenCalledWith("profile", {
      method: "PATCH",
      body: JSON.stringify({
        nickname: "Story Name",
        profileImageKey: "profile-1/avatar.jpg",
      }),
    });
  });
});
>>>>>>> e37e27e (let's see)
