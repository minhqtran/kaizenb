import { describe, expect, it } from "vitest";
import type { AppUser } from "../types/user";
import {
  canAdmin,
  canEditPost,
  canWrite,
} from "./permissions";

const viewer: AppUser = {
  id: "viewer",
  email: "viewer@example.test",
  displayName: "Viewer",
  role: "viewer",
};
const writer: AppUser = {
  id: "writer",
  email: "writer@example.test",
  displayName: "Writer",
  role: "writer",
};
const admin: AppUser = {
  id: "admin",
  email: "admin@example.test",
  displayName: "Admin",
  role: "admin",
};

describe("role permissions", () => {
  it("grants authoring to writers and admins only", () => {
    expect(canWrite(viewer)).toBe(false);
    expect(canWrite(writer)).toBe(true);
    expect(canWrite(admin)).toBe(true);
  });

  it("restricts admin actions to admins", () => {
    expect(canAdmin(writer)).toBe(false);
    expect(canAdmin(admin)).toBe(true);
  });

  it("limits writers to their own posts while admins can manage all posts", () => {
    expect(canEditPost(viewer, writer.id)).toBe(false);
    expect(canEditPost(writer, writer.id)).toBe(true);
    expect(canEditPost(writer, admin.id)).toBe(false);
    expect(canEditPost(admin, writer.id)).toBe(true);
  });
});
