import React, { useState, useEffect } from 'react';

interface Song {
  title: string;
  artist: string;
}

const getBackendURL = () => {
  const host = window.location.hostname;
  // If accessing via Tailscale IP, use it for backend too
  if (host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host.split(':')[0]}:3001`;
  }
  return 'http://localhost:3001';
};

export const YouTubeImporter: React.FC<{ onSongAdded: () => void }> = ({ onSongAdded }) => {
  const [ytUrl, setYtUrl] = useState('');
  const [selectedVibe, setSelectedVibe] = useState('');
  const [vibes, setVibes] = useState<string[]>([]);
  const [metadata, setMetadata] = useState<Song | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  // Set available vibes on mount
  useEffect(() => {
    const availableVibes = [
      'Old School Punjabi',
      'Mid-2000s Punjabi',
      'New Punjabi',
      'Old Bollywood Dance',
      'Modern Bollywood Dance',
      'Romantic'
    ];
    setVibes(availableVibes);
  }, []);

  // Fetch metadata from YouTube URL
  const handleFetchMetadata = async () => {
    if (!ytUrl.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }
    
    setIsFetching(true);
    setError('');
    setStatus('Extracting metadata (this may take 10-30 seconds)...');

    try {
      const backendURL = getBackendURL();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      const res = await fetch(`${backendURL}/api/metadata`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: ytUrl }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) throw new Error('Failed to fetch metadata');
      
      const data = await res.json();
      setMetadata(data);
      setStatus('');
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. The YouTube URL might be invalid or YouTube is slow.');
      } else {
        setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
      setMetadata(null);
    } finally {
      setIsFetching(false);
    }
  };

  // Add song to database (backend will download it)
  const handleAddSong = async () => {
    if (!ytUrl.trim() || !selectedVibe || !metadata) {
      setError('Please select a vibe and fetch metadata first');
      return;
    }

    setIsAdding(true);
    setError('');
    setStatus('Adding to library...');

    try {
      const backendURL = getBackendURL();
      const res = await fetch(`${backendURL}/api/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: metadata.title, 
          artist: metadata.artist, 
          url: ytUrl, 
          vibe: selectedVibe 
        }),
      });

      if (!res.ok) throw new Error('Failed to add song');

      setStatus('✅ Added to library! Backend will download it soon');
      
      // Clear form after success
      setTimeout(() => {
        setYtUrl('');
        setSelectedVibe('');
        setMetadata(null);
        setStatus('');
        onSongAdded();
      }, 2000);
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="youtube-importer">
      <h2>🎵 Import from YouTube</h2>

      {/* URL Input */}
      <div className="importer-field">
        <input
          type="text"
          placeholder="Paste YouTube URL..."
          value={ytUrl}
          onChange={(e) => setYtUrl(e.target.value)}
          className="importer-input"
        />
      </div>

      {/* Fetch Button */}
      <button
        onClick={handleFetchMetadata}
        disabled={isFetching || !ytUrl.trim()}
        className="importer-button primary"
      >
        {isFetching ? '⏳ Fetching...' : '🔍 Fetch Metadata'}
      </button>

      {/* Error Display */}
      {error && <div className="importer-error">{error}</div>}

      {/* Status */}
      {status && <div className="importer-status">{status}</div>}

      {/* Metadata Display */}
      {metadata && (
        <>
          <div className="importer-metadata">
            <div className="metadata-field">
              <label>Song Title</label>
              <p className="metadata-value">{metadata.title}</p>
            </div>
            <div className="metadata-field">
              <label>Artist</label>
              <p className="metadata-value">{metadata.artist}</p>
            </div>
          </div>

          {/* Vibe Selection */}
          <div className="importer-field">
            <label>Select Vibe</label>
            <select
              value={selectedVibe}
              onChange={(e) => setSelectedVibe(e.target.value)}
              disabled={isAdding}
              className="importer-input"
            >
              <option value="">Choose a vibe...</option>
              {vibes.map((vibe) => (
                <option key={vibe} value={vibe}>
                  🎵 {vibe}
                </option>
              ))}
            </select>
          </div>

          {/* Add Button */}
          <button
            onClick={handleAddSong}
            disabled={isAdding || !selectedVibe}
            className="importer-button success"
          >
            {isAdding ? '⏳ Adding...' : '➕ Add to Library'}
          </button>
        </>
      )}
    </div>
  );
};
