import React, { useState, useEffect } from 'react';
import '../styles/SongDescriber.css';

interface SongMetadata {
  title: string;
  artist: string;
  youtube_query?: string;
}

export function SongDescriber() {
  const [input, setInput] = useState('');
  const [inputType, setInputType] = useState<'description' | 'url'>('description');
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<SongMetadata | null>(null);
  const [error, setError] = useState('');
  const [selectedVibe, setSelectedVibe] = useState('');
  const [availableVibes, setAvailableVibes] = useState<string[]>([]);
  const [showCustomVibe, setShowCustomVibe] = useState(false);
  const [customVibe, setCustomVibe] = useState('');

  const backendURL = import.meta.env.VITE_BACKEND_URL || (() => {
    const host = window.location.hostname;
    return host === 'localhost' ? 'http://localhost:3001' : `http://${host}:3001`;
  })();

  // Fetch available vibes on mount
  useEffect(() => {
    const fetchVibes = async () => {
      try {
        const res = await fetch(`${backendURL}/api/vibes`);
        if (res.ok) {
          const vibes = await res.json();
          setAvailableVibes(vibes);
        }
      } catch (err) {
        console.log('Could not fetch vibes, using defaults');
        setAvailableVibes([
          'New Punjabi',
          'Old School Punjabi',
          'Mid-2000s Punjabi',
          'Old Bollywood Dance',
          'Modern Bollywood Dance',
          'Romantic',
        ]);
      }
    };
    fetchVibes();
  }, [backendURL]);

  const handleSearchSong = async () => {
    if (!input.trim()) {
      setError(inputType === 'url' ? 'Please paste a YouTube URL' : 'Please describe the song');
      return;
    }

    setLoading(true);
    setError('');
    setMetadata(null);

    try {
      const endpoint = inputType === 'url' ? '/api/metadata' : '/api/search-song';
      const payload = inputType === 'url' 
        ? { url: input.trim() }
        : { description: input.trim() };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const res = await fetch(`${backendURL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `Failed to extract metadata`);
      }

      const data = await res.json();
      setMetadata(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. YouTube metadata extraction is slow.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to extract metadata');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddSong = async () => {
    const finalVibe = showCustomVibe ? customVibe.trim() : selectedVibe;
    
    if (!metadata || !finalVibe) {
      setError('Please select or enter a vibe');
      return;
    }

    try {
      const res = await fetch(`${backendURL}/api/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: metadata.title,
          artist: metadata.artist,
          url: (metadata as any).url || metadata.youtube_query || '',
          vibe: finalVibe,
        }),
      });

      if (!res.ok) throw new Error('Failed to add song');

      setInput('');
      setMetadata(null);
      setSelectedVibe('');
      setCustomVibe('');
      setShowCustomVibe(false);
      setError('✅ Song added successfully!');
      
      // Refresh vibes list
      const refreshRes = await fetch(`${backendURL}/api/vibes`);
      if (refreshRes.ok) {
        const vibes = await refreshRes.json();
        setAvailableVibes(vibes);
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setError(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add song');
    }
  };

  return (
    <div className="song-describer">
      <h2>🎵 Add a Song</h2>
      
      <div className="input-type-selector">
        <button
          className={`type-btn ${inputType === 'description' ? 'active' : ''}`}
          onClick={() => { setInputType('description'); setInput(''); setMetadata(null); }}
        >
          📝 Describe
        </button>
        <button
          className={`type-btn ${inputType === 'url' ? 'active' : ''}`}
          onClick={() => { setInputType('url'); setInput(''); setMetadata(null); }}
        >
          🔗 YouTube Link
        </button>
      </div>

      <p className="helper-text">
        {inputType === 'url' 
          ? "Paste a YouTube link and I'll extract the title & artist"
          : "Type a song description and I'll extract the title & artist"}
      </p>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={inputType === 'url' 
          ? 'https://www.youtube.com/watch?v=...'
          : "e.g., 'Blinding Lights by The Weeknd' or 'that romantic Punjabi song'"}
        disabled={loading}
        className="description-input"
      />

      <button
        onClick={handleSearchSong}
        disabled={loading || !input.trim()}
        className="search-btn"
      >
        {loading ? '🔍 Searching...' : inputType === 'url' ? '🔍 Extract from URL' : '🔍 Search Song'}
      </button>

      {error && (
        <div className={`error-message ${error.startsWith('✅') ? 'success' : 'error'}`}>
          {error}
        </div>
      )}

      {metadata && (
        <div className="metadata-result">
          <div className="metadata-field">
            <label>Title</label>
            <p className="metadata-value">{metadata.title}</p>
          </div>
          <div className="metadata-field">
            <label>Artist</label>
            <p className="metadata-value">{metadata.artist}</p>
          </div>

          <div className="vibe-selector">
            <label>Select or Create Vibe</label>
            {!showCustomVibe ? (
              <>
                <select value={selectedVibe} onChange={(e) => setSelectedVibe(e.target.value)}>
                  <option value="">Choose a vibe...</option>
                  {availableVibes.map((vibe) => (
                    <option key={vibe} value={vibe}>
                      {vibe}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="custom-vibe-btn"
                  onClick={() => setShowCustomVibe(true)}
                >
                  + Create New Vibe
                </button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={customVibe}
                  onChange={(e) => setCustomVibe(e.target.value)}
                  placeholder="Enter new vibe name"
                  className="custom-vibe-input"
                />
                <button
                  type="button"
                  className="custom-vibe-btn"
                  onClick={() => setShowCustomVibe(false)}
                >
                  ← Use Existing Vibe
                </button>
              </>
            )}
          </div>

          <button
            onClick={handleAddSong}
            disabled={!selectedVibe && (!showCustomVibe || !customVibe.trim())}
            className="add-btn"
          >
            ➕ Add to Library
          </button>
        </div>
      )}
    </div>
  );
}
