import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

export function createDownloader(db, downloadPath) {
  const queue = [];
  let isDownloading = false;
  const maxConcurrent = 1;
  let activeDownloads = 0;
  let scannerInterval = null;

  async function downloadSong(song) {
    try {
      const vibeDir = path.join(downloadPath, song.vibe);
      if (!fs.existsSync(vibeDir)) {
        fs.mkdirSync(vibeDir, { recursive: true });
      }

      // Update status to downloading and clear error
      await new Promise((resolve, reject) => {
        db.run('UPDATE songs SET status = ?, error = ? WHERE id = ?', ['downloading', null, song.id], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const filename = `%(title)s.%(ext)s`;
      const outputPath = path.join(vibeDir, filename);

      console.log(`⬇️ Downloading: ${song.title} - ${song.artist}`);
      console.log(`   URL: ${song.url}`);

      const ytDlpCmd = `yt-dlp -x --audio-format mp3 --audio-quality 192K -o "${outputPath}" "${song.url}"`;
      
      await execAsync(ytDlpCmd, { maxBuffer: 10 * 1024 * 1024 });

      // Find the actual downloaded file
      const files = fs.readdirSync(vibeDir);
      const mp3Files = files.filter(f => f.endsWith('.mp3'));
      const downloadedFile = mp3Files.length > 0 ? path.join(vibeDir, mp3Files[0]) : null;

      if (downloadedFile && fs.existsSync(downloadedFile)) {
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE songs SET status = ?, path = ?, downloaded = ?, error = ? WHERE id = ?',
            ['done', downloadedFile, 1, null, song.id],
            (err) => {
              if (err) reject(err);
              else resolve();
            }
          );
        });
        console.log(`✅ Downloaded: ${song.title}`);
      } else {
        throw new Error('Downloaded file not found');
      }
    } catch (error) {
      const errorMsg = error.message || error.toString();
      console.error(`❌ Download error (${song.title}): ${errorMsg}`);
      
      // Store error message in database
      await new Promise((resolve) => {
        db.run('UPDATE songs SET status = ?, error = ? WHERE id = ?', ['error', errorMsg, song.id], (err) => {
          resolve();
        });
      });
    }
  }

  async function processQueue() {
    if (queue.length === 0 || activeDownloads >= maxConcurrent) return;

    activeDownloads++;
    const song = queue.shift();

    try {
      await downloadSong(song);
    } finally {
      activeDownloads--;
      if (queue.length > 0) {
        processQueue();
      }
    }
  }

  // Periodic scanner - checks for pending songs every 30 seconds
  function startScanner() {
    if (scannerInterval) return; // Already running
    
    console.log('🔄 Starting periodic scanner for pending songs...');
    scannerInterval = setInterval(() => {
      db.all('SELECT id, title, artist, url, vibe FROM songs WHERE status = ?', ['pending'], (err, songs) => {
        if (!err && songs && songs.length > 0) {
          songs.forEach(song => {
            // Check if already queued
            const alreadyQueued = queue.some(q => q.id === song.id);
            if (!alreadyQueued) {
              console.log(`📋 Auto-queued: ${song.title}`);
              queue.push({ id: song.id, title: song.title, artist: song.artist, url: song.url, vibe: song.vibe });
            }
          });
          processQueue();
        }
      });
    }, 30000); // Check every 30 seconds
  }

  startScanner();

  return {
    queue(songId, title, artist, url, vibe) {
      queue.push({ id: songId, title, artist, url, vibe });
      console.log(`📋 Queued: ${title} by ${artist}`);
      processQueue();
    },

    queueAll(songs) {
      songs.forEach(song => {
        this.queue(song.id, song.title, song.artist, song.url, song.vibe);
      });
    },

    getQueue() {
      return queue;
    },

    getStatus() {
      return {
        queued: queue.length,
        downloading: activeDownloads
      };
    },

    stopScanner() {
      if (scannerInterval) {
        clearInterval(scannerInterval);
        scannerInterval = null;
        console.log('🛑 Periodic scanner stopped');
      }
    }
  };
}
