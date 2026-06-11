export interface Env {
  DB: D1Database;
  SECRET_KEY?: string;
  ASSETS?: Fetcher;
}

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface Post {
  id: number;
  author_id: number;
  title: string;
  body: string;
  created_at: string;
  updated_at: string | null;
  author?: string;
}

export interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  body: string;
  created_at: string;
  author?: string;
}

export interface SessionData {
  userId: number;
  username: string;
  csrfToken: string;
}
