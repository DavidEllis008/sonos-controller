from pathlib import Path
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Playlist, PlaylistEntry, Track, get_session
from ..config import settings

router = APIRouter()


class CreatePlaylistRequest(BaseModel):
    name: str


class RenamePlaylistRequest(BaseModel):
    name: str


class AddTrackRequest(BaseModel):
    track_id: int
    position: Optional[int] = None


class ReorderRequest(BaseModel):
    track_ids: list[int]


@router.get("/")
async def get_playlists(session: AsyncSession = Depends(get_session)):
    """Get all playlists."""
    result = await session.execute(
        select(Playlist).order_by(Playlist.name)
    )
    playlists = result.scalars().all()

    items = []
    for p in playlists:
        # Count entries
        entry_count = await session.execute(
            select(PlaylistEntry).where(PlaylistEntry.playlist_id == p.id)
        )
        count = len(entry_count.scalars().all())

        items.append({
            "id": p.id,
            "name": p.name,
            "track_count": count,
            "is_user_created": p.is_user_created,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        })

    return {"playlists": items}


@router.post("/")
async def create_playlist(
    request: CreatePlaylistRequest,
    session: AsyncSession = Depends(get_session),
):
    """Create a new playlist."""
    playlist = Playlist(
        name=request.name,
        is_user_created=True,
    )
    session.add(playlist)
    await session.commit()
    await session.refresh(playlist)

    return {
        "id": playlist.id,
        "name": playlist.name,
        "track_count": 0,
        "is_user_created": True,
    }


@router.get("/{playlist_id}")
async def get_playlist(playlist_id: int, session: AsyncSession = Depends(get_session)):
    """Get a playlist with its tracks."""
    result = await session.execute(
        select(Playlist).where(Playlist.id == playlist_id)
    )
    playlist = result.scalar_one_or_none()

    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    # Get entries with tracks
    entries_result = await session.execute(
        select(PlaylistEntry)
        .where(PlaylistEntry.playlist_id == playlist_id)
        .order_by(PlaylistEntry.position)
    )
    entries = entries_result.scalars().all()

    tracks = []
    for entry in entries:
        if entry.track_id:
            track_result = await session.execute(
                select(Track).where(Track.id == entry.track_id)
            )
            track = track_result.scalar_one_or_none()
            if track:
                tracks.append(_track_to_dict(track, entry.position))
        elif entry.track_path:
            # Unresolved track from M3U
            tracks.append({
                "id": None,
                "title": Path(entry.track_path).stem,
                "artist": None,
                "album": None,
                "position": entry.position,
                "unresolved_path": entry.track_path,
            })

    return {
        "id": playlist.id,
        "name": playlist.name,
        "is_user_created": playlist.is_user_created,
        "tracks": tracks,
    }


@router.put("/{playlist_id}")
async def rename_playlist(
    playlist_id: int,
    request: RenamePlaylistRequest,
    session: AsyncSession = Depends(get_session),
):
    """Rename a playlist."""
    result = await session.execute(
        select(Playlist).where(Playlist.id == playlist_id)
    )
    playlist = result.scalar_one_or_none()

    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    playlist.name = request.name
    playlist.updated_at = datetime.utcnow()
    await session.commit()

    return {"id": playlist.id, "name": playlist.name}


@router.delete("/{playlist_id}")
async def delete_playlist(playlist_id: int, session: AsyncSession = Depends(get_session)):
    """Delete a playlist."""
    result = await session.execute(
        select(Playlist).where(Playlist.id == playlist_id)
    )
    playlist = result.scalar_one_or_none()

    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    # Delete M3U file if it exists
    if playlist.file_path:
        m3u_path = Path(settings.data_path) / "playlists" / playlist.file_path
        if m3u_path.exists():
            m3u_path.unlink()

    await session.delete(playlist)
    await session.commit()

    return {"status": "deleted"}


@router.post("/{playlist_id}/tracks")
async def add_track_to_playlist(
    playlist_id: int,
    request: AddTrackRequest,
    session: AsyncSession = Depends(get_session),
):
    """Add a track to a playlist."""
    # Verify playlist exists
    playlist_result = await session.execute(
        select(Playlist).where(Playlist.id == playlist_id)
    )
    playlist = playlist_result.scalar_one_or_none()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    # Verify track exists
    track_result = await session.execute(
        select(Track).where(Track.id == request.track_id)
    )
    track = track_result.scalar_one_or_none()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    # Get current max position
    max_pos_result = await session.execute(
        select(PlaylistEntry.position)
        .where(PlaylistEntry.playlist_id == playlist_id)
        .order_by(PlaylistEntry.position.desc())
        .limit(1)
    )
    max_pos = max_pos_result.scalar() or 0

    position = request.position if request.position is not None else max_pos + 1

    entry = PlaylistEntry(
        playlist_id=playlist_id,
        track_id=request.track_id,
        track_path=track.file_path,
        position=position,
    )
    session.add(entry)

    playlist.updated_at = datetime.utcnow()
    await session.commit()

    return {"status": "added", "position": position}


