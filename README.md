# Freyla-red-Social

# Freyla Social Backend

Node.js + Express REST API for a small social network: users, follows, timeline publications, and image uploads.

## Stack
- Node.js 18
- Express 4
- MongoDB + Mongoose (pagination via `mongoose-paginate-v2` and `mongoose-pagination`)
- Auth: JWT (`jwt-simple`), `bcrypt` for passwords
- Uploads: `multer` for user avatars, `connect-multiparty` for publication images

## Quick start
```bash
cd api
npm install
npm start
```

Environment variables (`api/.env`):
```
PORT=3977
MONGODB_URI=<your MongoDB connection string>
```

## API overview
Base path: `/api`

Auth
- `POST /login` — email + password, returns user or token (`gettoken: true`).
- `POST /register` — create user.

Users
- `GET /user/:id` — requires `Authorization: Bearer <token>`.
- `GET /users/:page?` — paginated.
- `PUT /update-user/:id` — update profile (self only).
- `POST /update-image-user/:id` — upload avatar with field `image` (multer).
- `GET /get-image-user/:imageFile` — serve stored avatar.
- `GET /counters/:id?` — following/followers counts.

Follows (auth required)
- `POST /follow/:id?` — follow user (or `followed` in body).
- `DELETE /follow/:id` — unfollow.
- `GET /following/:id?/:page?`
- `GET /followed/:id?/:page?`
- `GET /my-follows`
- `GET /followers`

Publications (auth required)
- `POST /publication` — create (body: `text`).
- `GET /publications/:page?` — timeline (people you follow).
- `GET /publication/:id`
- `DELETE /publication/:id` — only owner.
- `POST /upload-image-pub/:id` — upload image for a publication you own; form-data field `image`; allowed: png/jpg/jpeg/gif.
- `GET /get-image-pub/:imageFile` — serve publication image.

Uploads
- User images: stored in `api/uploads/users`.
- Publication images: stored in `api/uploads/publications`.

## Development tips
- Always send `Authorization: Bearer <token>` for protected routes.
- Use the expected form-data field names: `image` for both avatars and publication images.
- Validate MongoDB ObjectIds on client side when possible to avoid 400/404 churn.
- Keep dependencies updated and run `npm audit fix` periodically.
- Prefer paginated endpoints for lists to avoid large payloads.

## Scripts
- `npm start` — start server.
- `npm run dev` — start with nodemon.

## Project structure (relevant)
- `api/app.js` — Express app, middleware, routes.
- `api/index.js` — DB connection + server bootstrap.
- `api/controllers` — route handlers (user, follow, publication).
- `api/routes` — route definitions.
- `api/models` — Mongoose schemas.
- `api/uploads` — stored files (ignored by git).

## Testing
No automated tests yet. For new work, favor supertest for HTTP and in-memory MongoDB for isolation.
