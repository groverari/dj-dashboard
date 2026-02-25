import { exec } from 'child_process';
import { promisify } from 'util';
import { cleanTitle, extractArtist, searchSongMetadata } from '../utils/youtube.js';

const execAsync = promisify(exec);

/**
 * Extract metadata from YouTube URL using yt-dlp
 */
export async function extractYouTubeMetadata(url) {
  try {
    // Validate URL is YouTube
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      throw new Error('Invalid YouTube URL');
    }

    console.log(`[Metadata] Fetching title for: ${url}`);

    // Use yt-dlp to get the video title
    const { stdout } = await execAsync(
      `yt-dlp --get-title "${url}"`,
      { timeout: 30000 }
    );

    const rawTitle = stdout.trim();
    console.log(`[Metadata] Raw title: "${rawTitle}"`);

    // Step 1: Extract rough metadata from YouTube title
    const roughTitle = cleanTitle(rawTitle);
    const roughArtist = extractArtist(rawTitle);
    console.log(`[Metadata] Rough extraction: title="${roughTitle}", artist="${roughArtist}"`);

    // Step 2: Try to verify via web search
    const verified = await searchSongMetadata(roughTitle, roughArtist);
    
    // Step 3: Use verified data if available, fallback to rough extraction
    const result = {
      title: verified?.title || roughTitle || rawTitle,
      artist: verified?.artist || roughArtist,
      url: url,
      verified: verified?.verified || false,
      source: verified?.source || 'youtube'
    };

    console.log(`[Metadata] Final: ${JSON.stringify(result)}`);
    return result;
  } catch (error) {
    console.error(`[Metadata] Error: ${error.message}`);
    throw new Error(`Failed to extract metadata: ${error.message}`);
  }
}
