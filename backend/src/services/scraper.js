import cron from 'node-cron';

export function createScraper(db) {
  const searchQueries = [
    'trending Punjabi songs 2024',
    'viral Indian party songs',
    'new Punjabi dance songs',
    'Bollywood dance remix',
    'romantic Punjabi songs'
  ];

  const vibes = ['New Punjabi', 'Old School Punjabi', 'Bollywood Dance', 'Romantic', 'Mid-2000s Punjabi'];

  async function scrapeDaily() {
    console.log('🔍 Starting YouTube scraper...');
    
    // Mock scraping - in production, use YouTube API or web scraping
    const mockSongs = [
      { title: 'Trending Hit 1', artist: 'Artist A', url: `https://youtube.com/watch?v=mock${Date.now()}1`, vibe: 'New Punjabi' },
      { title: 'Trending Hit 2', artist: 'Artist B', url: `https://youtube.com/watch?v=mock${Date.now()}2`, vibe: 'Bollywood Dance' },
      { title: 'Trending Hit 3', artist: 'Artist C', url: `https://youtube.com/watch?v=mock${Date.now()}3`, vibe: 'Romantic' }
    ];

    for (const song of mockSongs) {
      try {
        // Check if already exists
        await new Promise((resolve, reject) => {
          db.get('SELECT id FROM songs WHERE url = ?', [song.url], (err, row) => {
            if (err) reject(err);
            else if (row) {
              console.log(`⏭️ Skipped (duplicate): ${song.title}`);
              resolve();
            } else {
              // Add new song
              db.run(
                'INSERT INTO songs (title, artist, url, vibe, status) VALUES (?, ?, ?, ?, ?)',
                [song.title, song.artist, song.url, song.vibe, 'pending'],
                (err) => {
                  if (!err) console.log(`➕ Added: ${song.title}`);
                  resolve();
                }
              );
            }
          });
        });
      } catch (error) {
        console.error(`❌ Scraper error for ${song.title}:`, error.message);
      }
    }

    console.log('✅ Scraper finished');
  }

  // Run daily at 8am
  const job = cron.schedule('0 8 * * *', scrapeDaily);

  return {
    start() {
      console.log('📅 YouTube scraper scheduled for 8am daily');
      // Run once on startup for testing
      scrapeDaily();
    },
    stop() {
      job.stop();
    }
  };
}
