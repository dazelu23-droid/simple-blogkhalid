import { env, SELF } from "cloudflare:test";
import schema from "../schema.sql?raw";

export async function setupDb(): Promise<void> {
  await env.DB.exec("PRAGMA foreign_keys = ON");
  for (const stmt of schema.split(";").map((s) => s.trim()).filter(Boolean)) {
    await env.DB.exec(stmt);
  }
}

export function extractCsrf(html: string): string {
  const match = html.match(/name="csrf_token"\s+value="([^"]+)"/);
  if (!match) throw new Error("CSRF token not found");
  return match[1];
}

export async function signupAndLogin(
  username: string,
  email: string,
  password: string
): Promise<{ csrf: string; cookies: string }> {
  let res = await SELF.fetch("http://localhost/signup");
  let csrf = extractCsrf(await res.text());
  let cookies = res.headers.get("set-cookie") ?? "";
  res = await SELF.fetch("http://localhost/signup", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies },
    body: new URLSearchParams({ csrf_token: csrf, username, email, password }),
    redirect: "manual",
  });
  res = await SELF.fetch("http://localhost/login");
  csrf = extractCsrf(await res.text());
  cookies = res.headers.get("set-cookie") ?? cookies;
  res = await SELF.fetch("http://localhost/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookies },
    body: new URLSearchParams({ csrf_token: csrf, username, password }),
    redirect: "manual",
  });
  const newCookie = res.headers.get("set-cookie");
  if (newCookie) cookies = newCookie;
  res = await SELF.fetch("http://localhost/", { headers: { Cookie: cookies } });
  csrf = extractCsrf(await res.text());
  return { csrf, cookies };
}
