import type { Comment, Post, SessionData } from "./types";
import { truncatePreview } from "./validation";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface LayoutOpts {
  title: string;
  session: SessionData | null;
  body: string;
  extraScripts?: string;
}

function nav(session: SessionData | null): string {
  const loggedIn = !!(session && session.userId > 0);
  const user = loggedIn
    ? `<span class="nav-user">Hi, ${esc(session.username)}</span>
       <form class="nav-form" method="post" action="/logout">
         <input type="hidden" name="csrf_token" value="${esc(session.csrfToken)}">
         <button type="submit" class="btn btn-ghost">Log out</button>
       </form>`
    : `<a href="/login" class="btn btn-ghost">Log in</a>
       <a href="/signup" class="btn btn-primary">Sign up</a>`;
  const newPost = loggedIn
    ? `<a href="/new" class="btn btn-primary">New post</a>`
    : "";
  return `<header class="site-header">
    <div class="header-inner">
      <a href="/" class="logo">Simple Blog</a>
      <nav class="main-nav">
        <a href="/">Home</a>
        <a href="/search">Search</a>
        ${newPost}
        ${user}
        <label class="theme-picker">
          <span class="theme-picker-label">Theme</span>
          <select id="theme-select" class="theme-select" aria-label="Choose page color theme"></select>
        </label>
      </nav>
    </div>
  </header>`;
}

export function layout(opts: LayoutOpts): string {
  const scripts = opts.extraScripts
    ? `<script src="/theme.js" defer></script>${opts.extraScripts}`
    : `<script src="/theme.js" defer></script>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(opts.title)} — Simple Blog</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  ${nav(opts.session)}
  <main class="container">${opts.body}</main>
  <footer class="site-footer">
    <p>&copy; 2026 Simple Blog</p>
  </footer>
  ${scripts}
</body>
</html>`;
}

export function postCard(post: Post): string {
  const preview = truncatePreview(post.body);
  return `<article class="post-card">
    <h2 class="post-card-title"><a href="/post/${post.id}">${esc(post.title)}</a></h2>
    <p class="post-card-meta">By ${esc(post.author ?? "unknown")} · ${esc(post.created_at)}</p>
    <p class="post-card-preview">${esc(preview)}</p>
    <a href="/post/${post.id}" class="read-more">Read more →</a>
  </article>`;
}

export function indexPage(
  posts: Post[],
  session: SessionData | null
): string {
  const content =
    posts.length === 0
      ? `<div class="empty-state">
           <img src="https://images.unsplash.com/photo-1499750310107-5fef28fd666f?w=600&h=300&fit=crop" alt="Empty blog desk" width="600" height="300" class="empty-img">
           <h1>Welcome to Simple Blog</h1>
           <p>No posts yet. Be the first to share something!</p>
         </div>`
      : `<h1 class="page-title">Latest Posts</h1>
         <div class="post-list">${posts.map(postCard).join("")}</div>`;
  return layout({ title: "Home", session, body: content });
}

export function postPage(
  post: Post,
  comments: Comment[],
  counts: { like: number; dislike: number },
  userReaction: string | null,
  session: SessionData | null
): string {
  const edited = post.updated_at
    ? `<span class="edited-marker">(edited)</span>`
    : "";
  const authorActions =
    session && session.userId > 0 && session.userId === post.author_id
      ? `<div class="post-actions">
           <a href="/edit/${post.id}" class="btn btn-ghost">Edit</a>
           <form method="post" action="/delete/${post.id}" class="inline-form" id="delete-form">
             <input type="hidden" name="csrf_token" value="${esc(session.csrfToken)}">
             <button type="submit" class="btn btn-danger" id="delete-btn">Delete</button>
           </form>
         </div>`
      : "";
  const commentList =
    comments.length === 0
      ? `<p class="empty-comments">No comments yet. Be the first!</p>`
      : `<ul class="comment-list" id="comment-list">${comments
          .map(
            (c) =>
              `<li class="comment" data-comment-id="${c.id}">
                 <p class="comment-meta">${esc(c.author ?? "unknown")} · ${esc(c.created_at)}</p>
                 <p class="comment-body">${esc(c.body)}</p>
               </li>`
          )
          .join("")}</ul>`;
  const commentForm = session && session.userId > 0
    ? `<form id="comment-form" class="comment-form">
         <label for="comment-body">Add a comment</label>
         <textarea id="comment-body" name="body" rows="3" maxlength="2000" required></textarea>
         <button type="submit" class="btn btn-primary">Post comment</button>
       </form>`
    : `<p class="login-prompt"><a href="/login?next=/post/${post.id}">Log in</a> to leave a comment.</p>`;
  const likeActive = userReaction === "like" ? " active" : "";
  const dislikeActive = userReaction === "dislike" ? " active" : "";
  const reactions = `<div class="reactions" id="reactions" data-post-id="${post.id}">
    <button type="button" class="reaction-btn${likeActive}" data-kind="like" id="like-btn">
      👍 <span id="like-count">${counts.like}</span>
    </button>
    <button type="button" class="reaction-btn${dislikeActive}" data-kind="dislike" id="dislike-btn">
      👎 <span id="dislike-count">${counts.dislike}</span>
    </button>
  </div>`;
  const body = `<article class="post-detail">
    ${authorActions}
    <h1 class="post-title">${esc(post.title)} ${edited}</h1>
    <p class="post-meta">By ${esc(post.author ?? "unknown")} · ${esc(post.created_at)}</p>
    <img src="https://images.unsplash.com/photo-1455390215743-bfdc85d4e3fe?w=800&h=400&fit=crop" alt="Blog header" class="post-hero-img" width="800" height="400">
    <div class="post-body">${esc(post.body)
      .split("\n")
      .map((p) => `<p>${p}</p>`)
      .join("")}</div>
    ${reactions}
    <section class="comments-section">
      <h2>Comments</h2>
      ${commentForm}
      ${commentList}
    </section>
  </article>`;
  const csrfMeta = session
    ? `<script>window.__CSRF__ = ${JSON.stringify(session.csrfToken)};</script>`
    : "";
  return layout({
    title: post.title,
    session,
    body,
    extraScripts: `${csrfMeta}<script src="/post.js" defer></script>`,
  });
}

