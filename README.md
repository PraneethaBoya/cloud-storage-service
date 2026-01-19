# Cloud-based Media Files Storage Service

A cloud storage service similar to Google Drive (basic version), built with Next.js (App Router) and Node.js + Express.

## 🏗️ Architecture

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, TanStack Query
- **Backend**: Node.js, Express.js, REST APIs
- **Database**: MongoDB
- **Storage**: Local disk uploads (Multer)
- **Auth**: JWT (Bearer token + httpOnly cookies supported)

## 📦 Features

### ✅ Implemented

- **Authentication**
  - Email/password signup and login
  - Secure session handling with JWT
  - `/api/auth/me` endpoint

- **Files & Folders**
  - Folder hierarchy with parent_id
  - File upload with drag & drop + progress
  - Download and delete

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### Environment Variables

#### Backend (`backend/.env`)

```env
# Server
PORT=8080
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# MongoDB
MONGODB_URI=mongodb://127.0.0.1:27017/cloud_storage

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Local uploads
UPLOAD_DIR=uploads
MAX_FILE_SIZE=104857600

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

#### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd cloud-storage-service
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up the database**
   - Ensure MongoDB is running and `MONGODB_URI` points to it.

4. **Start the backend**

```bash
cd backend
npm run dev
```

5. **Start the frontend** (in a new terminal)

```bash
cd frontend
npm run dev
```

7. **Access the application**

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

## 📁 Project Structure

```
cloud-storage-service/
├── backend/                 # Express backend
│   ├── src/
│   │   ├── config/         # Configuration
│   │   ├── db/             # Database connection & schema
│   │   ├── middleware/     # Auth, error handling, rate limiting
│   │   ├── routes/          # API routes
│   │   ├── services/       # Business logic
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utilities
│   └── package.json
├── frontend/                # Next.js frontend
│   ├── src/
│   │   ├── app/            # Next.js app router pages
│   │   ├── components/     # React components
│   │   └── lib/           # API clients & utilities
│   └── package.json
├── packages/               # Shared packages (future)
├── package.json           # Root package.json (monorepo)
└── README.md
```

## 🔐 Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT tokens with httpOnly cookies
- ✅ Refresh token rotation
- ✅ Input validation with Zod
- ✅ Rate limiting (IP + user)
- ✅ CORS configuration
- ✅ Helmet security headers
- ✅ Presigned URLs for file access
- ✅ Server-side ACL enforcement
- ✅ SQL injection prevention (parameterized queries)

## 📡 API Endpoints

### Authentication

- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh access token

### Files & Folders

- `GET /api/files` - List files and folders
- `POST /api/files/upload` - Upload file (multipart/form-data)
- `POST /api/files/folders` - Create folder
- `DELETE /api/files/:fileId` - Delete file
- `DELETE /api/files/folders/:folderId` - Delete folder
- `GET /api/files/:fileId/download` - Download file
- `GET /api/files/:fileId/view` - View file

## 🧪 Testing

Run tests (when implemented):

```bash
npm test
```

## 🚢 Deployment

### Backend (Render/Fly.io)

1. Set environment variables
2. Deploy Express app
3. Run database migrations

### Frontend (Vercel)

1. Connect GitHub repository
2. Set `NEXT_PUBLIC_API_URL` environment variable
3. Deploy

## 🔄 Upload Flow

1. Client calls `POST /api/files/upload` with `multipart/form-data`
2. Backend stores the file on disk (under `UPLOAD_DIR/<userId>/...`) and writes metadata to MongoDB
3. Client refreshes file list via `GET /api/files`

## 🛠️ Development

### Adding a new feature

1. Create database migration (if needed)
2. Add service layer logic (`backend/src/services/`)
3. Add route handler (`backend/src/routes/`)
4. Add frontend API client (`frontend/src/lib/`)
5. Add UI components (`frontend/src/components/`)

### Code Style

- TypeScript strict mode
- ESLint for linting
- Prettier for formatting (recommended)

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or pull request.

## 🐛 Known Issues / TODO

- [ ] Implement thumbnail generation with BullMQ
- [ ] Add list view for files
- [ ] Add context menu for files/folders
- [ ] Implement trash restoration
- [ ] Add file preview
- [ ] Add OAuth (Google) authentication
- [ ] Add unit and integration tests
- [ ] Add E2E tests
- [ ] Implement file versioning UI
- [ ] Add folder breadcrumb navigation improvements
