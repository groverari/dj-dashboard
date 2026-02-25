import axios from 'axios';

// Detect if we're on Tailscale or localhost
const getBackendHost = () => {
  const host = window.location.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host.split(':')[0]}:3001`;
  }
  return 'http://localhost:3001';
};

export const BACKEND_URL = getBackendHost();

const API = axios.create({
  baseURL: `${BACKEND_URL}/api`,
});

export interface Song {
  id: number;
  title: string;
  artist: string;
  url: string;
  vibe: string;
  status: 'pending' | 'downloading' | 'done' | 'error';
  path?: string;
  error?: string;
  dateAdded: string;
}

export const songService = {
  async getAll() {
    const res = await API.get<Song[]>('/songs');
    return res.data;
  },

  async getByVibe(vibe: string) {
    const res = await API.get<Song[]>(`/songs?vibe=${vibe}`);
    return res.data;
  },

  async add(song: Omit<Song, 'id' | 'status' | 'dateAdded'>) {
    const res = await API.post<Song>('/songs', song);
    return res.data;
  },

  async update(id: number, data: Partial<Song>) {
    const res = await API.patch(`/songs/${id}`, data);
    return res.data;
  },

  async delete(id: number) {
    const res = await API.delete(`/songs/${id}`);
    return res.data;
  },

  async getVibes(): Promise<string[]> {
    const res = await API.get<string[]>('/vibes');
    return res.data;
  },

  async extractMetadata(url: string) {
    const res = await API.post<{ title: string; artist: string }>('/metadata', { url });
    return res.data;
  },

  async searchSong(description: string) {
    const res = await API.post<{ title: string; artist: string; youtube_query?: string }>('/search-song', { description });
    return res.data;
  },
};
