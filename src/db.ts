import type { Comment, Post, User } from "./types";

export async function initDb(db: D1Database): Promise<void> {
  await db.exec("PRAGMA foreign_keys = ON");
}

export async function getUserById(
  db: D1Database,
  id: number
): Promise<User | null> {
  return (
    (await db
      .prepare("SELECT * FROM users WHERE id = ?")
      .bind(id)
      .first<User>()) ?? null
  );
}

export async function getUserByUsername(
  db: D1Database,
  username: string
): Promise<User | null> {
  return (
    (await db
      .prepare("SELECT * FROM users WHERE username = ? COLLATE NOCASE")
      .bind(username)
      .first<User>()) ?? null
  );
}

export async function getUserByEmail(
  db: D1Database,
  email: string
): Promise<User | null> {
  return (
    (await db
      .prepare("SELECT * FROM users WHERE email = ?")
      .bind(email.toLowerCase())
      .first<User>()) ?? null
  );
}

export async function createUser(
  db: D1Database,
  username: string,
  email: string,
  passwordHash: string
): Promise<number> {
  const result = await db
    .prepare(
      "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)"
    )
    .bind(username, email.toLowerCase(), passwordHash)
    .run();
  return Number(result.meta.last_row_id);
}

export async function getPostById(
  db: D1Database,
  id: number
): Promise<Post | null> {
  return (
    (await db
      .prepare(
        `SELECT p.*, u.username AS author
         FROM posts p JOIN users u ON p.author_id = u.id
         WHERE p.id = ?`
      )
      .bind(id)
      .first<Post>()) ?? null
  );
}

export async function listPosts(
  db: D1Database,
  limit?: number
): Promise<Post[]> {
  const sql = `SELECT p.*, u.username AS author
    FROM posts p JOIN users u ON p.author_id = u.id
    ORDER BY p.created_at DESC, p.id DESC${limit ? " LIMIT ?" : ""}`;
  const stmt = db.prepare(sql);
  const result = limit
    ? await stmt.bind(limit).all<Post>()
    : await stmt.all<Post>();
  return result.results ?? [];
}

export async function searchPosts(
  db: D1Database,
  query: string
): Promise<Post[]> {
  const escaped = query.replace(/[%_\\]/g, (c) => `\\${c}`);
  const pattern = `%${escaped}%`;
  const result = await db
    .prepare(
      `SELECT p.*, u.username AS author
       FROM posts p JOIN users u ON p.author_id = u.id
       WHERE p.title LIKE ? ESCAPE '\\' COLLATE NOCASE
          OR p.body LIKE ? ESCAPE '\\' COLLATE NOCASE
       ORDER BY p.created_at DESC, p.id DESC`
    )
    .bind(pattern, pattern)
    .all<Post>();
  return result.results ?? [];
}

export async function createPost(
  db: D1Database,
  authorId: number,
  title: string,
  body: string
): Promise<number> {
  const result = await db
    .prepare("INSERT INTO posts (author_id, title, body) VALUES (?, ?, ?)")
    .bind(authorId, title, body)
    .run();
  return Number(result.meta.last_row_id);
}

export async function updatePost(
  db: D1Database,
  id: number,
  title: string,
  body: string
): Promise<void> {
  await db
    .prepare(
      "UPDATE posts SET title = ?, body = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
    .bind(title, body, id)
    .run();
}

export async function deletePost(db: D1Database, id: number): Promise<void> {
  await db.prepare("DELETE FROM posts WHERE id = ?").bind(id).run();
}

export async function getCommentsForPost(
  db: D1Database,
  postId: number
): Promise<Comment[]> {
  const result = await db
    .prepare(
      `SELECT c.*, u.username AS author
       FROM comments c JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ?
       ORDER BY c.created_at ASC, c.id ASC`
    )
    .bind(postId)
    .all<Comment>();
  return result.results ?? [];
}

export async function createComment(
  db: D1Database,
  postId: number,
  userId: number,
  body: string
): Promise<Comment> {
  const result = await db
    .prepare("INSERT INTO comments (post_id, user_id, body) VALUES (?, ?, ?)")
    .bind(postId, userId, body)
    .run();
  const id = Number(result.meta.last_row_id);
  const comment = await db
    .prepare(
      `SELECT c.*, u.username AS author
       FROM comments c JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`
    )
    .bind(id)
    .first<Comment>();
  return comment!;
}

export async function getReaction(
  db: D1Database,
  postId: number,
  userId: number
): Promise<string | null> {
  const row = await db
    .prepare("SELECT kind FROM reactions WHERE post_id = ? AND user_id = ?")
    .bind(postId, userId)
    .first<{ kind: string }>();
  return row?.kind ?? null;
}

export async function getReactionCounts(
  db: D1Database,
  postId: number
): Promise<{ like: number; dislike: number }> {
  const likes = await db
    .prepare(
      "SELECT COUNT(*) AS c FROM reactions WHERE post_id = ? AND kind = 'like'"
    )
    .bind(postId)
    .first<{ c: number }>();
  const dislikes = await db
    .prepare(
      "SELECT COUNT(*) AS c FROM reactions WHERE post_id = ? AND kind = 'dislike'"
    )
    .bind(postId)
    .first<{ c: number }>();
  return { like: likes?.c ?? 0, dislike: dislikes?.c ?? 0 };
}

export async function setReaction(
  db: D1Database,
  postId: number,
  userId: number,
  kind: string
): Promise<string | null> {
  const current = await getReaction(db, postId, userId);
  if (current === kind) {
    await db
      .prepare("DELETE FROM reactions WHERE post_id = ? AND user_id = ?")
      .bind(postId, userId)
      .run();
    return null;
  }
  if (current) {
    await db
      .prepare(
        "UPDATE reactions SET kind = ? WHERE post_id = ? AND user_id = ?"
      )
      .bind(kind, postId, userId)
      .run();
  } else {
    await db
      .prepare(
        "INSERT INTO reactions (post_id, user_id, kind) VALUES (?, ?, ?)"
      )
      .bind(postId, userId, kind)
      .run();
  }
  return kind;
}
