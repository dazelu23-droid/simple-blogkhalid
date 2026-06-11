import { describe, it, expect, beforeEach } from "vitest";
import { SELF } from "cloudflare:test";
import { setupDb, signupAndLogin } from "./helpers";

describe("search", () => {
  beforeEach(async () => {
    await setupDb();
  });

  it("empty query shows prompt", async () => {
    const res = await SELF.fetch("http://localhost/search");
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain("Enter a search term");
  });

  it("finds posts case-insensitively", async () => {
    const { csrf, cookies } = await signupAndLogin("searcher", "s@example.com", "password123");
    await SELF.fetch("http://localhost/new", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies },
      body: new URLSearchParams({
        csrf_token: csrf,
        title: "Python Tips",
        body: "Learn PYTHON today",
      }),
      redirect: "manual",
    });
    const res = await SELF.fetch("http://localhost/search?q=python");
    const html = await res.text();
    expect(html).toContain("Python Tips");
  });
});