export function loginPage(
  session: SessionData | null,
  next: string,
  error?: string
): string {
  const err = error ? `<div class="form-error">${esc(error)}</div>` : "";
  const body = `<div class="auth-card">
    <h1>Log in</h1>
    ${err}
    <form method="post" action="/login?next=${encodeURIComponent(next)}" class="auth-form">
      <input type="hidden" name="csrf_token" value="${esc(session!.csrfToken)}">
      <label for="username">Username</label>
      <input type="text" id="username" name="username" required autocomplete="username">
      <label for="password">Password</label>
      <input type="password" id="password" name="password" required autocomplete="current-password">
      <button type="submit" class="btn btn-primary">Log in</button>
    </form>
    <p class="auth-hint">No account? <a href="/signup">Sign up</a></p>
  </div>`;
  return layout({ title: "Log in", session, body });
}

export function signupPage(
  session: SessionData | null,
  errors: string[] = []
): string {
  const err =
    errors.length > 0
      ? `<div class="form-error">${errors.map(esc).join("<br>")}</div>`
      : "";
  const body = `<div class="auth-card">
    <h1>Sign up</h1>
    ${err}
    <form method="post" action="/signup" class="auth-form">
      <input type="hidden" name="csrf_token" value="${esc(session!.csrfToken)}">
      <label for="username">Username</label>
      <input type="text" id="username" name="username" required autocomplete="username">
      <p class="field-hint">3–30 letters, digits, or underscores.</p>
      <label for="email">Email</label>
      <input type="email" id="email" name="email" required autocomplete="email">
      <label for="password">Password</label>
      <input type="password" id="password" name="password" required autocomplete="new-password">
      <p class="field-hint">At least 8 characters.</p>
      <button type="submit" class="btn btn-primary">Create account</button>
    </form>
    <p class="auth-hint">Already have an account? <a href="/login">Log in</a></p>
  </div>`;
  return layout({ title: "Sign up", session, body });
}

export function postFormPage(
  session: SessionData | null,
  title: string,
  heading: string,
  action: string,
  values: { title: string; body: string },
  errors: string[] = []
): string {
  const err =
    errors.length > 0
      ? `<div class="form-error">${errors.map(esc).join("<br>")}</div>`
      : "";
  const body = `<div class="form-card">
    <h1>${esc(heading)}</h1>
    ${err}
    <form method="post" action="${esc(action)}" class="post-form">
      <input type="hidden" name="csrf_token" value="${esc(session!.csrfToken)}">
      <label for="title">Title</label>
      <input type="text" id="title" name="title" value="${esc(values.title)}" maxlength="200" required>
      <label for="body">Body</label>
      <textarea id="body" name="body" rows="12" maxlength="20000" required>${esc(values.body)}</textarea>
      <button type="submit" class="btn btn-primary">Save</button>
    </form>
  </div>`;
  return layout({ title, session, body });
}

export function searchPage(
  session: SessionData | null,
  query: string,
  posts: Post[] | null
): string {
  const results =
    posts === null
      ? `<div class="empty-state"><p>Enter a search term to find posts.</p></div>`
      : posts.length === 0
        ? `<div class="empty-state"><p>No posts match "${esc(query)}".</p></div>`
        : `<div class="post-list">${posts.map(postCard).join("")}</div>`;
  const body = `<h1 class="page-title">Search</h1>
    <form method="get" action="/search" class="search-form">
      <label for="q">Search posts</label>
      <input type="search" id="q" name="q" value="${esc(query)}" maxlength="100" placeholder="Search by title or body…">
      <button type="submit" class="btn btn-primary">Search</button>
    </form>
    ${results}`;
  return layout({ title: "Search", session, body });
}

export function errorJson(error: string): string {
  return JSON.stringify({ ok: false, error });
}
