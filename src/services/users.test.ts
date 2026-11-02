import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  changeUserRole,
  getSessionUser,
  getUsers,
  signInUser,
  signOutUser,
  updateUserProfile,
} from "./users";

function installStorage() {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  vi.stubGlobal("window", new EventTarget());
}

describe("local user repository", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    installStorage();
  });

  it("restores a signed-in profile and defaults it to viewer", () => {
    const user = signInUser({
      googleSubject: "stable-google-sub",
      email: "reader@example.test",
      emailVerified: true,
      displayName: "Reader",
    });
    expect(user).toMatchObject({
      id: "stable-google-sub",
      googleSubject: "stable-google-sub",
      role: "viewer",
    });
    expect(getSessionUser()).toEqual(user);
    expect(getUsers()).toEqual([user]);
    signOutUser();
    expect(getSessionUser()).toBeNull();
  });

  it("allows only an existing admin to promote viewers, never self-promote", () => {
    const admin = {
      id: "google-admin",
      googleSubject: "google-admin",
      email: "admin@example.test",
      displayName: "Admin",
      role: "admin",
    };
    const reader = {
      id: "google-reader",
      googleSubject: "google-reader",
      email: "reader@example.test",
      displayName: "Reader",
      role: "viewer",
    };
    localStorage.setItem("goodword.users.v1", JSON.stringify([admin, reader]));
    expect(() => changeUserRole(reader.id, admin.id, "admin")).toThrow(
      "not allowed",
    );
    expect(() => changeUserRole(admin.id, admin.id, "writer")).toThrow(
      "not allowed",
    );
    expect(changeUserRole(admin.id, reader.id, "writer")[1].role).toBe(
      "writer",
    );
  });

  it("keeps nickname and uploaded avatar overrides when Google identity refreshes", () => {
    const identity = {
      googleSubject: "profile-user",
      email: "profile@example.test",
      emailVerified: true,
      displayName: "Google Name",
    };
    const user = signInUser(identity);
    updateUserProfile(user.id, "  Story Name  ", "profile-image-key");
    const refreshed = signInUser({
      ...identity,
      displayName: "Updated Google Name",
      avatarUrl: "https://example.test/google.jpg",
    });
    expect(refreshed).toMatchObject({
      displayName: "Updated Google Name",
      nickname: "Story Name",
      profileImageKey: "profile-image-key",
      avatarUrl: "https://example.test/google.jpg",
    });
    expect(getSessionUser()).toEqual(refreshed);
  });

  it("rejects empty or overlong nicknames", () => {
    const user = signInUser({
      googleSubject: "profile-user",
      email: "profile@example.test",
      emailVerified: true,
      displayName: "Reader",
    });
    expect(() => updateUserProfile(user.id, "   ", null)).toThrow(
      "between 1 and 40",
    );
    expect(() => updateUserProfile(user.id, "n".repeat(41), null)).toThrow(
      "between 1 and 40",
    );
  });

  it("updates the author details on existing stories when a profile changes", () => {
    localStorage.setItem(
      "goodword.posts.v1",
      JSON.stringify([
        {
          id: "existing-post",
          slug: "existing-post",
          title: "Existing story",
          excerpt: "A saved story",
          body: "Story text long enough for an existing published post.",
          images: [],
          category: "Thoughts",
          authorId: "profile-user",
          authorName: "Old name",
          authorAvatarUrl: "https://example.test/old.jpg",
          status: "published",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          publishedAt: "2026-01-01T00:00:00.000Z",
        },
      ]),
    );
    const user = signInUser({
      googleSubject: "profile-user",
      email: "profile@example.test",
      emailVerified: true,
      displayName: "Google Name",
    });
    updateUserProfile(user.id, "New byline", "new-avatar-key");
    const storedPosts = JSON.parse(
      localStorage.getItem("goodword.posts.v1") ?? "[]",
    ) as Array<Record<string, unknown>>;
    expect(storedPosts[0]).toMatchObject({
      authorName: "New byline",
      authorAvatarStorageKey: "new-avatar-key",
    });
    expect(storedPosts[0]).not.toHaveProperty("authorAvatarUrl");
  });
});
