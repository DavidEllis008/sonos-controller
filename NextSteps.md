Done! I've set up the complete project structure for the Sonos Web Controller. Here's what was created:

  Docker Configuration:
  - Dockerfile - Multi-stage build (Node for frontend, Python for backend)
  - docker-compose.yml - Configured for Synology with host networking
  - supervisord.conf - Process manager for the backend
  - entrypoint.sh - Startup script with auto IP detection

  Backend (FastAPI + Python):
  - backend/app/main.py - FastAPI app with lifespan handler
  - backend/app/config.py - Settings with auto IP detection
  - backend/app/models.py - SQLAlchemy models (Track, Playlist, IndexStatus)
  - backend/app/library.py - Music indexer with metadata extraction
  - backend/app/routers/sonos.py - Sonos control via SoCo
  - backend/app/routers/library.py - Library browsing API
  - backend/app/routers/streaming.py - HTTP file server with range requests
  - backend/app/routers/playlists.py - Playlist management

  Frontend (React + Vite):
  - 5 pages: NowPlaying, Browse, Queue, Search, Speakers
  - Zustand store for state management
  - PlayerBar component with playback controls
  - Minimalist dark theme CSS

  Next steps:
  1. Adjust paths in docker-compose.yml to match your Synology setup
  2. Build and run: docker-compose up -d --build
  3. Access at http://<synology-ip>:8000


 Docker build succeeded. The sonos-controller image is ready:

  | Repository       | Tag    | Size  |
  |------------------|--------|-------|
  | sonos-controller | latest | 290MB |

  The build:
  - Compiled the React frontend (55 modules)
  - Installed Python dependencies (FastAPI, SoCo, SQLAlchemy, etc.)
  - Set up supervisor for process management
  - Configured health checks and entrypoint

  To run locally for testing:
  docker run -p 8000:8000 \
    -v /Volumes/Family/Music:/music:ro \
    -v /Users/david/code/sonos-controller-data:/data \
    -e HOST_IP=192.168.10.148 \
    sonos-controller

curl -s http://localhost:8000/api/health | python3 -m json.tool
curl -s http://localhost:8000/api/library/status
curl -s http://localhost:8000/api/sonos/devices | python3 -m json.tool
curl -s http://localhost:8000/api/library/artists | python3 -m json.tool
