from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, distinct
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Track, IndexStatus, get_session
from ..config import settings

router = APIRouter()


@router.get("/status")
async def get_index_status(session: AsyncSession = Depends(get_session)):
    """Get the current indexing status."""
    result = await session.execute(
        select(IndexStatus).order_by(IndexStatus.id.desc()).limit(1)
    )
    status = result.scalar_one_or_none()

    if not status:
        return {"status": "idle", "total_files": 0, "processed_files": 0}

    return {
        "status": status.status,
        "started_at": status.started_at.isoformat() if status.started_at else None,
        "completed_at": status.completed_at.isoformat() if status.completed_at else None,
        "total_files": status.total_files,
        "processed_files": status.processed_files,
        "error_message": status.error_message,
    }


@router.post("/reindex")
async def trigger_reindex():
    """Trigger a library re-index."""
    from ..library import start_background_index
    import asyncio

    asyncio.create_task(start_background_index(force=True))
    return {"status": "indexing_started"}


@router.get("/stats")
async def get_library_stats(session: AsyncSession = Depends(get_session)):
    """Get library statistics."""
    # Count tracks
    track_count = await session.execute(select(func.count(Track.id)))

    # Count unique artists
    artist_count = await session.execute(
        select(func.count(distinct(Track.artist))).where(Track.artist.isnot(None))
    )

    # Count unique albums
    album_count = await session.execute(
        select(func.count(distinct(Track.album))).where(Track.album.isnot(None))
    )

    # Total duration
    total_duration = await session.execute(
        select(func.sum(Track.duration)).where(Track.duration.isnot(None))
    )

    return {
        "tracks": track_count.scalar() or 0,
        "artists": artist_count.scalar() or 0,
        "albums": album_count.scalar() or 0,
        "total_duration": total_duration.scalar() or 0,
    }


@router.get("/artists")
async def get_artists(
    session: AsyncSession = Depends(get_session),
    limit: int = Query(100, le=500),
    offset: int = 0,
    search: Optional[str] = None,
):
    """Get list of artists."""
    query = (
        select(Track.artist, func.count(Track.id).label("track_count"))
        .where(Track.artist.isnot(None))
        .group_by(Track.artist)
        .order_by(Track.artist)
    )

    if search:
        query = query.where(Track.artist.ilike(f"%{search}%"))

    query = query.offset(offset).limit(limit)
    result = await session.execute(query)

    artists = [{"name": row.artist, "track_count": row.track_count} for row in result]
    return {"artists": artists}


@router.get("/artists/{artist}/albums")
async def get_artist_albums(
    artist: str,
    session: AsyncSession = Depends(get_session),
):
    """Get albums by an artist."""
    query = (
        select(
            Track.album,
            Track.album_artist,
            func.count(Track.id).label("track_count"),
            func.min(Track.year).label("year"),
        )
        .where(Track.artist == artist)
        .group_by(Track.album, Track.album_artist)
        .order_by(Track.year, Track.album)
    )

    result = await session.execute(query)

    albums = []
    for row in result:
        albums.append({
            "name": row.album or "Unknown Album",
            "artist": artist,
            "album_artist": row.album_artist,
            "track_count": row.track_count,
            "year": row.year,
        })

    return {"albums": albums, "artist": artist}


@router.get("/albums")
async def get_albums(
    session: AsyncSession = Depends(get_session),
    limit: int = Query(100, le=500),
    offset: int = 0,
    search: Optional[str] = None,
):
    """Get list of albums."""
    query = (
        select(
            Track.album,
            Track.artist,
            Track.album_artist,
            func.count(Track.id).label("track_count"),
            func.min(Track.year).label("year"),
        )
        .where(Track.album.isnot(None))
        .group_by(Track.album, Track.artist, Track.album_artist)
        .order_by(Track.album)
    )

    if search:
        query = query.where(Track.album.ilike(f"%{search}%"))

    query = query.offset(offset).limit(limit)
    result = await session.execute(query)

    albums = []
    for row in result:
        albums.append({
            "name": row.album,
            "artist": row.artist or row.album_artist,
            "track_count": row.track_count,
            "year": row.year,
        })

    return {"albums": albums}


