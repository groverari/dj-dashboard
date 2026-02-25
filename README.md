# 🎧 DJ Dashboard

Full-stack music management system for DJ sets. Manage, organize, and download your music queue with trending song discovery.

## Features

✨ **Music Management:**
- Add songs manually via form
- Organize by vibe category (Punjabi, Bollywood, Romantic, etc.)
- Track download status (pending/downloading/done)
- View download paths
- Delete songs

🤖 **Automation:**
- Daily YouTube scraper (8am) finds trending Indian party songs
- Duplicate detection before adding
- Gradual downloader (2-3 songs/hour, respects YouTube limits)
- Auto-refresh UI every 5 seconds

📱 **Mobile-Responsive UI:**
- Dark DJ theme
- Works on desktop & mobile
- Real-time sync
- Folder paths clickable

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + Axios
- **Backend:** Node.js + Express + SQLite + node-cron
- **Database:** SQLite (persistent file storage)
- **Deployment:** Docker + Docker Compose

## Quick Start

### Local Development

**Backend (port 3001):**
```bash
cd backend
npm install
npm start
```

**Frontend (port 3000, in another terminal):**
```bash
cd frontend
npm install
npm run dev
```

Open: **http://localhost:3000**

### Docker Deployment

```bash
docker-compose up --build
```

Access:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api/health

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/songs` | Get all songs |
| GET | `/api/songs?vibe=punjabi` | Filter by vibe |
| POST | `/api/songs` | Add new song |
| PATCH | `/api/songs/:id` | Update status/path |
| DELETE | `/api/songs/:id` | Delete song |
| GET | `/api/health` | Health check |

### Add Song (POST /api/songs)

```json
{
  "title": "Song Title",
  "artist": "Artist Name",
  "url": "https://youtube.com/watch?v=...",
  "vibe": "New Punjabi"
}
```

## Configuration

### Backend (.env)

```env
PORT=3001
DB_PATH=../dj-dashboard.db
EXTERNAL_DRIVE_PATH=/mnt/external-drive
```

### Vibe Categories

- New Punjabi
- Old School Punjabi
- Mid-2000s Punjabi
- Bollywood Dance
- Romantic

## Project Structure

```
dj-dashboard/
├── backend/
│   ├── src/
│   │   ├── server.js          (Express server)
│   │   ├── db.js              (SQLite setup)
│   │   ├── routes/            (API endpoints)
│   │   └── services/          (scraper, downloader, etc.)
│   ├── package.json
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx            (Main component)
│   │   ├── components/        (SongForm, SongList, etc.)
│   │   ├── services/          (API client)
│   │   └── styles/            (Dark theme CSS)
│   ├── index.html
│   ├── vite.config.ts
│   └── Dockerfile
│
├── dj-dashboard.db            (SQLite database, auto-created)
├── docker-compose.yml
└── README.md
```

## Services

### YouTube Scraper
- Runs daily at 8am (configurable in `services/scraper.js`)
- Searches: "trending Punjabi songs", "viral Indian party songs", etc.
- Auto-adds new songs to queue
- Filters duplicates

### Background Downloader
- Queue-based processing
- Max 2-3 songs/hour (YouTube rate limits)
- Uses yt-dlp
- Organizes by category on external drive
- Resumable on restart

### Duplicate Detector
- Checks by title + artist
- Checks by URL
- Prevents adding same song twice

## Development

### Add Features

1. **Backend:** Add API routes in `src/routes/songs.js`
2. **Frontend:** Add React components in `src/components/`
3. **Services:** Extend `src/services/` (downloader, scraper, etc.)

### Build for Production

```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build
```

## Troubleshooting

### Backend won't start
```bash
# Check port 3001 is free
lsof -i :3001

# Check dependencies
npm ci  # Clean install
npm start
```

### Frontend can't connect to backend
- Make sure backend is running on :3001
- Check browser console for errors
- Vite should proxy `/api` to `http://localhost:3001`

### Database issues
- Delete `dj-dashboard.db` to reset
- Tables auto-create on first run

## Deployment Options

### Tailscale (Private VPN)
```bash
export TS_AUTHKEY="tskey-..."
docker-compose up --build
# Access: http://<your-tailscale-ip>:3000
```

### Cloud (Vercel, Netlify, AWS, etc.)
- Host frontend on Vercel/Netlify
- Host backend on Railway, Fly.io, or AWS
- Update API baseURL in `frontend/src/services/api.ts`

## License

MIT

## Created By

🪔 Ramu Kaka - DJ Dashboard v1.0
