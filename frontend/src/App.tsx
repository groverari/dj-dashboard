import { useState, useEffect } from 'react';
import { songService, Song } from './services/api';
import { SongDescriber } from './components/SongDescriber';
import { SongList } from './components/SongList';
import { Library } from './components/Library';

function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [error, setError] = useState('');

  const fetchSongs = async () => {
    try {
      const data = await songService.getAll();
      setSongs(data);
      setError('');
    } catch (err) {
      setError('Failed to connect to backend. Make sure it\'s running on :3001');
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSongs();
    const interval = setInterval(() => {
      if (document.hidden) return;
      fetchSongs();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const queueSongs = songs.filter((s) => s.status !== 'done');
  const doneSongs = songs.filter((s) => s.status === 'done');

  return (
    <div className="app">
      <header className="header">
        <h1>🎧 DJ Dashboard</h1>
        <p>Download from YouTube & manage your library</p>
      </header>

      <main className="container">
        {error && <div className="error">{error}</div>}

        <SongDescriber onSongAdded={fetchSongs} />
        {queueSongs.length > 0 && (
          <SongList songs={queueSongs} onSongUpdated={fetchSongs} />
        )}
        <Library songs={doneSongs} onSongUpdated={fetchSongs} />
      </main>

      <footer className="footer">
        <p>🪔 Built by Ramu Kaka • Auto-syncs every 30s</p>
      </footer>
    </div>
  );
}

export default App;
