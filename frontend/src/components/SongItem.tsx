import { useState } from 'react';
import { Song } from '../services/api';
import { EditSongModal } from './EditSongModal';

interface SongItemProps {
  song: Song;
  onUpdate: () => void;
}

const statusEmoji = {
  pending: '⏳',
  downloading: '⬇️',
  done: '✅',
  error: '❌'
};

export function SongItem({ song, onUpdate }: SongItemProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);

  return (
    <>
      <div className="song-item">
        <div className="song-info">
          <div className="song-title">{song.title}</div>
          <div className="song-meta">
            <span className="artist">{song.artist}</span>
            <span className="vibe-badge">{song.vibe}</span>
            <span className="status">{statusEmoji[song.status as keyof typeof statusEmoji]} {song.status}</span>
          </div>
          {song.error && (
            <div className="error-msg">
              ⚠️ <strong>Error:</strong> {song.error}
            </div>
          )}
        </div>
        <button className="edit-btn" onClick={() => setIsEditOpen(true)}>
          ✏️
        </button>
      </div>

      <EditSongModal
        song={song}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSave={onUpdate}
      />
    </>
  );
}
