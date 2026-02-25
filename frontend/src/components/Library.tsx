import { useState } from 'react';
import { Song } from '../services/api';
import { SongItem } from './SongItem';

interface LibraryProps {
  songs: Song[];
  onSongUpdated: () => void;
}

export function Library({ songs, onSongUpdated }: LibraryProps) {
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);

  if (songs.length === 0) {
    return (
      <div className="library">
        <h2>📚 Your Library</h2>
        <p className="empty">No downloaded songs yet. Add some to get started!</p>
      </div>
    );
  }

  const vibes = Array.from(new Set(songs.map((s) => s.vibe))).sort();
  const filteredSongs = selectedVibe
    ? songs.filter((s) => s.vibe === selectedVibe)
    : songs;

  const groupedByVibe = vibes.reduce((acc, vibe) => {
    acc[vibe] = songs.filter((s) => s.vibe === vibe);
    return acc;
  }, {} as Record<string, Song[]>);

  return (
    <div className="library">
      <h2>📚 Your Library</h2>
      <p className="library-subtitle">{songs.length} song(s) downloaded</p>

      <div className="vibe-filter">
        <button
          className={`filter-btn ${selectedVibe === null ? 'active' : ''}`}
          onClick={() => setSelectedVibe(null)}
        >
          All ({songs.length})
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
            <SongItem key={song.id} song={song} onUpdate={onSongUpdated} />
          ))
        )}
      </div>
    </div>
  );
}
