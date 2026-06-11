# Simple Blog

A personal blog built with Cloudflare Workers, Hono, and D1. Users can sign up, write posts, comment, react, and search — deployed free on Cloudflare.

## Features

- Username-based auth with hashed passwords (PBKDF2)
- Posts CRUD (author-only edit/delete)
- Comments and like/dislike reactions (JSON API)
- Case-insensitive search with LIKE wildcard escaping
- Light/dark theme toggle (localStorage + system preference)
- CSRF protection on all state-changing requests
- Security headers (CSP, X-Frame-Options, nosniff)

## Local development

```bash
npm install
npx wrangler d1 execute simple-blog-khalid-db --local --file=schema.sql -y
npm run dev
```

## Tests

```bash
npm test
```

## Deploy to Cloudflare

```bash
npx wrangler login
npx wrangler d1 create simple-blog-khalid-db   # paste database_id into wrangler.jsonc
npx wrangler d1 execute simple-blog-khalid-db --remote --file=schema.sql -y
npm run deploy
openssl rand -hex 32 | npx wrangler secret put SECRET_KEY
```

Live URL: `https://simple-blog-khalid.<your-subdomain>.workers.dev`

## Future work

- Rate limiting
- Email verification
