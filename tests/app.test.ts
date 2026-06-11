import { describe, it, expect, beforeEach } from "vitest";
import { SELF } from "cloudflare:test";
import { setupDb } from "./helpers";

describe("app", () => {
  beforeEach(async () => {
    await setupDb();
  });

  it("GET / returns 200", async () => {
    const res = await SELF.fetch("http://localhost/");
    expect(res.status).toBe(200);
  });

  it("sets security headers", async () => {
    const res = await SELF.fetch("http://localhost/");
    expect(res.headers.get("Content-Security-Policy")).toBe("default-src 'self'");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
  });
});
