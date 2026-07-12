# DocDock Setup Guide

This guide explains how to set up the **DocDock API** either with or without Docker.

---

# Prerequisites

Before starting, ensure you have the following installed.

## For Local Development

- Node.js (v20 or later recommended)
- npm
- PostgreSQL (or a Supabase PostgreSQL database)
- Git

## For Docker Development

- Docker
- Docker Compose
- Git

---

# Option 1: Local Development (Without Docker)

## 1. Clone the Repository

```bash
git clone https://github.com/AmanSingh0429/DocDock-backend.git backend
cd docdock
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Create Environment File

Copy the sample environment file.

```bash
cp .env.sample .env
```

---

## 4. Configure Environment Variables

Update the `.env` file with your configuration.

```env
DATABASE_URL=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

JWT_SECRET=

CLIENT_URL=
```

### DATABASE_URL

You can use either:

- A local PostgreSQL database
- A Supabase PostgreSQL database

Example (Local PostgreSQL):

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/docdock?schema=public"
```

Example (Supabase):

```env
DATABASE_URL="postgresql://<username>:<password>@<host>:5432/postgres?schema=public"
```

---

## 5. Apply Database Migrations

```bash
npx prisma migrate deploy
```

---

## 6. Seed the Database (Optional)

```bash
npm run seed
```

---

## 7. Start the Development Server

```bash
npm run dev
```

The API will be available at:

```
http://localhost:5000
```

Swagger documentation:

```
http://localhost:5000/api-docs
```

---

# Option 2: Docker Development

Docker Compose starts both the API and PostgreSQL automatically.

---

## 1. Clone the Repository

```bash
git clone https://github.com/AmanSingh0429/DocDock-backend.git backend
cd docdock
```

---

## 2. Create Environment File

```bash
cp .env.sample .env
```

---

## 3. Configure Environment Variables

Since PostgreSQL is managed by Docker Compose, use the following database connection:

```env
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/docdock?schema=public"

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

JWT_SECRET=

CLIENT_URL=
```

> **Note**
>
> The hostname must be `postgres` because it is the Docker Compose service name.

---

## 4. Start the Containers

```bash
docker compose up -d
```

This starts:

- DocDock API
- PostgreSQL

---

## 5. Apply Database Migrations

```bash
docker compose exec api npx prisma migrate deploy
```

---

## 6. Seed the Database (Optional)

```bash
docker compose exec api npm run seed
```

---

## 7. Access the Application

API:

```
http://localhost:5000
```

Swagger Documentation:

```
http://localhost:5000/api-docs
```

---

# Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `JWT_SECRET` | Secret used to sign JWT tokens |
| `CLIENT_URL` | Frontend application URL |

---

# Troubleshooting

### Prisma migration fails

Ensure:

- PostgreSQL is running.
- `DATABASE_URL` is correct.
- The database exists.

Then run:

```bash
npx prisma migrate deploy
```

---

### Docker cannot connect to PostgreSQL

Verify that the PostgreSQL container is running.

```bash
docker compose ps
```

If necessary, restart the services.

```bash
docker compose down
docker compose up -d
```

---

### Cloudinary upload errors

Verify the following environment variables:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

---

# You're Ready

After completing the setup, the DocDock API should be running locally and ready for development.
