# Task Manager API — Backend Developer Intern Assignment

A scalable REST API built with **Node.js, Express, and MongoDB**, featuring JWT
authentication, role-based access control (`user` / `admin`), full CRUD for a `Task`
entity, request validation, centralized error handling, Swagger API documentation, and a
basic frontend UI to exercise every endpoint.

---

## ✨ Features

- **Authentication** — register & login with bcrypt-hashed passwords and JWT tokens.
- **Role-based access control** — `user` vs `admin` roles enforced via middleware.
  - A `user` can only read/update/delete their own tasks.
  - An `admin` can view and manage tasks belonging to any user.
- **CRUD API** for `Task` (title, description, status, priority, due date).
- **API versioning** — all routes live under `/api/v1`.
- **Validation** — request bodies/params/queries validated with `express-validator`;
  failures return structured `400` responses.
- **Centralized error handling** — consistent JSON error shape, including Mongoose
  validation/cast/duplicate-key errors.
- **Pagination & filtering** — `GET /api/v1/tasks?page=&limit=&status=&priority=`.
- **API documentation** — interactive Swagger UI at `/api-docs`, plus a Postman collection.
- **Security hardening** — `helmet`, `cors`, `express-mongo-sanitize` (NoSQL injection
  protection), `express-rate-limit`, request body size limits.
- **Basic frontend** — plain HTML/CSS/JS console that exercises register, login, the
  protected dashboard, and full task CRUD.
- **Dockerized** — `Dockerfile` + `docker-compose.yml` for API + MongoDB.

---

## 🗂 Project Structure

```
backend-intern-assignment/
├── src/
│   ├── config/
│   │   └── db.js               # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js   # register, login, getMe
│   │   └── taskController.js   # CRUD for tasks
│   ├── middleware/
│   │   ├── auth.js              # JWT verification + RBAC (protect, authorize)
│   │   └── errorHandler.js       # centralized error + 404 handler
│   ├── models/
│   │   ├── User.js
│   │   └── Task.js
│   ├── routes/
│   │   ├── index.js              # mounts /v1 + /health (API versioning root)
│   │   └── v1/
│   │       ├── authRoutes.js
│   │       ├── taskRoutes.js
│   │       └── index.js
│   ├── validators/
│   │   └── validators.js         # express-validator schemas
│   ├── utils/
│   │   ├── ApiError.js
│   │   ├── ApiResponse.js
│   │   └── generateToken.js
│   ├── docs/
│   │   └── swagger.js            # OpenAPI/Swagger config
│   ├── app.js                    # Express app (middleware + routes)
│   └── server.js                 # entry point (DB connect + listen)
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── postman_collection.json
├── docker-compose.yml
├── Dockerfile
├── SCALABILITY.md
├── .env.example
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- A MongoDB instance (local install, Docker, or MongoDB Atlas)

### 1. Clone & install

```bash
git clone <your-repo-url>
cd backend-intern-assignment
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/task_manager_db
JWT_SECRET=replace_this_with_a_long_random_secret_key
JWT_EXPIRES_IN=1d
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
CORS_ORIGIN=http://localhost:5500
```

### 3. Run the API

```bash
# development (auto-restart with nodemon)
npm run dev

# production
npm start
```

The API will be available at `http://localhost:5000`, and Swagger docs at
`http://localhost:5000/api-docs`.

### 4. Run with Docker (optional)

```bash
docker compose up --build
```

This starts both the API and a MongoDB container.

### 5. Run the frontend

The frontend is plain static files — no build step required. Open
`frontend/index.html` in a browser (or serve it with any static server, e.g.
`npx serve frontend`). It defaults to calling the API at
`http://localhost:5000/api/v1` — this is editable in the sidebar of the UI.

---

## 🔑 API Overview

Base URL: `http://localhost:5000/api/v1`

| Method | Endpoint           | Access          | Description                          |
|--------|--------------------|-----------------|---------------------------------------|
| POST   | `/auth/register`   | Public          | Register a new user (`user`/`admin`)  |
| POST   | `/auth/login`      | Public          | Log in, returns JWT                   |
| GET    | `/auth/me`         | Private         | Get current authenticated user        |
| POST   | `/tasks`           | Private         | Create a task (owned by caller)       |
| GET    | `/tasks`           | Private         | List tasks (own for `user`, all for `admin`); supports `page`, `limit`, `status`, `priority` |
| GET    | `/tasks/:id`       | Owner or admin  | Get a single task                     |
| PUT    | `/tasks/:id`       | Owner or admin  | Update a task                         |
| DELETE | `/tasks/:id`       | Owner or admin  | Delete a task                         |
| GET    | `/api/health`      | Public          | Health check                          |

Full interactive documentation (request/response schemas, try-it-out): **`/api-docs`**.
A ready-to-import Postman collection is at `postman_collection.json`.

### Example: Register

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane Doe","email":"jane@example.com","password":"secret123","role":"user"}'
```

### Example: Authenticated request

```bash
curl http://localhost:5000/api/v1/tasks \
  -H "Authorization: Bearer <your-jwt-token>"
```

---

## 🔒 Security Notes

- Passwords are hashed with `bcryptjs` (never stored or returned in plaintext).
- JWTs are signed with `JWT_SECRET` and expire after `JWT_EXPIRES_IN`.
- `express-mongo-sanitize` strips `$`/`.` operators from input to prevent NoSQL injection.
- `helmet` sets secure HTTP headers; `cors` restricts allowed origins via `CORS_ORIGIN`.
- `express-rate-limit` throttles repeated requests per IP.
- All request bodies/params/queries are validated before reaching controllers.
- In a real production deployment, admin account creation would be gated behind an
  existing admin (rather than open via `/auth/register`, as it is here for ease of
  testing/demo purposes).

---

## 📈 Scalability

See [`SCALABILITY.md`](./SCALABILITY.md) for a discussion of horizontal scaling, database
indexing/sharding, caching with Redis, and an optional path toward microservices.

---

## 🧪 Manual Testing Checklist

1. Register a `user` account and a separate `admin` account via the frontend or Postman.
2. Log in as the `user`, create a few tasks, and confirm `GET /tasks` only returns that
   user's tasks.
3. Log in as the `admin` and confirm `GET /tasks` returns tasks from **all** users.
4. As the `user`, attempt to `GET /tasks/:id` for a task owned by another user — expect
   `403 Forbidden`.
5. Submit an invalid payload (e.g. missing `title`) to `POST /tasks` — expect `400` with
   field-level validation errors.
6. Hit a non-existent route — expect a `404` JSON error in the same response shape.
