import { Song } from '../services/api';
import { SongItem } from './SongItem';

interface SongListProps {
  songs: Song[];
  onSongDeleted: () => void;
}

export function SongList({ songs, onSongDeleted }: SongListProps) {
  // Dynamically get unique vibes from songs, preserving order
  const vibeOrder = [
    'Old Bollywood Dance (70s-80s)',
    'Modern Bollywood Dance',
    'Old School Punjabi (80s-90s)',
    'Mid-2000s Punjabi',
    'New Punjabi (2010+)',
    'Romantic'
  ];
  
  const uniqueVibes = Array.from(new Set(songs.map((s) => s.vibe)));
  const sortedVibes = uniqueVibes.sort((a, b) => {
    const indexA = vibeOrder.indexOf(a);
    const indexB = vibeOrder.indexOf(b);
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
        <p className="empty">No songs yet. Add one to get started!</p>
      ) : (
        sortedVibes.map((vibe) => (
          <div key={vibe} className="vibe-section">
            <h3 className="vibe-title">{vibe} ({groupedByVibe[vibe].length})</h3>
            <div className="songs">
              {groupedByVibe[vibe].map((song) => (
                <SongItem key={song.id} song={song} onDelete={onSongDeleted} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
