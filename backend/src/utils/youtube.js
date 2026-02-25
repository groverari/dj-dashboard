/**
 * Clean YouTube video titles to extract the song name
 */

/**
 * Search Brave to verify song metadata
 * @param {string} title - Rough title from YouTube
 * @param {string} artist - Rough artist from YouTube (optional)
 * @returns {Object|null} - Verified metadata or null if not found
 */
export async function searchSongMetadata(title, artist = '') {
  try {
    const query = `${title} song ${artist}`.trim();
    console.log(`[WebSearch] Searching for: "${query}"`);
    
    const apiKey = process.env.BRAVE_API_KEY;
    if (!apiKey) {
      console.log('[WebSearch] No BRAVE_API_KEY set, skipping web verification');
      return null;
    }
    
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey
      }
    });
    
    if (!response.ok) {
      console.log(`[WebSearch] API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    const results = data.web?.results || [];
    
    if (results.length === 0) {
      console.log('[WebSearch] No results found');
      return null;
    }
    
    // Parse results for song info
    const verified = parseSearchResults(results, title);
    if (verified) {
      console.log(`[WebSearch] Verified: ${JSON.stringify(verified)}`);
    }
    return verified;
  } catch (err) {
    console.error(`[WebSearch] Error: ${err.message}`);
    return null;
  }
}

/**
 * Parse search results to extract verified song metadata
 */
function parseSearchResults(results, originalTitle) {
  // Look for authoritative sources
  const authoritativeDomains = ['wikipedia.org', 'genius.com', 'imdb.com', 'spotify.com', 'apple.com/music'];
  
  for (const result of results) {
    const url = result.url?.toLowerCase() || '';
    const title = result.title || '';
    const description = result.description || '';
    const combined = `${title} ${description}`;
    
    // Check if from authoritative source
    const isAuthoritative = authoritativeDomains.some(d => url.includes(d));
    
    // Pattern: "Song Name" by Artist
    const byPattern = /[""]?([^""]+)[""]?\s+(?:by|from|[-–—])\s+(.+)/i;
    const match = combined.match(byPattern);
    
    if (match) {
      let songName = match[1].trim();
      // Clean up common suffixes
      songName = songName.replace(/\s*[-–—]\s*(song and lyrics|lyrics|song|official|title track).*$/i, '').trim();
      let artistOrMovie = match[2].split(/[,\-–—|]/)[0].trim();
      // Clean up artist noise
      artistOrMovie = artistOrMovie.replace(/\s*(on Spotify|Song|song).*$/i, '').trim();
      artistOrMovie = artistOrMovie.replace(/^(Title Track|Official|Audio)\s*/i, '').trim();
      
      // Sanity check: song name should be somewhat similar to original
      if (songName.length > 1 && songName.length < 100) {
        return {
          title: songName,
          artist: artistOrMovie || null,
          source: isAuthoritative ? url.split('/')[2] : 'web',
          verified: isAuthoritative
        };
      }
    }
    
    // For Wikipedia/Genius/Spotify, extract from title pattern: "Song Name - Wikipedia"
    if (isAuthoritative && title.includes(' - ')) {
      let songName = title.split(' - ')[0].trim();
      // Clean up common suffixes in song names
      songName = songName.replace(/\s*[-–—]\s*(song and lyrics|lyrics|song|official|title track).*$/i, '').trim();
      if (songName.length > 1 && songName.length < 100) {
        // Try to find artist in description
        const artistMatch = description.match(/(?:by|from|song by|performed by|·)\s+([^,.\-–—·]+)/i);
        let artist = artistMatch ? artistMatch[1].trim() : null;
        // Clean artist noise
        if (artist) {
          artist = artist.replace(/\s*(on Spotify|Song|song).*$/i, '').trim();
        }
        return {
          title: songName,
          artist: artist,
          source: url.split('/')[2],
          verified: true
        };
      }
    }
  }
  
  return null;
}

/**
 * Remove common suffixes/noise from YouTube titles BEFORE splitting
 */
function removeSuffixes(title) {
  // Remove common suffixes (case-insensitive)
  const suffixPatterns = [
    /\s*[\(\[]\s*(?:official\s*)?(?:music\s*)?video\s*[\)\]]/gi,
    /\s*[\(\[]\s*official\s*(?:audio|lyric[s]?|visualizer|hd|4k)?\s*[\)\]]/gi,
    /\s*[\(\[]\s*full\s*(?:song|video|audio|hd|4k)?\s*[\)\]]/gi,
    /\s*[\(\[]\s*lyric[s]?\s*(?:video)?\s*[\)\]]/gi,
    /\s*[\(\[]\s*audio\s*[\)\]]/gi,
    /\s*[\(\[]\s*hd\s*[\)\]]/gi,
    /\s*[\(\[]\s*4k\s*[\)\]]/gi,
    /\s*[\(\[]\s*1080p\s*[\)\]]/gi,
    /\s*[\(\[]\s*720p\s*[\)\]]/gi,
    /\s*[\(\[]\s*(?:19|20)\d{2}\s*[\)\]]/gi,  // Years like (2024)
    /\s*[\(\[]\s*(?:hq|high\s*quality)\s*[\)\]]/gi,
    /\s*[\(\[]\s*(?:new|latest)\s*(?:\d{4})?\s*[\)\]]/gi,
    /\s*[\(\[]\s*(?:remastered|remaster)\s*[\)\]]/gi,
    /\s*[\(\[]\s*(?:extended|remix|cover)\s*[\)\]]/gi,
    /\s*#\w+/gi,  // Remove hashtags
    /\s*[\|｜]\s*#.*$/gi,  // Remove everything after | # (YouTube shorts titles)
  ];
  
  let cleaned = title;
  for (const pattern of suffixPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  return cleaned.trim();
}

/**
 * Extract the song name from a cleaned title
 * Handles formats like "Movie - Song - Artist" or "Artist - Song"
 */
function extractSongName(title) {
  // Split by common delimiters
  const delimiters = /\s*[-–—|｜:：]\s*/;
  const parts = title.split(delimiters).map(p => p.trim()).filter(p => p.length > 0);
  
  if (parts.length === 1) {
    return parts[0];
  }
  
  if (parts.length === 2) {
    // "Artist - Song" or "Song - Artist"
    // Usually the song name is shorter and more distinct
    // Or second part is often the song
    return parts[1].length <= parts[0].length ? parts[1] : parts[0];
  }
  
  if (parts.length >= 3) {
    // "Movie - Song - Artist" or "Artist - Song - Something"
    // Song is usually in the middle
    return parts[1];
  }
  
  return parts[0];
}

/**
 * Clean a YouTube title to extract just the song name
 * @param {string} title - Raw YouTube video title
 * @returns {string} - Cleaned song name
 */
export function cleanTitle(title) {
  if (!title || typeof title !== 'string') {
    return '';
  }
  
  // Step 1: Remove suffixes FIRST (this is key!)
  let cleaned = removeSuffixes(title);
  
  // Step 2: If we have delimiters, extract the song name
  if (/[-–—|｜:：]/.test(cleaned)) {
    cleaned = extractSongName(cleaned);
  }
  
  // Step 3: Final cleanup
  cleaned = cleaned
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .trim();
  
  // Sanity check: if we ended up with something too short, return original minus suffixes
  if (cleaned.length < 2) {
    return removeSuffixes(title);
  }
  
  return cleaned;
}

/**
 * Extract artist from YouTube title
 * @param {string} title - Raw YouTube video title
 * @returns {string} - Extracted artist name or 'Unknown'
 */
export function extractArtist(title) {
  if (!title || typeof title !== 'string') {
    return 'Unknown';
  }
  
  const cleaned = removeSuffixes(title);
  const delimiters = /\s*[-–—|｜:：]\s*/;
  const parts = cleaned.split(delimiters).map(p => p.trim()).filter(p => p.length > 0);
  
  if (parts.length >= 2) {
    // First part is usually artist/movie
    return parts[0];
  }
  
  return 'Unknown';
}

// Test cases when run directly
if (process.argv[1]?.includes('youtube.js')) {
  const testCases = [
    'Nachde Ne Sare (Full Song)',
    'Aashiqui 2 - Tum Hi Ho (Official Video)',
    'Happy - Pharrell Williams (Official Video)',
    'Tum Hi Ho - Arijit Singh (Official Music Video)',
    'Diljit Dosanjh - GOAT (Official Video)',
    'Sidhu Moosewala | Legend (Official Video) [HD]',
    'Bohemia - Rooh (Official Audio) (2023)',
  ];
  
  console.log('Testing cleanTitle():');
  for (const tc of testCases) {
    console.log(`  "${tc}"`);
    console.log(`    → Title: "${cleanTitle(tc)}"`);
    console.log(`    → Artist: "${extractArtist(tc)}"`);
    console.log('');
  }
}
