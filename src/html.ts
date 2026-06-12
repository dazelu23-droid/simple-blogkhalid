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

function fishSvg(): string {
  return `<svg class="fish-svg" viewBox="0 0 100 50" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g class="fish-tail">
      <path class="fish-fin" d="M16 25 L3 11 L8 21 Z"/>
      <path class="fish-fin" d="M16 25 L3 39 L8 29 Z"/>
    </g>
    <path class="fish-body" d="M16 25 C16 14 30 9 50 9 C72 9 86 15 91 22 C94 25 94 25 91 28 C86 35 72 41 50 41 C30 41 16 36 16 25 Z"/>
    <path class="fish-belly" d="M28 27 C42 35 62 35 80 27 C68 38 48 40 32 36 C28 34 28 27 28 27 Z"/>
    <path class="fish-fin fish-dorsal" d="M36 11 L48 3 L58 11 Z"/>
    <path class="fish-fin fish-fin-soft" d="M60 12 L67 7 L73 12 Z"/>
    <path class="fish-fin fish-pectoral" d="M68 28 L76 38 L68 35 Z"/>
    <path class="fish-fin fish-ventral" d="M42 37 L48 45 L54 37 Z"/>
    <path class="fish-stripe" d="M40 13 L40 35"/>
    <path class="fish-stripe" d="M50 12 L50 36"/>
    <path class="fish-stripe" d="M60 13 L60 35"/>
    <path class="fish-gill" d="M74 17 Q77 25 74 33"/>
    <circle class="fish-eye-bg" cx="84" cy="23" r="4.5"/>
    <circle class="fish-eye" cx="85.2" cy="23" r="2.2"/>
    <circle class="fish-eye-shine" cx="86" cy="22" r="0.8"/>
    <path class="fish-mouth" d="M91 24.5 Q94 25.5 91 26.5"/>
    <g class="fish-lure">
      <path class="fish-lure-stalk" d="M89 16 Q84 8 79 3"/>
      <circle class="fish-lure-glow" cx="79" cy="3" r="3.5"/>
      <circle class="fish-lure-core" cx="79" cy="3" r="1.5"/>
    </g>
  </svg>`;
}

function fish(classes: string): string {
  return `<span class="fish ${classes}">${fishSvg()}</span>`;
}

function coralBranchSvg(): string {
  return `<svg class="flora-svg" viewBox="0 0 70 90" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path class="coral-stem" d="M35 90 L35 52"/>
    <path class="coral-branch" d="M35 68 L18 48 M35 60 L52 42 M35 52 L22 32 M35 48 L48 28"/>
    <circle class="coral-tip" cx="18" cy="48" r="5"/>
    <circle class="coral-tip" cx="52" cy="42" r="4.5"/>
    <circle class="coral-tip" cx="22" cy="32" r="4"/>
    <circle class="coral-tip" cx="48" cy="28" r="3.5"/>
  </svg>`;
}

function coralBrainSvg(): string {
  return `<svg class="flora-svg" viewBox="0 0 80 50" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path class="coral-brain" d="M8 42 Q18 28 28 38 Q38 24 48 36 Q58 22 68 38 Q58 46 38 44 Q18 48 8 42 Z"/>
    <path class="coral-brain-light" d="M20 38 Q28 32 36 38 Q28 42 20 38 Z"/>
    <path class="coral-brain-light" d="M44 36 Q52 30 58 36 Q52 40 44 36 Z"/>
  </svg>`;
}

function seaweedSvg(): string {
  return `<svg class="flora-svg" viewBox="0 0 50 110" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path class="flora-stem" d="M25 110 Q27 70 25 30"/>
    <path class="flora-blade" d="M25 95 Q8 80 12 55 Q20 75 25 95"/>
    <path class="flora-blade" d="M25 80 Q42 65 38 40 Q30 60 25 80"/>
    <path class="flora-blade" d="M25 60 Q10 48 14 25 Q22 42 25 60"/>
    <path class="flora-blade" d="M25 45 Q40 32 36 12 Q28 28 25 45"/>
    <ellipse class="flora-tip-dot" cx="25" cy="18" rx="4" ry="6"/>
  </svg>`;
}

