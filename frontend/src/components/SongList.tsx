import { Song } from '../services/api';
import { SongItem } from './SongItem';
import { DEFAULT_VIBES } from '../constants';

interface SongListProps {
  songs: Song[];
  onSongUpdated: () => void;
}

export function SongList({ songs, onSongUpdated }: SongListProps) {
  const uniqueVibes = Array.from(new Set(songs.map((s) => s.vibe)));
  const sortedVibes = uniqueVibes.sort((a, b) => {
    const indexA = DEFAULT_VIBES.indexOf(a);
    const indexB = DEFAULT_VIBES.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  const groupedByVibe = sortedVibes.reduce((acc, vibe) => {
    acc[vibe] = songs.filter((s) => s.vibe === vibe);
    return acc;
  }, {} as Record<string, Song[]>);

  return (
    <div className="song-list">
      <h2>🎧 Your Queue</h2>
      {songs.length === 0 ? (
        <p className="empty">No songs in the queue.</p>
      ) : (
        sortedVibes.map((vibe) => (
          <div key={vibe} className="vibe-section">
            <h3 className="vibe-title">{vibe} ({groupedByVibe[vibe].length})</h3>
            <div className="songs">
              {groupedByVibe[vibe].map((song) => (
                <SongItem key={song.id} song={song} onUpdate={onSongUpdated} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
