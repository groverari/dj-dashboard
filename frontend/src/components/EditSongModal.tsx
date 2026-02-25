import { useState } from 'react';
import { Song, songService } from '../services/api';

interface EditSongModalProps {
  song: Song;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function EditSongModal({ song, isOpen, onClose, onSave }: EditSongModalProps) {
  const [title, setTitle] = useState(song.title);
  const [artist, setArtist] = useState(song.artist);
  const [vibe, setVibe] = useState(song.vibe);
  const [isSaving, setIsSaving] = useState(false);

  const vibes = [
    'New Punjabi (2010+)',
    'Old School Punjabi (80s-90s)',
    'Mid-2000s Punjabi',
    'Old Bollywood Dance (70s-80s)',
    'Modern Bollywood Dance',
    'Romantic'
  ];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await songService.update(song.id, { title, artist, vibe });
      onSave();
      onClose();
    } catch (error) {
      alert('Error saving song');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${song.title}" permanently?`)) return;
    try {
      await songService.delete(song.id);
      onSave();
      onClose();
    } catch (error) {
      alert('Error deleting song');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Edit Song</h2>
        
        <div className="modal-field">
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Song title"
          />
        </div>

        <div className="modal-field">
          <label>Artist</label>
          <input
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="Artist name"
          />
        </div>

        <div className="modal-field">
          <label>Vibe</label>
          <select value={vibe} onChange={(e) => setVibe(e.target.value)}>
            {vibes.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-delete" onClick={handleDelete}>
            🗑️ Delete
          </button>
          <button className="btn-save" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
