import { describe, it, expect, beforeEach } from "vitest";
import { SELF } from "cloudflare:test";
import { setupDb, signupAndLogin } from "./helpers";

describe("comments", () => {
  beforeEach(async () => {
    await setupDb();
  });

  async function createPost(cookies: string, csrf: string): Promise<number> {
    const res = await SELF.fetch("http://localhost/new", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies },
      body: new URLSearchParams({ csrf_token: csrf, title: "Test", body: "Body text" }),
      redirect: "manual",
    });
    return parseInt(res.headers.get("location")!.split("/").pop()!, 10);
  }

  it("logged-in user can comment", async () => {
    const { csrf, cookies } = await signupAndLogin("commenter", "c@example.com", "password123");
    const postId = await createPost(cookies, csrf);
    const res = await SELF.fetch(`http://localhost/api/post/${postId}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf, Cookie: cookies },
      body: JSON.stringify({ body: "Nice post!" }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.comment.body).toBe("Nice post!");
  });

  it("guest gets 401", async () => {
    const { csrf, cookies } = await signupAndLogin("poster", "p@example.com", "password123");
    const postId = await createPost(cookies, csrf);
    const res = await SELF.fetch(`http://localhost/api/post/${postId}/comment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
      body: JSON.stringify({ body: "Hi" }),
    });
    expect(res.status).toBe(401);
  });
});
