import { describe, it, expect, beforeEach } from "vitest";
import { SELF } from "cloudflare:test";
import { setupDb, signupAndLogin } from "./helpers";

describe("posts", () => {
  beforeEach(async () => {
    await setupDb();
  });

  it("author can create post", async () => {
    const { csrf, cookies } = await signupAndLogin("author1", "a1@example.com", "password123");
    const res = await SELF.fetch("http://localhost/new", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies },
      body: new URLSearchParams({
        csrf_token: csrf,
        title: "Hello World",
        body: "This is my first post.",
      }),
      redirect: "manual",
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toMatch(/^\/post\/\d+$/);
  });

  it("non-author gets 403 on edit", async () => {
    const author = await signupAndLogin("author2", "a2@example.com", "password123");
    const res1 = await SELF.fetch("http://localhost/new", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: author.cookies },
      body: new URLSearchParams({
        csrf_token: author.csrf,
        title: "Secret",
        body: "Private content",
      }),
      redirect: "manual",
    });
    const loc = res1.headers.get("location")!;
    const postId = loc.split("/").pop();
    const other = await signupAndLogin("other1", "o1@example.com", "password123");
    const res = await SELF.fetch(`http://localhost/edit/${postId}`, {
      headers: { Cookie: other.cookies },
    });
    expect(res.status).toBe(403);
  });

  it("unknown post returns 404", async () => {
    const res = await SELF.fetch("http://localhost/post/99999");
    expect(res.status).toBe(404);
  });
});
