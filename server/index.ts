import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { PORT } from './config.js';
import { initDb } from './db/index.js';
import { AutomationEngine } from './services/automationEngine.js';
import { StorySaverService } from './services/storySaverService.js';

import authRouter from './routes/auth.js';
import storiesRouter from './routes/stories.js';
import followersRouter from './routes/followers.js';
import automationsRouter from './routes/automations.js';
import statsRouter from './routes/stats.js';
import adminRouter from './routes/admin.js';

const CLIENT_DIST_DIR = path.resolve(process.cwd(), 'dist/client');

const app = express();

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));

// Rate limiting on API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Healthcheck
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', mode: 'production', timestamp: new Date().toISOString() });
});

// Media Stream Endpoint with HTTP 206 Range Request support direct from DB (zero local disk processing)
app.get('/api/media/:filename', async (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    const media = await StorySaverService.getMedia(filename);

    if (!media) {
      return res.status(404).json({ error: 'Media file not found or expired.' });
    }

    const { buffer, mediaType, fileSize } = media;
    const range = req.headers.range;
    const ext = path.extname(filename).toLowerCase();
    const contentType = mediaType === 'video' || ext === '.mp4'
      ? 'video/mp4'
      : ext === '.png'
        ? 'image/png'
        : 'image/jpeg';

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;
      const chunk = buffer.subarray(start, end + 1);

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
      });
      res.end(chunk);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400'
      });
      res.end(buffer);
    }
  } catch (err: any) {
    console.error('Error streaming media from database:', err);
    res.status(500).json({ error: 'Internal server error while streaming media.' });
  }
});

// Mount API Routers
app.use('/api', apiLimiter);
app.use('/api/auth', authRouter);
app.use('/api/stories', storiesRouter);
app.use('/api/followers', followersRouter);
app.use('/api/automations', automationsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/admin', adminRouter);

// Monolithic Server: Serve Frontend Build
if (fs.existsSync(CLIENT_DIST_DIR)) {
  console.log(`[Monolith] Serving static frontend from: ${CLIENT_DIST_DIR}`);
  app.use(express.static(CLIENT_DIST_DIR));

  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(CLIENT_DIST_DIR, 'index.html'));
    } else {
      res.status(404).json({ error: 'Endpoint not found' });
    }
  });
} else {
  console.log('[Monolith] Client dist not built yet. Serving API endpoints.');
  app.get('/', (req, res) => {
    res.send(`
      <div style="font-family: sans-serif; background: #080B11; color: #fff; padding: 40px; text-align: center; min-height: 100vh;">
        <h1 style="color: #00F2FE;">InstaVault Pro Monolithic Production Server</h1>
        <p>API is active on port ${PORT}. Build client with <code>npm run build</code>.</p>
      </div>
    `);
  });
}

// Start Server and background workers
async function startServer() {
  try {
    await initDb();
    AutomationEngine.init();

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 InstaVault Pro Monolithic Production Server Active`);
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log(`🛡️  Admin Portal: Enabled (/admin)`);
      console.log(`💾 Storage: Dynamic (Configured via env & admin)`);
      console.log(`====================================================`);
    });
  } catch (err: any) {
    console.error('Fatal Server Startup Error:', err);
    process.exit(1);
  }
}

startServer();
