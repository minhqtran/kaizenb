import { describe, expect, it } from "vitest";
import type { AppUser } from "../types/user";
import { canAdmin, canChangeRole, canEditPost, canWrite } from "./permissions";

const viewer: AppUser = {
  id: "viewer",
  googleSubject: "sub-viewer",
  email: "viewer@example.test",
  displayName: "Viewer",
  role: "viewer",
};
const writer: AppUser = {
  id: "writer",
  googleSubject: "sub-writer",
  email: "writer@example.test",
  displayName: "Writer",
  role: "writer",
};
const admin: AppUser = {
  id: "admin",
  googleSubject: "sub-admin",
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

  it("allows admins to promote viewers and revoke writers, never assign admin", () => {
    expect(canChangeRole(admin, viewer, "writer")).toBe(true);
    expect(canChangeRole(admin, writer, "viewer")).toBe(true);
    expect(canChangeRole(admin, viewer, "admin")).toBe(false);
    expect(canChangeRole(writer, viewer, "writer")).toBe(false);
    expect(canChangeRole(admin, admin, "viewer")).toBe(false);
  });
});