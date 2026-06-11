import { describe, it, expect, beforeEach } from "vitest";
import { SELF } from "cloudflare:test";
import { setupDb, signupAndLogin } from "./helpers";

describe("csrf", () => {
  beforeEach(async () => {
    await setupDb();
  });

  it("POST without CSRF returns 400", async () => {
    const res = await SELF.fetch("http://localhost/signup", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        username: "x",
        email: "x@example.com",
        password: "password123",
      }),
    });
    expect(res.status).toBe(400);
  });

  it("API without CSRF returns 400 not 401", async () => {
    const res = await SELF.fetch("http://localhost/api/post/1/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "test" }),
    });
    expect(res.status).toBe(400);
  });
});
