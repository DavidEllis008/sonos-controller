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
curl -sL -X POST -H 'Content-Type: application/json' -d '{"ip":"192.168.10.103"}' http://localhost:8000/api/sonos/devices/add
----
⏺ Bash(curl -sL "http://localhost:8000/api/library/albums/Abbey%20Road/tracks" ⏺ Bash(curl -sL "http://localhost:8000/api/library/albums/Abbey%20Road/tracks" | python3 -m json.tool | grep stream_url)
⏺ Bash(curl -sL 'http://localhost:8000/api/library/tracks?limit=3')
⏺ Bash(curl -sL http://localhost:8000/api/library/stats)



----
 Indexer test results:

  | Feature             | Status | Details                                        |
  |---------------------|--------|------------------------------------------------|
  | File discovery      | ✅     | Found 9 files (8 MP3 + 1 M3U)                  |
  | Metadata extraction | ✅     | Title, artist, album, track#, year extracted   |
  | Artist indexing     | ✅     | 2 artists: The Beatles (5), Pink Floyd (3)     |
  | Album indexing      | ✅     | 3 albums with correct year                     |
  | Track ordering      | ✅     | Tracks sorted by track number                  |
  | M3U import          | ✅     | "Classic Rock" playlist with 4 resolved tracks |
  | Stream URLs         | ✅     | Valid URLs generated for each track            |
  | File streaming      | ✅     | 200 OK, audio/mpeg content type                |
  | Range requests      | ✅     | 206 Partial Content for seeking                |
  | Search              | ✅     | Artist search returns results                  |

  The library indexer correctly:
  - Scans the directory structure
  - Extracts ID3 metadata from MP3 files
  - Indexes tracks by artist/album
  - Imports M3U playlists and resolves relative paths
  - Generates working stream URLs for Sonos playback

> Test the frontend in the browser 

Fixing Device Search. 
Manual Add helps

 Bash(curl -sL -X POST -H 'Content-Type: application/json' -d '{"ip":"192.168.10.103"}' http://localhost:8000/api/sonos/devices/add)
  ⎿  {                                                   
       "devices": [
         {
           "uid": "RINCON_38420BC7E8B601400",
           "name": "Family Room",
           "ip": "192.168.10.103",
           "is_coordinator": true,
           "coordinator_uid": "RINCON_38420BC7E8B601400",
           "group_members": [
             "RINCON_38420BC7E8B601400"
           ],
           "volume": 11,
           "mute": false,
           "is_playing": false
         },
         {
           "uid": "RINCON_38420B773D8401400",
           "name": "Pool",
           "ip": "192.168.10.126",
           "is_coordinator": true,
           "coordinator_uid": "RINCON_38420B773D8401400",
           "group_members": [
             "RINCON_38420B773D8401400"
           ],
           "volume": 53,
           "mute": false,
           "is_playing": false
         }
       ]
     }

∴ Thinking…

  Excellent! It worked! By adding one device by IP, it discovered all other devices in the household:
  - Family Room at 192.168.10.103 (volume 11)
  - Pool at 192.168.10.126 (volume 53)

  Now let me test that the regular devices endpoint returns them.

⏺ Found 2 Sonos devices via IP connection:                                                                          11:20 PM  claude-opus-4-5-20251101
  - Family Room (192.168.10.103) - volume 11
  - Pool (192.168.10.126) - volume 53


⏺ Opened the Speakers page. You should now see both Family Room and Pool speakers.

  Summary of fix:
  1. SSDP multicast discovery doesn't work in Docker bridge networking
  2. Added POST /api/sonos/devices/add endpoint to manually add device by IP
  3. When adding one device, it automatically discovers all other devices in the household via device.all_zones
  4. Subsequent calls to /api/sonos/devices will use the cached devices and refresh from an existing connection

  For the production deployment on Synology, you could either:
  - Use network_mode: host in docker-compose (already configured) which should make SSDP work
  - Or add a startup config to specify known Sonos IPs
-----------------------------------------------------------------
> Test adding a track or an album to the Queue to play. 

Found error on creator attribute. fixing...

funny run command 
 Bash command

   docker run -d --name sonos-test -p 8000:8000 \
     -v /tmp/sonos-test-music:/music:ro \
     -v /tmp/sonos-test-data:/data \
     -e HOST_IP=192.168.10.148 \
     sonos-controller && sleep 3 && \
   curl -sL -X POST -H 'Content-Type: application/json' -d '{"ip":"192.168.10.103"}' http://localhost:8000/api/sonos/devices/add > /dev/null
   Start and add device

