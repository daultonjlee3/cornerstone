import { describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import {
  getSessionIdFromAccessToken,
  SESSION_REPLACED_LOGIN_REASON,
  validateActiveSession,
} from "@/src/lib/auth/single-session";

function makeAccessToken(sessionId: string): string {
  return jwt.sign({ session_id: sessionId, sub: "user-1" }, "test-secret", {
    algorithm: "HS256",
  });
}

describe("single-session auth", () => {
  it("extracts session_id from access token", () => {
    const sessionId = "11111111-1111-1111-1111-111111111111";
    const token = makeAccessToken(sessionId);
    expect(getSessionIdFromAccessToken(token)).toBe(sessionId);
  });

  it("treats missing active session as valid (legacy users)", async () => {
    const sessionId = "22222222-2222-2222-2222-222222222222";
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { active_auth_session_id: null },
            }),
          }),
        }),
      }),
    };

    const status = await validateActiveSession(
      supabase as never,
      "user-1",
      makeAccessToken(sessionId)
    );
    expect(status).toBe("valid");
  });

  it("flags stale session when active id differs", async () => {
    const supabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                active_auth_session_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
              },
            }),
          }),
        }),
      }),
    };

    const status = await validateActiveSession(
      supabase as never,
      "user-1",
      makeAccessToken("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
    );
    expect(status).toBe("stale");
  });

  it("exports stable login reason code", () => {
    expect(SESSION_REPLACED_LOGIN_REASON).toBe("session_replaced");
  });
});
