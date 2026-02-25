/**
 * Use Qwen7B to intelligently extract song title and artist from description
 */
export async function searchSongByDescription(description) {
  try {
    console.log(`[Search] Parsing description with qwen7b: "${description}"`);

    const prompt = `Extract the song title and artist from this description. Return ONLY valid JSON with keys "title" and "artist". If you can't determine one, use a reasonable guess based on context.

Description: "${description}"

Return format:
{"title": "Song Title", "artist": "Artist Name"}`;

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen2.5:7b-instruct',
        prompt: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama failed: ${response.statusText}`);
    }

    const data = await response.json();
    const responseText = data.response.trim();

    // Try to parse JSON from the response
    let match = responseText.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error('Could not extract JSON from qwen7b response');
    }

    const parsed = JSON.parse(match[0]);
    const title = parsed.title || description;
    const artist = parsed.artist || 'Unknown';

    const result = {
      title: title.trim(),
      artist: artist.trim(),
      youtube_query: `${artist.trim()} ${title.trim()}`.trim()
    };

    console.log(`[Search] Extracted: ${JSON.stringify(result)}`);
    return result;
  } catch (error) {
    console.error(`[Search] Error: ${error.message}`);
    throw new Error(`Failed to parse song description: ${error.message}`);
  }
}
