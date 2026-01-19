# Supabase + Vite + Express Cloud Storage (New App)

This repository contains **two implementations**:

- `frontend/` + `backend/` (existing app)
- `frontend-vite/` + `backend-supabase/` (**Supabase-based app** described in this document)

This guide is for the Supabase-based app.

## 1) Supabase setup

### A) Create a Supabase project

- Create a new project in Supabase.
- Note your:
  - **Project URL**
  - **Anon key**
  - **Service Role key** (server-side only)

### B) Create a private Storage bucket

In Supabase Dashboard:

- Storage -> Buckets -> New bucket
- Name: `files`
- Privacy: **Private**

### C) SQL schema + RLS

Run the SQL in:

- `supabase/schema.sql`

You can run it via:

- Supabase SQL Editor

This creates:

- `public.files` table
- RLS policies for `public.files`
- Storage policies for bucket `files`

## 2) Environment variables

### Backend (`backend-supabase/.env`)

Copy:

- `backend-supabase/.env.example` -> `backend-supabase/.env`

Fill in:

```env
PORT=8081
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET=files
```

### Frontend (`frontend-vite/.env`)

Copy:

- `frontend-vite/.env.example` -> `frontend-vite/.env`

Fill in:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
VITE_API_URL=http://localhost:8081
```

## 3) Install dependencies

From the repo root:

```bash
npm install
```

## 4) Run locally

### Terminal 1: backend

From repo root:

```bash
npm run dev:supabase
```

Backend should start on:

- `http://localhost:8081`

### Terminal 2: frontend

From repo root:

```bash
npm run dev:vite
```

Frontend should start on:

- `http://localhost:5173`

## 5) API overview

All API routes are protected using the Supabase JWT access token.

- The frontend logs in with Supabase Auth.
- The frontend sends `Authorization: Bearer <access_token>`.
- The backend verifies the token using `supabaseAdmin.auth.getUser(token)`.

### List files

- `GET /api/files`

### Upload file

- `POST /api/files/upload`
- `multipart/form-data` field: `file`

### Download file

- `GET /api/files/:id/download`
- Returns `{ url }` (signed URL)

### Delete file

- `DELETE /api/files/:id`

## Notes

- The backend uses the **Service Role key** to write metadata rows and manage storage objects.
- RLS policies ensure end users can only access their own rows/objects.
