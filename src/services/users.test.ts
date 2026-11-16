import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppUser } from "../types/user";
import { apiRequest } from "./apiClient";
import {
  changeUserRole,
  getSessionUser,
  getUsers,
  updateUserProfile,
} from "./users";

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
    await updateUserProfile("Story Name", "profile-1/avatars/avatar.webp");
    expect(requestMock).toHaveBeenCalledWith("profile", {
      method: "PATCH",
      body: JSON.stringify({
        nickname: "Story Name",
        profileImageKey: "profile-1/avatars/avatar.webp",
      }),
    });
  });
});