function anemoneSvg(): string {
  return `<svg class="flora-svg" viewBox="0 0 60 70" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse class="anemone-base" cx="30" cy="62" rx="16" ry="7"/>
    <path class="anemone-tentacle" d="M14 62 Q10 40 16 18"/>
    <path class="anemone-tentacle" d="M22 62 Q20 38 24 14"/>
    <path class="anemone-tentacle" d="M30 62 Q30 36 30 10"/>
    <path class="anemone-tentacle" d="M38 62 Q40 38 36 14"/>
    <path class="anemone-tentacle" d="M46 62 Q50 40 44 18"/>
    <circle class="anemone-tip" cx="16" cy="18" r="2.5"/>
    <circle class="anemone-tip" cx="24" cy="14" r="2.5"/>
    <circle class="anemone-tip" cx="30" cy="10" r="3"/>
    <circle class="anemone-tip" cx="36" cy="14" r="2.5"/>
    <circle class="anemone-tip" cx="44" cy="18" r="2.5"/>
  </svg>`;
}

function flora(kind: string, classes: string): string {
  let svg = "";
  if (kind === "branch") svg = coralBranchSvg();
  else if (kind === "brain") svg = coralBrainSvg();
  else if (kind === "seaweed") svg = seaweedSvg();
  else svg = anemoneSvg();
  return `<span class="flora flora-${kind} ${classes}">${svg}</span>`;
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
      <a href="/" class="logo" title="Some secrets are typed, not clicked">Simple Blog</a>
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
    ? `<script src="/theme.js" defer></script><script src="/secret-game.js" defer></script>${opts.extraScripts}`
    : `<script src="/theme.js" defer></script><script src="/secret-game.js" defer></script>`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(opts.title)} — Simple Blog</title>
  <link rel="stylesheet" href="/style.css">
  <link rel="stylesheet" href="/scenery.css">
</head>
<body>
  <div class="scene-bg" aria-hidden="true">
    <div class="sea-layer">
      <div class="wave wave-1"></div>
      <div class="wave wave-2"></div>
      <div class="wave wave-3"></div>
      <span class="bubble b1"></span>
      <span class="bubble b2"></span>
      <span class="bubble b3"></span>
      <span class="bubble b4"></span>
      <span class="bubble b5"></span>
      <span class="bubble b6"></span>
      <span class="deep-glow g1"></span>
      <span class="deep-glow g2"></span>
      <span class="deep-glow g3"></span>
    </div>
    <div class="fish-layer">
      ${fish("f1")}
      ${fish("f2 rev")}
      ${fish("f3 sm")}
      ${fish("f4 rev lg")}
      ${fish("f5")}
      ${fish("f6 rev sm")}
      ${fish("f7")}
      ${fish("f8 rev angler")}
    </div>
    <div class="flora-layer">
      ${flora("branch", "fl1")}
      ${flora("brain", "fl2")}
      ${flora("seaweed", "fl3 tall")}
      ${flora("anemone", "fl4")}
      ${flora("branch", "fl5 sm")}
      ${flora("seaweed", "fl6")}
      ${flora("brain", "fl7 sm")}
      ${flora("anemone", "fl8 sm")}
    </div>

    <div class="mushroom-layer">
      <span class="mushroom m1"></span>
      <span class="mushroom m2"></span>
      <span class="mushroom m3"></span>
      <span class="mushroom m4"></span>
      <span class="mushroom m5"></span>
      <span class="mushroom m6"></span>
    </div>
  </div>
  ${nav(opts.session)}
  <main class="container">${opts.body}</main>
  <footer class="site-footer">
    <p>&copy; 2026 Simple Blog</p>
    <p class="easter-egg-hint">
      <button type="button" id="hint-toggle" class="hint-toggle" aria-expanded="false" aria-controls="easter-egg-hints">
        🎮 Hidden surprise?
      </button>
    </p>
    <div id="easter-egg-hints" class="easter-egg-hints" hidden>
      <p class="hint-lead">Enter this key sequence on any page:</p>
      <p class="konami-display" aria-label="Up, Up, Down, Down, Left, Right, Left, Right, B, A">
        <span>↑</span><span>↑</span><span>↓</span><span>↓</span><span>←</span><span>→</span><span>←</span><span>→</span><span>B</span><span>A</span>
      </p>
      <p class="hint-detail">Unlock <strong>Post Catcher</strong> — catch 📄 posts and ⭐ stars, dodge 🗑️ trash. Use arrow keys or drag to move.</p>
    </div>
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
           <p class="empty-hint">While you wait… check the footer for a hidden surprise. 🎮</p>
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
