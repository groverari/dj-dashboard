import { useState, useEffect } from 'react';
import { songService, Song } from './services/api';
import { YouTubeImporter } from './components/YouTubeImporter';
import { SongDescriber } from './components/SongDescriber';
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
    // Only poll if user is actively looking at the page (not in background)
    const interval = setInterval(() => {
      if (document.hidden) return; // Don't fetch if tab is not visible
      fetchSongs();
    }, 30000); // Refresh every 30s instead of 5s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>🎧 DJ Dashboard</h1>
        <p>Download from YouTube & manage your library</p>
      </header>

      <main className="container">
        {error && <div className="error">{error}</div>}

        <YouTubeImporter onSongAdded={fetchSongs} />
        <SongDescriber />
        <Library songs={songs} />
      </main>

      <footer className="footer">
        <p>🪔 Built by Ramu Kaka • Auto-syncs every 5s</p>
      </footer>
    </div>
  );
}

export default App;