@router.delete("/{playlist_id}/tracks/{position}")
async def remove_track_from_playlist(
    playlist_id: int,
    position: int,
    session: AsyncSession = Depends(get_session),
):
    """Remove a track from a playlist by position."""
    result = await session.execute(
        select(PlaylistEntry)
        .where(PlaylistEntry.playlist_id == playlist_id)
        .where(PlaylistEntry.position == position)
    )
    entry = result.scalar_one_or_none()

    if not entry:
        raise HTTPException(status_code=404, detail="Track not found at position")

    await session.delete(entry)

    # Update positions for remaining entries
    remaining = await session.execute(
        select(PlaylistEntry)
        .where(PlaylistEntry.playlist_id == playlist_id)
        .where(PlaylistEntry.position > position)
        .order_by(PlaylistEntry.position)
    )
    for i, e in enumerate(remaining.scalars()):
        e.position = position + i

    # Update playlist timestamp
    playlist_result = await session.execute(
        select(Playlist).where(Playlist.id == playlist_id)
    )
    playlist = playlist_result.scalar_one_or_none()
    if playlist:
        playlist.updated_at = datetime.utcnow()

    await session.commit()

    return {"status": "removed"}


@router.put("/{playlist_id}/reorder")
async def reorder_playlist(
    playlist_id: int,
    request: ReorderRequest,
    session: AsyncSession = Depends(get_session),
):
    """Reorder tracks in a playlist."""
    # Get all entries
    result = await session.execute(
        select(PlaylistEntry).where(PlaylistEntry.playlist_id == playlist_id)
    )
    entries = {e.track_id: e for e in result.scalars()}

    # Update positions
    for i, track_id in enumerate(request.track_ids):
        if track_id in entries:
            entries[track_id].position = i

    # Update playlist timestamp
    playlist_result = await session.execute(
        select(Playlist).where(Playlist.id == playlist_id)
    )
    playlist = playlist_result.scalar_one_or_none()
    if playlist:
        playlist.updated_at = datetime.utcnow()

    await session.commit()

    return {"status": "reordered"}


@router.post("/{playlist_id}/save")
async def save_playlist_as_m3u(
    playlist_id: int,
    session: AsyncSession = Depends(get_session),
):
    """Save a playlist as an M3U file."""
    result = await session.execute(
        select(Playlist).where(Playlist.id == playlist_id)
    )
    playlist = result.scalar_one_or_none()

    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    # Get entries
    entries_result = await session.execute(
        select(PlaylistEntry)
        .where(PlaylistEntry.playlist_id == playlist_id)
        .order_by(PlaylistEntry.position)
    )
    entries = entries_result.scalars().all()

    # Create M3U content
    lines = ["#EXTM3U"]
    for entry in entries:
        if entry.track_id:
            track_result = await session.execute(
                select(Track).where(Track.id == entry.track_id)
            )
            track = track_result.scalar_one_or_none()
            if track:
                duration = int(track.duration) if track.duration else -1
                lines.append(f"#EXTINF:{duration},{track.artist} - {track.title}")
                lines.append(track.file_path)
        elif entry.track_path:
            lines.append(entry.track_path)

    # Save file
    playlists_dir = Path(settings.data_path) / "playlists"
    playlists_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{playlist.name}.m3u"
    file_path = playlists_dir / filename

    with open(file_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    # Update playlist record
    playlist.file_path = filename
    await session.commit()

    return {"status": "saved", "file": filename}


def _track_to_dict(track: Track, position: int) -> dict:
    """Convert a track to a dict for playlist display."""
    from urllib.parse import quote

    # URL-encode the file path (safe='/' keeps path separators)
    encoded_path = quote(track.file_path, safe='/')
    stream_url = f"{settings.stream_base_url}/stream/{encoded_path}"
    art_url = None

    if track.has_embedded_art:
        art_url = f"{settings.stream_base_url}/stream/art/embedded/{track.id}"
    elif track.has_folder_art and track.folder_art_path:
        encoded_art_path = quote(track.folder_art_path, safe='/')
        art_url = f"{settings.stream_base_url}/stream/art/{encoded_art_path}"
    else:
        art_url = "/generic_album.jpg"

    return {
        "id": track.id,
        "title": track.title,
        "artist": track.artist,
        "album": track.album,
        "duration": track.duration,
        "stream_url": stream_url,
        "art_url": art_url,
        "position": position,
    }
