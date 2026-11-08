import { describe, expect, it } from "vitest";
import { createPostUrl } from "./postUrl";

describe("createPostUrl", () => {
  it("creates an absolute post URL on the current site", () => {
    expect(createPostUrl("t-n-m-i-part-1", "https://kaizenb.vercel.app")).toBe(
      "https://kaizenb.vercel.app/posts/t-n-m-i-part-1",
    );
  });

  it("encodes slugs as a single URL path segment", () => {
    expect(createPostUrl("a title/part", "https://kaizenb.vercel.app")).toBe(
      "https://kaizenb.vercel.app/posts/a%20title%2Fpart",
    );
  });
});
