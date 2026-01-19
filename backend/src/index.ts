import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { config } from './config/index.js';
import authRoutes from './routes/auth.routes.js';
import filesRoutes from './routes/files.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { connectMongo } from './db/mongo.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow for development
}));

// CORS - allow configured origin and credentials
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
});
app.use(limiter);

// ---------- Root Route ----------
app.get('/', (_req, res) => {
  res.json({
    message: 'Cloud Storage API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: {
        signup: 'POST /api/auth/signup',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me',
      },
      files: {
        list: 'GET /api/files',
        init: 'POST /api/files/init',
      },
    },
  });
});

// ---------- Health Check ----------
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Mount feature routers
app.use('/api/auth', authRoutes);
app.use('/api/files', filesRoutes);

// ---------- Error Handler ----------
app.use(errorHandler);

// ---------- Start ----------
await connectMongo();

app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
});
