# Sonos Web Controller with SMB Music Library

Build a web-based Sonos controller with local music library integration via SMB, designed to run as a Docker container on a Synology NAS.

## Architecture

Create a single Docker container running two services:
- **Backend**: Python Flask/FastAPI API for Sonos control (using the SoCo library), music library indexing, and HTTP file serving
- **Frontend**: React app with a minimalist, clean UI

Use a process manager (like supervisord) or a simple entrypoint script to run both services in one container.

## Sonos Features

Use the Python SoCo library for all Sonos interactions:

1. **Auto-discovery**: Automatically discover all Sonos devices on the network using SoCo's discovery feature
2. **Playback controls**: Play, pause, stop, next track, previous track
3. **Volume control**: Volume up/down/mute for individual speakers and groups
4. **Speaker grouping**: Group and ungroup speakers, select which speaker/group to control
5. **Queue management**: Display the current queue, show upcoming tracks
6. **Now Playing**: Show current track info including:
   - Track title, artist, album
   - Album art when available
   - Progress bar with current time / total duration

## Music Library Integration

### SMB Mount

Mount an SMB share into the container:
- **SMB Path**: smb://Library/Family/Music/
- **Authentication**: Guest/anonymous access (no credentials required)
- Mount point inside container: `/music`

### Library Structure

Music is organized in these patterns:
- `Artist/Album/Track.ext`
- `Artist/Track.ext` (songs not in an album)

### Supported Formats

Only index and display files with these extensions (filter out unsupported formats like WMA):
- MP3
- M4A
- WAV
- M3U (playlist files)

### Metadata Extraction

1. Read embedded metadata tags (ID3, etc.) from audio files using a Python library like mutagen or tinytag
2. Extract: title, artist, album, track number, duration
3. **Fallback**: If metadata is missing or incomplete, parse the folder/file path:
   - Artist from parent or grandparent folder name
   - Album from parent folder name (if in Artist/Album/Track structure)
   - Title from filename (strip extension)

### Album Art

Check for album art in this priority order:
1. Embedded album art in the audio file metadata
2. `folder.jpg` or `Folder.jpg` in the same directory as the track
3. `cover.jpg` or `Cover.jpg` in the same directory
4. Display a placeholder if no art is found

### Library Indexing

- On startup, scan the mounted music directory and build an index (SQLite database stored in persistent volume)
- Provide an API endpoint and UI button to manually trigger a re-scan
- Index should store: file path, artist, album, title, track number, duration, whether album art exists

## HTTP File Server

The backend must serve music files over HTTP so Sonos can stream them:
- Expose an endpoint like `GET /stream/<path:filepath>` that serves files from the mounted music directory
- Also serve album art images via `GET /art/<path:filepath>`
- The URLs provided to Sonos must be accessible from the local network (use the container's host IP/port)
- Handle range requests for seeking support

## Playlist Support

### Existing Playlists
- Parse M3U files found in the music library
- Display them in the Browse UI alongside Artists/Albums
- M3U files contain relative or absolute paths to tracks—resolve these to actual files

### User-Created Playlists
- Allow users to create new playlists within the app
- Save playlists as M3U files in a designated directory (e.g., `/music/Playlists/` or a separate persistent volume)
- Support: create, rename, delete playlists; add/remove/reorder tracks

## UI Requirements

- **Design**: Minimalist and clean aesthetic
- **Responsive**: Should work well on desktop and tablet browsers
- **Key screens/views**:
  1. **Now Playing**: Main view showing current track, album art, playback controls, volume
  2. **Queue**: View and manage upcoming tracks
  3. **Browse**: 
     - Browse by Artist → Albums → Tracks
     - Browse by Album → Tracks
     - Browse Playlists
  4. **Search**: Search across artists, albums, and tracks
  5. **Speakers**: View discovered Sonos devices, create/modify groups, select active speaker/group
  
- **Playback options**: For any track, album, artist, or playlist, offer:
  - "Play Now" - Clear queue and play immediately
  - "Play Next" - Insert after currently playing track  
  - "Add to Queue" - Append to end of queue

## Docker Configuration

Create a Dockerfile and docker-compose.yml suitable for Synology Container Manager:
```yaml
# Example volume mounts needed:
volumes:
  - /volume1/Family/Music:/music:ro          # SMB music library (read-only)
  - /volume1/docker/sonos-controller:/data   # Persistent storage (DB, user playlists, config)
```

- Install cifs-utils in the container OR document mounting the SMB share on the Synology host and bind-mounting it into the container (simpler approach for Synology)
- Expose a single port (e.g., 3000) for the web UI
- The React app should be built and served by the Python backend in production mode
- Include health checks
- Container needs to be on the host network (or use macvlan) so Sonos devices can reach the streaming URLs

## File Structure
/backend
/app
init.py
main.py           # FastAPI/Flask app entry
sonos.py          # SoCo wrapper for Sonos control
library.py        # Music library indexing and search
streaming.py      # HTTP file server for music/art
playlists.py      # Playlist management
models.py         # SQLite models
/frontend
/src
/components
/pages
App.jsx
index.jsx
/Dockerfile
/docker-compose.yml
/supervisord.conf     # Or entrypoint script
/README.md            # Setup and usage instructions including Synology-specific steps

## Additional Notes

- Handle network errors gracefully (Sonos devices going offline, music files unavailable)
- The backend's streaming server must be reachable by Sonos—document how to find the correct host IP to configure
- For large libraries, consider paginated browsing and background indexing
- The app should work immediately after container start even if indexing is still in progress (show progress indicator)
