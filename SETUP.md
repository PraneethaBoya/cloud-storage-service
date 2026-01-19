# Setup Guide

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   
   Create `backend/.env`:
   ```env
   PORT=8080
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:3000

   MONGODB_URI=mongodb://127.0.0.1:27017/cloud_storage

   JWT_SECRET=your-secret-key
   JWT_REFRESH_SECRET=your-refresh-secret-key

   UPLOAD_DIR=uploads
   MAX_FILE_SIZE=104857600
   ```

   Create `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8080
   ```

3. **Start backend** (terminal 1)
   ```bash
   cd backend
   npm run dev
   ```

4. **Start frontend** (terminal 2)
   ```bash
   cd frontend
   npm run dev
   ```

5. **Access the app**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8080

## Database Setup

This project uses **MongoDB**.

- Ensure MongoDB is running.
- Set `MONGODB_URI` in `backend/.env`.

## Storage Setup

This project uses **local disk storage** via Multer.

- Uploads are stored under `UPLOAD_DIR` (default: `uploads/`).
- Each user gets their own subfolder.

## Features Implemented

✅ Authentication (signup, login, JWT)
✅ File upload with progress
✅ Folder creation and navigation
✅ File download and delete

## Next Steps

- Add OAuth (Google) authentication
- Add file preview
- Add list view
- Add tests
