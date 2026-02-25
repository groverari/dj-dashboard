import { useEffect, useState } from 'react';
import { Song, songService } from '../services/api';

interface LibraryProps {
  triggerRefresh?: number;
}

export function Library({ triggerRefresh }: LibraryProps) {
  const [downloadedSongs, setDownloadedSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);

  useEffect(() => {
    fetchDownloaded();
  }, [triggerRefresh]);

  const fetchDownloaded = async () => {
    setLoading(true);
    try {
      const songs = await songService.getAll();
      const downloaded = songs.filter((s) => s.status === 'done');
      setDownloadedSongs(downloaded);
    } catch (error) {
      console.error('Error fetching downloaded songs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">📚 Loading library...</div>;
  }

  if (downloadedSongs.length === 0) {
    return (
      <div className="library">
        <h2>📚 Your Library</h2>
        <p className="empty">No downloaded songs yet. Add and download some to get started!</p>
      </div>
    );
  }

  const vibes = Array.from(new Set(downloadedSongs.map((s) => s.vibe))).sort();
  const filteredSongs = selectedVibe
    ? downloadedSongs.filter((s) => s.vibe === selectedVibe)
    : downloadedSongs;

  const groupedByVibe = vibes.reduce((acc, vibe) => {
    acc[vibe] = downloadedSongs.filter((s) => s.vibe === vibe);
    return acc;
  }, {} as Record<string, Song[]>);

  return (
    <div className="library">
      <h2>📚 Your Library</h2>
      <p className="library-subtitle">{downloadedSongs.length} song(s) downloaded</p>

      <div className="vibe-filter">
        <button
          className={`filter-btn ${selectedVibe === null ? 'active' : ''}`}
          onClick={() => setSelectedVibe(null)}
        >
          All ({downloadedSongs.length})
        </button>
        {vibes.map((vibe) => (
          <button
            key={vibe}
            className={`filter-btn ${selectedVibe === vibe ? 'active' : ''}`}
            onClick={() => setSelectedVibe(vibe)}
          >
            {vibe} ({groupedByVibe[vibe].length})
          </button>
        ))}
      </div>

      <div className="library-songs">
        {filteredSongs.length === 0 ? (
          <p className="no-songs">No songs in this category</p>
        ) : (
          filteredSongs.map((song) => (
            <div key={song.id} className="library-song-card">
              <div className="song-info">
                <div className="song-title">{song.title}</div>
                <div className="song-artist">{song.artist}</div>
                <div className="song-meta">
                  <span className="vibe-badge">{song.vibe}</span>
                  <span className="path-text">📂 {song.path?.split('/').pop()}</span>
                </div>
              </div>
              <div className="song-actions">
                {song.path && (
                  <button
                    className="play-btn"
                    title="Open file location"
                    onClick={() => {
                      // Copy path to clipboard for reference
                      navigator.clipboard.writeText(song.path!);
                      alert('Path copied: ' + song.path);
                    }}
                  >
                    📍
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