@router.get("/albums/{album}/tracks")
async def get_album_tracks(
    album: str,
    artist: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
    """Get tracks in an album."""
    query = (
        select(Track)
        .where(Track.album == album)
        .order_by(Track.disc_number, Track.track_number, Track.title)
    )

    if artist:
        query = query.where(Track.artist == artist)

    result = await session.execute(query)
    tracks = result.scalars().all()

    return {
        "album": album,
        "artist": artist,
        "tracks": [_track_to_dict(t) for t in tracks],
    }


@router.get("/tracks")
async def get_tracks(
    session: AsyncSession = Depends(get_session),
    limit: int = Query(100, le=500),
    offset: int = 0,
    search: Optional[str] = None,
    artist: Optional[str] = None,
    album: Optional[str] = None,
):
    """Get tracks with optional filtering."""
    query = select(Track).order_by(Track.artist, Track.album, Track.track_number)

    if search:
        query = query.where(
            Track.title.ilike(f"%{search}%")
            | Track.artist.ilike(f"%{search}%")
            | Track.album.ilike(f"%{search}%")
        )

    if artist:
        query = query.where(Track.artist == artist)

    if album:
        query = query.where(Track.album == album)

    query = query.offset(offset).limit(limit)
    result = await session.execute(query)
    tracks = result.scalars().all()

    return {"tracks": [_track_to_dict(t) for t in tracks]}


@router.get("/tracks/{track_id}")
async def get_track(track_id: int, session: AsyncSession = Depends(get_session)):
    """Get a specific track by ID."""
    result = await session.execute(select(Track).where(Track.id == track_id))
    track = result.scalar_one_or_none()

    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    return _track_to_dict(track)


@router.get("/search")
async def search_library(
    q: str,
    session: AsyncSession = Depends(get_session),
    limit: int = Query(20, le=100),
):
    """Search across artists, albums, and tracks."""
    search_term = f"%{q}%"

    # Search artists
    artist_query = (
        select(Track.artist)
        .where(Track.artist.ilike(search_term))
        .distinct()
        .limit(limit)
    )
    artist_result = await session.execute(artist_query)
    artists = [row[0] for row in artist_result if row[0]]

    # Search albums
    album_query = (
        select(Track.album, Track.artist)
        .where(Track.album.ilike(search_term))
        .distinct()
        .limit(limit)
    )
    album_result = await session.execute(album_query)
    albums = [{"name": row[0], "artist": row[1]} for row in album_result if row[0]]

    # Search tracks
    track_query = (
        select(Track)
        .where(Track.title.ilike(search_term))
        .limit(limit)
    )
    track_result = await session.execute(track_query)
    tracks = [_track_to_dict(t) for t in track_result.scalars()]

    return {
        "artists": artists,
        "albums": albums,
        "tracks": tracks,
    }


def _track_to_dict(track: Track) -> dict:
    """Convert a Track to a dictionary with stream URLs."""
    stream_url = f"{settings.stream_base_url}/stream/{track.file_path}"
    art_url = None

    if track.has_embedded_art:
        art_url = f"{settings.stream_base_url}/stream/art/embedded/{track.id}"
    elif track.has_folder_art and track.folder_art_path:
        art_url = f"{settings.stream_base_url}/stream/art/{track.folder_art_path}"

    return {
        "id": track.id,
        "title": track.title,
        "artist": track.artist,
        "album": track.album,
        "album_artist": track.album_artist,
        "track_number": track.track_number,
        "disc_number": track.disc_number,
        "duration": track.duration,
        "year": track.year,
        "genre": track.genre,
        "file_path": track.file_path,
        "stream_url": stream_url,
        "art_url": art_url,
        "file_format": track.file_format,
    }
