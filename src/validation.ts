export function validateUsername(username: string): string | null {
  if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) {
    return "Username must be 3-30 letters, digits, or underscores.";
  }
  return null;
}

export function validateEmail(email: string): string | null {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return "Please enter a valid email address.";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  return null;
}

export function validateTitle(title: string): string | null {
  const trimmed = title.trim();
  if (!trimmed) return "Title cannot be empty.";
  if (trimmed.length > 200) return "Title must be at most 200 characters.";
  return null;
}

export function validateBody(body: string): string | null {
  const trimmed = body.trim();
  if (!trimmed) return "Body cannot be empty.";
  if (trimmed.length > 20000) return "Body must be at most 20000 characters.";
  return null;
}

export function validateComment(body: unknown): string | null {
  if (typeof body !== "string") return "Comment must be text.";
  const trimmed = body.trim();
  if (!trimmed) return "Comment cannot be empty.";
  if (trimmed.length > 2000) return "Comment must be at most 2000 characters.";
  return null;
}

export function validateReactionKind(kind: unknown): string | null {
  if (kind !== "like" && kind !== "dislike") {
    return "Reaction must be 'like' or 'dislike'.";
  }
  return null;
}

export function safeRedirect(next: string | null | undefined): string {
  if (!next) return "/";
  if (!next.startsWith("/")) return "/";
  if (next.startsWith("//")) return "/";
  if (next.includes("\\")) return "/";
  return next;
}

export function truncatePreview(body: string, maxWords = 150): string {
  const words = body.trim().split(/\s+/);
  if (words.length <= maxWords) return body.trim();
  return words.slice(0, maxWords).join(" ") + "...";
}
