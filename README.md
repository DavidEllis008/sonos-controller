# Sonos Web Controller

A web-based Sonos controller with local music library integration, designed to run as a Docker container on a Synology NAS.

## Features

- **Sonos Control**: Play, pause, skip, volume, and speaker grouping via SoCo library
- **Music Library**: Browse and play music from your SMB-mounted library
- **Metadata Extraction**: Reads ID3 tags with fallback to folder/file names
- **Album Art**: Supports embedded art and folder.jpg/cover.jpg
- **Playlists**: Import M3U playlists and create your own
- **Search**: Search across artists, albums, and tracks
- **Responsive UI**: Works on desktop and tablet browsers

## Quick Start

### Prerequisites

1. **Synology NAS** with Container Manager (Docker) installed
2. **Music library** accessible via SMB (mounted on the Synology host)
3. **Sonos speakers** on the same network

### Setup on Synology

1. **Mount your SMB music share** on the Synology host:
   - Use File Station or mount via SSH to `/volume1/Family/Music`
   - Or adjust the path in `docker-compose.yml`

2. **Create data directory** for persistent storage:
   ```bash
   mkdir -p /volume1/docker/sonos-controller
   ```

3. **Clone or copy this project** to your Synology:
   ```bash
   git clone <repo-url> /volume1/docker/sonos-controller-app
   cd /volume1/docker/sonos-controller-app
   ```

4. **Edit docker-compose.yml** to match your paths:
   ```yaml
   volumes:
     - /volume1/Family/Music:/music:ro    # Your music library
     - /volume1/docker/sonos-controller:/data  # Persistent storage
   ```

5. **Build and start the container**:
   ```bash
   docker-compose up -d --build
   ```

6. **Access the web UI** at `http://<synology-ip>:8000`

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MUSIC_PATH` | `/music` | Path to music library inside container |
| `DATA_PATH` | `/data` | Path to persistent data (database, playlists) |
| `HOST_IP` | `auto` | IP address for Sonos streaming URLs |

### Network Configuration

The container uses **host networking** by default so:
- Sonos devices can reach the streaming server
- The controller can discover Sonos devices via multicast

If you need bridge networking, set `HOST_IP` explicitly to your Synology's IP.

## Music Library Structure

The indexer expects music organized as:

```
/music/
  Artist Name/
    Album Name/
      01 - Track Title.mp3
      02 - Track Title.mp3
      folder.jpg  (album art)
    Single Track.mp3
  Playlists/
    My Playlist.m3u
```

### Supported Formats

- **Audio**: MP3, M4A, WAV, FLAC
- **Playlists**: M3U, M3U8

### Album Art Priority

1. Embedded art in audio file metadata
2. `folder.jpg` or `Folder.jpg` in track directory
3. `cover.jpg` or `Cover.jpg` in track directory

## API Endpoints

### Sonos Control

- `GET /api/sonos/devices` - List all Sonos devices
- `GET /api/sonos/devices/{uid}/now-playing` - Get current track
- `POST /api/sonos/devices/{uid}/play` - Start playback
- `POST /api/sonos/devices/{uid}/pause` - Pause playback
- `POST /api/sonos/devices/{uid}/next` - Next track
- `POST /api/sonos/devices/{uid}/previous` - Previous track
- `POST /api/sonos/devices/{uid}/volume` - Set volume
- `GET /api/sonos/devices/{uid}/queue` - Get queue
- `POST /api/sonos/devices/{uid}/play-uri` - Play a track (clears queue)
- `POST /api/sonos/devices/{uid}/add-to-queue` - Add to queue
- `POST /api/sonos/devices/{uid}/play-next` - Play next

### Library

- `GET /api/library/status` - Get indexing status
- `POST /api/library/reindex` - Trigger re-index
- `GET /api/library/stats` - Library statistics
- `GET /api/library/artists` - List artists
- `GET /api/library/albums` - List albums
- `GET /api/library/tracks` - List tracks
- `GET /api/library/search?q=query` - Search library

### Streaming

- `GET /stream/{file_path}` - Stream audio file
- `GET /stream/art/embedded/{track_id}` - Get embedded album art
- `GET /stream/art/{art_path}` - Get folder album art

### Playlists

- `GET /api/playlists` - List playlists
- `POST /api/playlists` - Create playlist
- `GET /api/playlists/{id}` - Get playlist with tracks
- `PUT /api/playlists/{id}` - Rename playlist
- `DELETE /api/playlists/{id}` - Delete playlist
- `POST /api/playlists/{id}/tracks` - Add track
- `DELETE /api/playlists/{id}/tracks/{position}` - Remove track

## Development

### Local Development

1. **Backend**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt

   # Set environment variables
   export MUSIC_PATH=/path/to/music
   export DATA_PATH=./data

   # Run
   uvicorn app.main:app --reload --port 8000
   ```

2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

   The Vite dev server proxies API requests to the backend.

### Project Structure

```
/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py          # FastAPI app
│   │   ├── config.py        # Settings
│   │   ├── models.py        # SQLAlchemy models
│   │   ├── library.py       # Music indexer
│   │   └── routers/
│   │       ├── sonos.py     # Sonos control
│   │       ├── library.py   # Library browsing
│   │       ├── streaming.py # File streaming
│   │       └── playlists.py # Playlist management
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── store.js         # Zustand state
│   │   ├── components/
│   │   └── pages/
│   ├── package.json
│   └── vite.config.js
├── Dockerfile
├── docker-compose.yml
├── supervisord.conf
├── entrypoint.sh
└── README.md
```

## Troubleshooting

### Sonos devices not found

- Ensure container uses host networking
- Check that Sonos devices are on same network/VLAN
- Try refreshing from the Speakers page

### Streaming not working

- Verify `HOST_IP` is correctly set (check container logs)
- Ensure the IP is reachable from Sonos devices
- Check firewall rules allow port 8000

### Indexing issues

- Check container logs: `docker-compose logs -f`
- Verify music path is correctly mounted
- Trigger manual re-index from the UI

## License

MIT
