import { useState, useEffect } from 'react';
import { songService } from '../services/api';
import { DEFAULT_VIBES } from '../constants';
import '../styles/SongDescriber.css';

interface SongMetadata {
  title: string;
  artist: string;
  url?: string;
  youtube_query?: string;
}

interface SongDescriberProps {
  onSongAdded: () => void;
}

export function SongDescriber({ onSongAdded }: SongDescriberProps) {
  const [input, setInput] = useState('');
  const [inputType, setInputType] = useState<'description' | 'url'>('url');
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<SongMetadata | null>(null);
  const [error, setError] = useState('');
  const [selectedVibe, setSelectedVibe] = useState('');
  const [availableVibes, setAvailableVibes] = useState<string[]>(DEFAULT_VIBES);
  const [showCustomVibe, setShowCustomVibe] = useState(false);
  const [customVibe, setCustomVibe] = useState('');

  useEffect(() => {
    songService.getVibes().then((vibes) => {
      if (vibes.length > 0) {
        // Merge API vibes with defaults, deduplicating
        const merged = Array.from(new Set([...DEFAULT_VIBES, ...vibes]));
        setAvailableVibes(merged);
      }
    }).catch(() => {
      // Keep defaults on error
    });
  }, []);

  const handleSearchSong = async () => {
    if (!input.trim()) {
      setError(inputType === 'url' ? 'Please paste a YouTube URL' : 'Please describe the song');
      return;
    }

    setLoading(true);
    setError('');
    setMetadata(null);

    try {
      if (inputType === 'url') {
        const data = await songService.extractMetadata(input.trim());
        setMetadata(data);
      } else {
        const data = await songService.searchSong(input.trim());
        setMetadata(data);
      }
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
      await songService.add({
        title: metadata.title,
        artist: metadata.artist,
        url: metadata.url || metadata.youtube_query || input.trim(),
        vibe: finalVibe,
      });

      setInput('');
      setMetadata(null);
      setSelectedVibe('');
      setCustomVibe('');
      setShowCustomVibe(false);
      setError('');
      onSongAdded();

      // Refresh vibes list in case a new custom vibe was used
      songService.getVibes().then((vibes) => {
        if (vibes.length > 0) {
          const merged = Array.from(new Set([...DEFAULT_VIBES, ...vibes]));
          setAvailableVibes(merged);
        }
      }).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add song');
    }
  };

  return (
    <div className="song-describer">
      <h2>🎵 Add a Song</h2>

      <div className="input-type-selector">
        <button
          className={`type-btn ${inputType === 'url' ? 'active' : ''}`}
          onClick={() => { setInputType('url'); setInput(''); setMetadata(null); setError(''); }}
        >
          🔗 YouTube Link
        </button>
        <button
          className={`type-btn ${inputType === 'description' ? 'active' : ''}`}
          onClick={() => { setInputType('description'); setInput(''); setMetadata(null); setError(''); }}
        >
          📝 Describe
        </button>
      </div>

      <p className="helper-text">
        {inputType === 'url'
          ? "Paste a YouTube link and we'll extract the title & artist"
          : "Type a song description and we'll find the title & artist"}
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
                    <option key={vibe} value={vibe}>{vibe}</option>
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
