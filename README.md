# INSY7314 ICE Task 4 — Photostore Backend

This repository contains the backend REST API for a photo-storing application. It supports account registration and login, JWT bearer authentication, profile management, role-based administration, Cloudinary image storage, and owner/admin photo management.

## Tech stack

- Node.js and Express
- MongoDB Atlas and Mongoose
- JSON Web Tokens and bcryptjs
- Cloudinary
- Multer (in-memory image uploads, maximum 5 MB)

## Prerequisites

- Node.js 18 or newer and npm
- A MongoDB Atlas database
- A Cloudinary account
- Postman for running the included API collection

## Installation and startup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to a local `.env` file and provide values for these variable names:

   ```dotenv
   PORT=5000
   MONGO_URI=
   JWT_SECRET=
   CLOUDINARY_CLOUD_NAME=
   CLOUDINARY_API_KEY=
   CLOUDINARY_API_SECRET=
   ```

3. Start the API:

   ```bash
   npm start
   ```

   For automatic restarts during development, use `npm run dev`.

The server validates its required environment variables and connects to MongoDB before it begins accepting requests. Never commit `.env` or share any values from it.

The default base URL is `http://localhost:5000`. If `PORT` is changed, update the port in the URL and in Postman's `baseUrl` collection variable.

## Automated tests

Run the local schema, route, authentication, authorization, and error-handling checks with:

```bash
npm test
```

## Authentication

Signup and login return a JWT. Send it to protected routes using:

```http
Authorization: Bearer <token>
```

New accounts always have the `user` role. Passwords are hashed before storage and are excluded from API responses.

## Routes

| Method | Route | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/signup` | Public | Register and receive a JWT |
| POST | `/api/auth/login` | Public | Log in and receive a JWT |
| GET | `/api/users/me` | Authenticated | View own profile |
| PUT | `/api/users/me` | Authenticated | Update own username/email |
| GET | `/api/users` | Admin | List users |
| DELETE | `/api/users/:userId` | Admin | Delete a user |
| PUT | `/api/users/:userId/promote` | Admin | Promote a user |
| PUT | `/api/users/:userId/demote` | Admin | Demote an admin |
| GET | `/api/photos` | Authenticated | View the gallery |
| GET | `/api/photos/all` | Admin | View all photos |
| POST | `/api/photos` | Authenticated | Upload a photo |
| PUT | `/api/photos/:photoId` | Owner or admin | Update metadata/image |
| DELETE | `/api/photos/:photoId` | Owner or admin | Delete a photo |

Photo create/update requests use `multipart/form-data`. The file field is named `image`; create also requires `title`, while `description` is optional. Supported uploads must report an image MIME type and be no larger than 5 MB.

## Creating the first test administrator

There is deliberately no public admin-signup endpoint.

1. Register a normal test user.
2. In MongoDB Atlas Data Explorer, change that user's `role` from `user` to `admin`.
3. Log in again so the response reflects the administrator role. Authentication also reloads the current database user on every protected request, preventing stale token roles from granting access.

## Postman

Import [`postman/INSY7314-ICE-Task-4.postman_collection.json`](postman/INSY7314-ICE-Task-4.postman_collection.json) into Postman.

1. Confirm `baseUrl` matches the running server.
2. Set `userPassword` locally in Postman; the exported collection intentionally leaves it blank.
3. Run Signup, then Login. Their scripts store the returned user token and ID locally.
4. Configure the first administrator through Atlas as described above, log in as that account, and place its token in `adminToken` locally.
5. Set `targetUserId` for role/delete tests.
6. For multipart requests, use Postman's file picker to select a local image in the `image` row.

The collection includes all 13 required endpoints plus missing-token and forbidden-admin checks. It contains no live passwords, tokens, database connection strings, or service credentials.

## Notes

- Uploaded files remain in memory only long enough to stream them to the Cloudinary `securephoto` folder.
- A replacement image is uploaded and saved before removal of the old Cloudinary asset.
- `.env` and `node_modules/` are ignored and must never be committed.
