import axios from 'axios';

// Detect if we're on Tailscale or localhost
const getBaseURL = () => {
  const host = window.location.hostname;
  // If accessing via Tailscale IP, use it for backend too
  if (host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host.split(':')[0]}:3001/api`;
  }
  return 'http://localhost:3001/api';
};

const API = axios.create({
  baseURL: getBaseURL(),
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

  async updateStatus(id: number, status: string, path?: string) {
    const res = await API.patch(`/songs/${id}`, { status, path });
    return res.data;
  },

  async delete(id: number) {
    const res = await API.delete(`/songs/${id}`);
    return res.data;
  }
};
