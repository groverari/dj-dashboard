import { extractYouTubeMetadata } from '../services/metadata.js';
import { searchSongByDescription } from '../services/qwen-search.js';
import { createDuplicateDetector } from '../services/duplicateDetector.js';

const YOUTUBE_URL_PATTERN = /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|music\.youtube\.com\/watch\?v=)/;

export function setupSongRoutes(app, db, downloader) {
  const duplicateDetector = createDuplicateDetector(db);
  console.log('📝 Setting up song routes...');

  // Search for song by description (uses qwen7b)
  app.post('/api/search-song', async (req, res) => {
    console.log('🎵 [API] Search song endpoint hit');
    const { description } = req.body;
    
    if (!description) {
      console.error('❌ [API] No description provided');
      return res.status(400).json({ error: 'Description is required' });
    }

    try {
      const metadata = await searchSongByDescription(description);
      console.log(`✅ [API] Song search successful: ${JSON.stringify(metadata)}`);
      res.json(metadata);
    } catch (error) {
      console.error(`❌ [API] Song search failed: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // Extract metadata from YouTube URL
  app.post('/api/metadata', async (req, res) => {
    console.log('🎵 [API] Metadata endpoint hit');
    console.log(`📝 [API] Request headers: ${JSON.stringify(req.headers)}`);
    console.log(`📝 [API] Request body: ${JSON.stringify(req.body)}`);
    
    const { url } = req.body;
    
    if (!url) {
      console.error('❌ [API] No URL provided');
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`🔗 [API] Processing URL: ${url}`);

    try {
      const metadata = await extractYouTubeMetadata(url);
      console.log(`✅ [API] Metadata extracted successfully: ${JSON.stringify(metadata)}`);
      res.json(metadata);
    } catch (error) {
      console.error(`❌ [API] Metadata extraction failed: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // GET all songs
  app.get('/api/songs', (req, res) => {
    const { vibe } = req.query;
    const query = vibe ? 'SELECT * FROM songs WHERE vibe = ? ORDER BY dateAdded DESC' : 'SELECT * FROM songs ORDER BY dateAdded DESC';
    const params = vibe ? [vibe] : [];
    
    db.all(query, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows || []);
    });
  });

  // POST new song
  app.post('/api/songs', async (req, res) => {
    const { title, artist, url, vibe } = req.body;

    if (!title || !artist || !url || !vibe) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!YOUTUBE_URL_PATTERN.test(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL. Please provide a valid youtube.com or youtu.be link.' });
    }

    try {
      const { isDuplicate, existingId } = await duplicateDetector.check(title, artist, url);
      if (isDuplicate) {
        return res.status(409).json({ error: `This song already exists (id: ${existingId})` });
      }
    } catch (err) {
      console.error('Duplicate check failed:', err);
      // Continue anyway — better to allow an insert than block on a check failure
    }

    db.run('INSERT INTO songs (title, artist, url, vibe, status) VALUES (?, ?, ?, ?, ?)',
      [title, artist, url, vibe, 'pending'],
      function(err) {
        if (err) return res.status(400).json({ error: 'Duplicate URL or DB error' });
        const songId = this.lastID;
        res.status(201).json({
          id: songId,
          title,
          artist,
          url,
          vibe,
          status: 'pending',
          dateAdded: new Date().toISOString()
        });

        // Immediately queue for download instead of waiting for 30s scanner
        if (downloader) {
          downloader.queue(songId, title, artist, url, vibe);
        }
      }
    );
  });

  // PATCH song
  app.patch('/api/songs/:id', (req, res) => {
    const { title, artist, vibe, status, path } = req.body;
    const { id } = req.params;

    if (!title && !artist && !vibe && !status && !path) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    let query = 'UPDATE songs SET ';
    const updates = [];
    const values = [];
    
    if (title) { updates.push('title = ?'); values.push(title); }
    if (artist) { updates.push('artist = ?'); values.push(artist); }
    if (vibe) { updates.push('vibe = ?'); values.push(vibe); }
    if (status) { updates.push('status = ?'); values.push(status); }
    if (path) { updates.push('path = ?'); values.push(path); }
    
    query += updates.join(', ') + ' WHERE id = ?';
    values.push(id);

    db.run(query, values, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id, updated: this.changes > 0 });
    });
  });

  // DELETE song
  app.delete('/api/songs/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM songs WHERE id = ?', [id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id, deleted: this.changes > 0 });
    });
  });

  // GET all vibes
  app.get('/api/vibes', (req, res) => {
    db.all('SELECT DISTINCT vibe FROM songs ORDER BY vibe ASC', [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const vibes = rows ? rows.map(r => r.vibe) : [];
      res.json(vibes);
    });
  });

  // POST new vibe (just a label, stored when a song is added with that vibe)
  // The frontend sends vibe names which get stored automatically
  app.post('/api/vibes', (req, res) => {
    // Vibes are created implicitly when songs are added
    // This endpoint is here for consistency
    res.status(400).json({ error: 'Vibes are created automatically when adding songs. Just type a new vibe name!' });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'dj-dashboard-backend' });
  });

  console.log('✅ Song routes setup complete');
}
