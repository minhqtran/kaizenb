import type { IncomingMessage, ServerResponse } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import handler from "./[...path]";

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));

const createClientMock = vi.mocked(createClient);

function makeRequest(
  method: string,
  authorization?: string,
  url = "/api/posts",
): IncomingMessage & { body?: unknown } {
  return {
    method,
    url,
    headers: {
      host: "localhost",
      ...(authorization ? { authorization } : {}),
    },
  } as IncomingMessage & { body?: unknown };
}

function makeResponse() {
  let body = "";
  const response = {
    statusCode: 0,
    headersSent: false,
    setHeader: vi.fn(),
    end: vi.fn((value?: string) => {
      body = value ?? "";
    }),
  };
  return {
    response: response as unknown as ServerResponse,
    getBody: () => JSON.parse(body) as { error?: string },
    getParsedBody: () => JSON.parse(body) as unknown,
  };
}

describe("Vercel API authentication", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "https://project.example.test");
    vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.clearAllMocks();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("rejects post creation without an authenticated session", async () => {
    const { response, getBody } = makeResponse();
    await handler(makeRequest("POST") as never, response);
    expect(response.statusCode).toBe(401);
    expect(getBody().error).toBe("Sign in to continue.");
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("rejects invalid bearer tokens before looking up profile roles", async () => {
    createClientMock.mockReturnValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: new Error("Invalid token"),
        }),
      },
    } as never);
    const { response, getBody } = makeResponse();

    await handler(
      makeRequest("POST", "Bearer forged-token") as never,
      response,
    );

    expect(response.statusCode).toBe(401);
    expect(getBody().error).toContain("session is invalid");
  });

  it("routes rewritten /api?path=posts requests to the public post list", async () => {
    const query = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    createClientMock.mockReturnValueOnce({
      from: vi.fn().mockReturnValue(query),
    } as never);
    const { response, getParsedBody } = makeResponse();

    await handler(
      makeRequest("GET", undefined, "/api?path=posts") as never,
      response,
    );

    expect(response.statusCode).toBe(200);
    expect(getParsedBody()).toEqual([]);
  });
});