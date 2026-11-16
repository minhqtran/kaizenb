import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./apiClient";

vi.mock("./supabaseClient", () => ({
  getSupabaseClient: vi.fn(),
  isSupabaseConfigured: () => false,
}));

describe("API response handling", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reports an HTML SPA fallback instead of returning null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<!doctype html><html></html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }),
      ),
    );

    await expect(apiRequest("posts")).rejects.toThrow(
      "API route /api/posts returned a non-JSON response (HTTP 200). Check Vercel function routing.",
    );
  });
});