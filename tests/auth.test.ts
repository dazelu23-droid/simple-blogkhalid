import { describe, it, expect, beforeEach } from "vitest";
import { SELF } from "cloudflare:test";
import { setupDb, extractCsrf } from "./helpers";

describe("auth", () => {
  beforeEach(async () => {
    await setupDb();
  });

  it("signup and login flow", async () => {
    let res = await SELF.fetch("http://localhost/signup");
    let csrf = extractCsrf(await res.text());
    let cookies = res.headers.get("set-cookie") ?? "";
    res = await SELF.fetch("http://localhost/signup", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies },
      body: new URLSearchParams({
        csrf_token: csrf,
        username: "alice",
        email: "alice@example.com",
        password: "password123",
      }),
      redirect: "manual",
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/login");

    res = await SELF.fetch("http://localhost/login");
    csrf = extractCsrf(await res.text());
    res = await SELF.fetch("http://localhost/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies },
      body: new URLSearchParams({ csrf_token: csrf, username: "alice", password: "password123" }),
      redirect: "manual",
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/");
  });

  it("rejects duplicate username case-insensitively", async () => {
    let res = await SELF.fetch("http://localhost/signup");
    let csrf = extractCsrf(await res.text());
    let cookies = res.headers.get("set-cookie") ?? "";
    const body = new URLSearchParams({
      csrf_token: csrf,
      username: "Alice",
      email: "a@example.com",
      password: "password123",
    });
    await SELF.fetch("http://localhost/signup", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies },
      body,
      redirect: "manual",
    });
    res = await SELF.fetch("http://localhost/signup");
    csrf = extractCsrf(await res.text());
    res = await SELF.fetch("http://localhost/signup", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies },
      body: new URLSearchParams({
        csrf_token: csrf,
        username: "alice",
        email: "b@example.com",
        password: "password123",
      }),
    });
    expect(res.status).toBe(400);
  });

  it("wrong password returns 400", async () => {
    let res = await SELF.fetch("http://localhost/signup");
    let csrf = extractCsrf(await res.text());
    let cookies = res.headers.get("set-cookie") ?? "";
    await SELF.fetch("http://localhost/signup", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies },
      body: new URLSearchParams({
        csrf_token: csrf,
        username: "bob",
        email: "bob@example.com",
        password: "password123",
      }),
      redirect: "manual",
    });
    res = await SELF.fetch("http://localhost/login");
    csrf = extractCsrf(await res.text());
    res = await SELF.fetch("http://localhost/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies },
      body: new URLSearchParams({ csrf_token: csrf, username: "bob", password: "wrongpass" }),
    });
    expect(res.status).toBe(400);
  });

  it("blocks open redirect", async () => {
    let res = await SELF.fetch("http://localhost/signup");
    let csrf = extractCsrf(await res.text());
    let cookies = res.headers.get("set-cookie") ?? "";
    await SELF.fetch("http://localhost/signup", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies },
      body: new URLSearchParams({
        csrf_token: csrf,
        username: "carol",
        email: "carol@example.com",
        password: "password123",
      }),
      redirect: "manual",
    });
    res = await SELF.fetch("http://localhost/login?next=//evil.com");
    csrf = extractCsrf(await res.text());
    res = await SELF.fetch("http://localhost/login?next=//evil.com", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies },
      body: new URLSearchParams({ csrf_token: csrf, username: "carol", password: "password123" }),
      redirect: "manual",
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/");
  });

  it("guest GET /new redirects to login", async () => {
    const res = await SELF.fetch("http://localhost/new", { redirect: "manual" });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/login?next=%2Fnew");
  });
});
