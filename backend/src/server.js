import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db.js';
import { setupSongRoutes } from './routes/songs.js';
import { createDownloader } from './services/downloader.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const DOWNLOAD_PATH = process.env.DOWNLOAD_PATH || path.join(__dirname, '../../downloads');

// Middleware
app.use(cors());
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log(`📡 [HTTP] ${req.method} ${req.path} from ${req.get('origin') || 'unknown'}`);
  next();
});

// Initialize DB and start server
(async () => {
  try {
    const db = await initDb();
    console.log('✅ Database initialized');

    // Initialize downloader
    const downloader = createDownloader(db, DOWNLOAD_PATH);
    console.log(`📁 Download path: ${DOWNLOAD_PATH}`);

    // Test route
    app.post('/api/test-metadata', async (req, res) => {
      res.json({ status: 'test route works' });
    });

    // Setup routes
    setupSongRoutes(app, db, downloader);

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🎧 DJ Dashboard Backend running on http://0.0.0.0:${PORT}`);
      console.log(`📥 Downloader active`);

      // Queue all pending songs (non-blocking, async)
      setTimeout(() => {
        db.all('SELECT id, title, artist, url, vibe FROM songs WHERE status = ?', ['pending'], (err, songs) => {
          if (!err && songs && songs.length > 0) {
            console.log(`⏳ Found ${songs.length} pending song(s), queueing for download...`);
            downloader.queueAll(songs);
          }
        });
      }, 500);
    });
  } catch (error) {
    console.error('❌ Initialization error:', error);
    process.exit(1);
  }
})();
