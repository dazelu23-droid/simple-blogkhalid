const PBKDF2_ITERATIONS = 100_000;

function getSecret(env: { SECRET_KEY?: string }): string {
  return env.SECRET_KEY || "dev";
}

export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256
  );
  const hash = new Uint8Array(bits);
  const saltHex = Array.from(salt, (b) => b.toString(16).padStart(2, "0")).join(
    ""
  );
  const hashHex = Array.from(hash, (b) => b.toString(16).padStart(2, "0")).join(
    ""
  );
  return `pbkdf2:${PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  const [, iterStr, saltHex, hashHex] = stored.split(":");
  const iterations = parseInt(iterStr, 10);
  const salt = new Uint8Array(
    saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16))
  );
  const expected = new Uint8Array(
    hashHex.match(/.{2}/g)!.map((h) => parseInt(h, 16))
  );
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    256
  );
  const actual = new Uint8Array(bits);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data)
  );
  return Array.from(new Uint8Array(sig), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signSession(
  payload: object,
  env: { SECRET_KEY?: string }
): Promise<string> {
  const data = btoa(JSON.stringify(payload));
  const sig = await hmacSign(data, getSecret(env));
  return `${data}.${sig}`;
}

export async function verifySession<T>(
  cookie: string,
  env: { SECRET_KEY?: string }
): Promise<T | null> {
  const dot = cookie.lastIndexOf(".");
  if (dot < 0) return null;
  const data = cookie.slice(0, dot);
  const sig = cookie.slice(dot + 1);
  const expected = await hmacSign(data, getSecret(env));
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    return JSON.parse(atob(data)) as T;
  } catch {
    return null;
  }
}

export function timingSafeCompare(a: string, b: string): boolean {
  return timingSafeEqual(a, b);
}
