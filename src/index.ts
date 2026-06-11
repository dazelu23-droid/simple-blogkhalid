import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Env, SessionData } from "./types";
import { initDb, listPosts, getPostById, createPost, updatePost, deletePost, getUserByUsername, getUserByEmail, createUser, getCommentsForPost, createComment, getReactionCounts, getReaction, setReaction, searchPosts } from "./db";
import { generateToken, hashPassword, verifyPassword, signSession, verifySession, timingSafeCompare } from "./crypto";
import { validateUsername, validateEmail, validatePassword, validateTitle, validateBody, validateComment, validateReactionKind, safeRedirect } from "./validation";
import { layout, indexPage, postPage, loginPage, signupPage, postFormPage, searchPage, errorJson } from "./html";

const SESSION_COOKIE = "session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

type AppVars = { session: SessionData | null };
const app = new Hono<{ Bindings: Env; Variables: AppVars }>();

function securityHeaders(): Record<string, string> {
  return {
    "Content-Security-Policy": "default-src 'self'",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
}

function withHeaders(res: Response): Response {
  const h = securityHeaders();
  for (const [k, v] of Object.entries(h)) res.headers.set(k, v);
  return res;
}

type AppContext = {
  env: Env;
  req: { url: string; raw: Request; header: (name: string) => string | undefined };
};

async function readSession(c: AppContext & object): Promise<SessionData | null> {
  const cookie = getCookie(c as never, SESSION_COOKIE);
  if (!cookie) return null;
  return verifySession<SessionData>(cookie, c.env);
}

async function writeSession(c: AppContext & object, session: SessionData): Promise<void> {
  const value = await signSession(session, c.env);
  const secure = new URL(c.req.url).protocol === "https:";
  setCookie(c as never, SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "Lax",
    secure,
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

function guestSession(): SessionData {
  return { userId: 0, username: "", csrfToken: generateToken() };
}

async function ensureCsrfToken(c: { env: Env; req: { raw: Request }; set: (k: string, v: SessionData | null) => void }): Promise<SessionData> {
  let session = await readSession(c);
  if (!session) {
    session = guestSession();
    await writeSession(c as never, session);
  } else if (!session.csrfToken) {
    session.csrfToken = generateToken();
    await writeSession(c as never, session);
  }
  c.set("session", session);
  return session;
}

async function getCsrfFromRequest(c: { req: { raw: Request; header: (n: string) => string | undefined; parseBody: () => Promise<Record<string, unknown>> } }): Promise<string | null> {
  const header = c.req.header("X-CSRF-Token");
  if (header) return header;
  const contentType = c.req.header("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const clone = c.req.raw.clone();
    try {
      const body = (await clone.json()) as Record<string, unknown>;
      if (typeof body.csrf_token === "string") return body.csrf_token;
    } catch { /* ignore */ }
    return null;
  }
  const body = await c.req.parseBody();
  const token = body["csrf_token"];
  return typeof token === "string" ? token : null;
}

app.use("*", async (c, next) => {
  await initDb(c.env.DB);
  await ensureCsrfToken(c);
  await next();
  const res = c.res;
  const h = securityHeaders();
  for (const [k, v] of Object.entries(h)) {
    if (!res.headers.has(k)) res.headers.set(k, v);
  }
});

app.get("/", async (c) => {
  const posts = await listPosts(c.env.DB);
  const session = c.get("session");
  return c.html(indexPage(posts, session?.userId ? session : null));
});

app.get("/signup", async (c) => {
  const session = c.get("session")!;
  return c.html(signupPage(session));
});

app.post("/signup", async (c) => {
  const session = c.get("session")!;
  const token = await getCsrfFromRequest(c);
  if (!token || !timingSafeCompare(token, session.csrfToken)) {
    return c.html("CSRF validation failed", 400);
  }
  const body = await c.req.parseBody();
  const username = String(body.username ?? "");
  const email = String(body.email ?? "");
  const password = String(body.password ?? "");
  const errors: string[] = [];
  const uErr = validateUsername(username);
  if (uErr) errors.push(uErr);
  const eErr = validateEmail(email);
  if (eErr) errors.push(eErr);
  const pErr = validatePassword(password);
  if (pErr) errors.push(pErr);
  if (errors.length === 0) {
    if (await getUserByUsername(c.env.DB, username)) errors.push("That username is already taken.");
    if (await getUserByEmail(c.env.DB, email)) errors.push("That email is already registered.");
  }
  if (errors.length > 0) return c.html(signupPage(session, errors), 400);
  const hash = await hashPassword(password);
  try {
    await createUser(c.env.DB, username, email, hash);
  } catch {
    return c.html(signupPage(session, ["That username is already taken."]), 400);
  }
  return c.redirect("/login", 302);
});

app.get("/login", async (c) => {
  const session = c.get("session")!;
  const next = c.req.query("next") ?? "/";
  return c.html(loginPage(session, next));
});

app.post("/login", async (c) => {
  const session = c.get("session")!;
  const token = await getCsrfFromRequest(c);
  if (!token || !timingSafeCompare(token, session.csrfToken)) {
    return c.html("CSRF validation failed", 400);
  }
  const body = await c.req.parseBody();
  const username = String(body.username ?? "");
  const password = String(body.password ?? "");
  const user = await getUserByUsername(c.env.DB, username);
  const valid = user && (await verifyPassword(password, user.password_hash));
  if (!valid) {
    return c.html(loginPage(session, c.req.query("next") ?? "/", "Invalid username or password."), 400);
  }
  const newSession: SessionData = { userId: user!.id, username: user!.username, csrfToken: generateToken() };
  await writeSession(c, newSession);
  return c.redirect(safeRedirect(c.req.query("next")), 302);
});

app.post("/logout", async (c) => {
  const session = c.get("session")!;
  const token = await getCsrfFromRequest(c);
  if (!token || !timingSafeCompare(token, session.csrfToken)) {
    return c.html("CSRF validation failed", 400);
  }
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  const guest = guestSession();
  await writeSession(c, guest);
  return c.redirect("/", 302);
});

function requireLogin(
  c: { get: (k: "session") => SessionData | null; req: { url: string }; redirect: (url: string, status?: number) => Response }
): SessionData | Response {
  const session = c.get("session");
  if (!session?.userId) {
    const path = new URL(c.req.url).pathname;
    return c.redirect(`/login?next=${encodeURIComponent(path)}`, 302);
  }
  return session;
}

app.get("/new", async (c) => {
  const auth = requireLogin(c);
  if (auth instanceof Response) return auth;
  return c.html(postFormPage(auth, "New post", "New post", "/new", { title: "", body: "" }));
});

app.post("/new", async (c) => {
  const auth = requireLogin(c);
  if (auth instanceof Response) return auth;
  const token = await getCsrfFromRequest(c);
  if (!token || !timingSafeCompare(token, auth.csrfToken)) {
    return c.html("CSRF validation failed", 400);
  }
  const body = await c.req.parseBody();
  const title = String(body.title ?? "");
  const postBody = String(body.body ?? "");
  const errors: string[] = [];
  const tErr = validateTitle(title);
  if (tErr) errors.push(tErr);
  const bErr = validateBody(postBody);
  if (bErr) errors.push(bErr);
  if (errors.length > 0) {
    return c.html(postFormPage(auth, "New post", "New post", "/new", { title, body: postBody }, errors), 400);
  }
  const id = await createPost(c.env.DB, auth.userId, title.trim(), postBody.trim());
  return c.redirect(`/post/${id}`, 302);
});

app.get("/post/:id", async (c) => {
  const id = parseInt(c.req.param("id"), 10);
  const post = await getPostById(c.env.DB, id);
  if (!post) return c.html(layout({ title: "Not found", session: c.get("session"), body: "<h1>Post not found</h1>" }), 404);
  const comments = await getCommentsForPost(c.env.DB, id);
  const counts = await getReactionCounts(c.env.DB, id);
  const session = c.get("session");
  const userReaction = session?.userId ? await getReaction(c.env.DB, id, session.userId) : null;
  return c.html(postPage(post, comments, counts, userReaction, session?.userId ? session : null));
});

app.get("/edit/:id", async (c) => {
  const auth = requireLogin(c);
  if (auth instanceof Response) return auth;
  const id = parseInt(c.req.param("id"), 10);
  const post = await getPostById(c.env.DB, id);
  if (!post) return c.html(layout({ title: "Not found", session: auth, body: "<h1>Post not found</h1>" }), 404);
  if (post.author_id !== auth.userId) return c.html(layout({ title: "Forbidden", session: auth, body: "<h1>Forbidden</h1>" }), 403);
  return c.html(postFormPage(auth, "Edit post", "Edit post", `/edit/${id}`, { title: post.title, body: post.body }));
});

app.post("/edit/:id", async (c) => {
  const auth = requireLogin(c);
  if (auth instanceof Response) return auth;
  const token = await getCsrfFromRequest(c);
  if (!token || !timingSafeCompare(token, auth.csrfToken)) {
    return c.html("CSRF validation failed", 400);
  }
  const id = parseInt(c.req.param("id"), 10);
  const post = await getPostById(c.env.DB, id);
  if (!post) return c.html(layout({ title: "Not found", session: auth, body: "<h1>Post not found</h1>" }), 404);
  if (post.author_id !== auth.userId) return c.html(layout({ title: "Forbidden", session: auth, body: "<h1>Forbidden</h1>" }), 403);
  const body = await c.req.parseBody();
  const title = String(body.title ?? "");
  const postBody = String(body.body ?? "");
  const errors: string[] = [];
  const tErr = validateTitle(title);
  if (tErr) errors.push(tErr);
  const bErr = validateBody(postBody);
  if (bErr) errors.push(bErr);
  if (errors.length > 0) {
    return c.html(postFormPage(auth, "Edit post", "Edit post", `/edit/${id}`, { title, body: postBody }, errors), 400);
  }
  await updatePost(c.env.DB, id, title.trim(), postBody.trim());
  return c.redirect(`/post/${id}`, 302);
});

app.post("/delete/:id", async (c) => {
  const auth = requireLogin(c);
  if (auth instanceof Response) return auth;
  const token = await getCsrfFromRequest(c);
  if (!token || !timingSafeCompare(token, auth.csrfToken)) {
    return c.html("CSRF validation failed", 400);
  }
  const id = parseInt(c.req.param("id"), 10);
  const post = await getPostById(c.env.DB, id);
  if (!post) return c.html(layout({ title: "Not found", session: auth, body: "<h1>Post not found</h1>" }), 404);
  if (post.author_id !== auth.userId) return c.html(layout({ title: "Forbidden", session: auth, body: "<h1>Forbidden</h1>" }), 403);
  await deletePost(c.env.DB, id);
  return c.redirect("/", 302);
});

app.get("/search", async (c) => {
  const q = (c.req.query("q") ?? "").trim().slice(0, 100);
  const session = c.get("session");
  if (!q) return c.html(searchPage(session?.userId ? session : null, "", null));
  const posts = await searchPosts(c.env.DB, q);
  return c.html(searchPage(session?.userId ? session : null, q, posts));
});

app.post("/api/post/:id/comment", async (c) => {
  const session = c.get("session")!;
  const token = await getCsrfFromRequest(c);
  if (!token || !timingSafeCompare(token, session.csrfToken)) {
    return c.json({ ok: false, error: "CSRF token missing or invalid." }, 400);
  }
  if (!session.userId) {
    return c.json({ ok: false, error: "Please log in first." }, 401);
  }
  const id = parseInt(c.req.param("id"), 10);
  const post = await getPostById(c.env.DB, id);
  if (!post) return c.json({ ok: false, error: "Post not found." }, 404);
  let body: unknown;
  try {
    body = (await c.req.json()) as { body?: unknown };
  } catch {
    return c.json({ ok: false, error: "Comment must be text." }, 400);
  }
  const cErr = validateComment(body.body);
  if (cErr) return c.json({ ok: false, error: cErr }, 400);
  const comment = await createComment(c.env.DB, id, session.userId, (body.body as string).trim());
  return c.json({
    ok: true,
    comment: {
      id: comment.id,
      post_id: comment.post_id,
      body: comment.body,
      created_at: comment.created_at,
      author: comment.author,
    },
  }, 201);
});

app.post("/api/post/:id/react", async (c) => {
  const session = c.get("session")!;
  const token = await getCsrfFromRequest(c);
  if (!token || !timingSafeCompare(token, session.csrfToken)) {
    return c.json({ ok: false, error: "CSRF token missing or invalid." }, 400);
  }
  if (!session.userId) {
    return c.json({ ok: false, error: "Please log in first." }, 401);
  }
  const id = parseInt(c.req.param("id"), 10);
  const post = await getPostById(c.env.DB, id);
  if (!post) return c.json({ ok: false, error: "Post not found." }, 404);
  let data: { kind?: unknown };
  try {
    data = await c.req.json();
  } catch {
    return c.json({ ok: false, error: "Reaction must be 'like' or 'dislike'." }, 400);
  }
  const kErr = validateReactionKind(data.kind);
  if (kErr) return c.json({ ok: false, error: kErr }, 400);
  const reaction = await setReaction(c.env.DB, id, session.userId, data.kind as string);
  const counts = await getReactionCounts(c.env.DB, id);
  return c.json({ ok: true, reaction, counts });
});

app.all("*", async (c) => {
  if (c.env.ASSETS) {
    const asset = await c.env.ASSETS.fetch(c.req.raw);
    if (asset.status !== 404) return withHeaders(asset);
  }
  return c.html(layout({ title: "Not found", session: c.get("session"), body: "<h1>Page not found</h1>" }), 404);
});

export default app;
