import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

const DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function execWithTimeout(cmd, options, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = exec(cmd, options, (err, stdout, stderr) => {
      resolve({ err, stdout, stderr });
    });
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`yt-dlp timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);
    child.on('close', () => clearTimeout(timer));
  });
}

export function createDownloader(db, downloadPath) {
  const queue = [];
  let isDownloading = false;
  const maxConcurrent = 1;
  let activeDownloads = 0;
  let scannerInterval = null;

  // Reset any songs stuck as 'downloading' from a previous crash
  db.run('UPDATE songs SET status = ?, error = ? WHERE status = ?',
    ['pending', 'Reset: was stuck as downloading (process restarted)', 'downloading'],
    (err, result) => {
      if (!err) {
        db.get('SELECT changes() as count', (err2, row) => {
          if (!err2 && row && row.count > 0) {
            console.log(`🔄 Reset ${row.count} stuck downloading song(s) back to pending`);
          }
        });
      }
    }
  );

  async function downloadSong(song) {
    const startTime = Date.now();
    console.log(`⬇️ [Download Start] "${song.title}" by ${song.artist}`);
    console.log(`   ID: ${song.id} | URL: ${song.url} | Vibe: ${song.vibe}`);

    try {
      const vibeDir = path.join(downloadPath, song.vibe);
      if (!fs.existsSync(vibeDir)) {
        fs.mkdirSync(vibeDir, { recursive: true });
        console.log(`   📁 Created directory: ${vibeDir}`);
      }

      // Update status to downloading and clear error
      await new Promise((resolve, reject) => {
        db.run('UPDATE songs SET status = ?, error = ? WHERE id = ?', ['downloading', null, song.id], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log(`   📝 Status set to 'downloading'`);

      const filename = `%(title)s.%(ext)s`;
      const outputPath = path.join(vibeDir, filename);

      const ytDlpCmd = `yt-dlp -x --audio-format mp3 --audio-quality 192K -o "${outputPath}" "${song.url}"`;
      console.log(`   🔧 Running: ${ytDlpCmd}`);

      const { err: cmdErr, stdout, stderr } = await execWithTimeout(
        ytDlpCmd,
        { maxBuffer: 10 * 1024 * 1024 },
        DOWNLOAD_TIMEOUT_MS
      );

      if (cmdErr) {
        console.error(`   ❌ yt-dlp exited with error:`);
        if (stderr) console.error(`   STDERR: ${stderr.slice(0, 500)}`);
        if (stdout) console.log(`   STDOUT: ${stdout.slice(0, 500)}`);
        throw new Error(`yt-dlp failed: ${stderr || cmdErr.message}`);
      }

      if (stdout) console.log(`   📤 yt-dlp output: ${stdout.slice(0, 200)}`);

      // Find the actual downloaded file
      const files = fs.readdirSync(vibeDir);
      const mp3Files = files.filter(f => f.endsWith('.mp3'));
      const downloadedFile = mp3Files.length > 0 ? path.join(vibeDir, mp3Files[mp3Files.length - 1]) : null;

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
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`   ✅ Done in ${elapsed}s → ${downloadedFile}`);
      } else {
        console.error(`   ❌ No .mp3 file found in ${vibeDir}. Files present: ${files.join(', ') || '(none)'}`);
        throw new Error(`Downloaded file not found in ${vibeDir}`);
      }
    } catch (error) {
      const errorMsg = error.message || error.toString();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.error(`   ❌ [Download Failed] "${song.title}" after ${elapsed}s: ${errorMsg}`);

      // Store error message in database
      await new Promise((resolve) => {
        db.run('UPDATE songs SET status = ?, error = ? WHERE id = ?', ['error', errorMsg, song.id], (err) => {
          if (err) console.error(`   ❌ Failed to update error status in DB: ${err.message}`);
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
