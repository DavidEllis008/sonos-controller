import asyncio
import os
from datetime import datetime
from pathlib import Path
from typing import Optional

import mutagen
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .models import Track, Playlist, PlaylistEntry, IndexStatus, async_session

# Supported audio formats
AUDIO_EXTENSIONS = {".mp3", ".m4a", ".wav", ".flac"}
PLAYLIST_EXTENSIONS = {".m3u", ".m3u8"}
ART_FILENAMES = {"folder.jpg", "Folder.jpg", "cover.jpg", "Cover.jpg", "folder.png", "cover.png"}


async def start_background_index(force: bool = False):
    """Start background indexing of the music library."""
    async with async_session() as session:
        # Check if already running
        result = await session.execute(
            select(IndexStatus)
            .where(IndexStatus.status == "running")
            .limit(1)
        )
        if result.scalar_one_or_none() and not force:
            print("Indexing already in progress")
            return

        # Create new status record
        status = IndexStatus(
            status="running",
            started_at=datetime.utcnow(),
            total_files=0,
            processed_files=0,
        )
        session.add(status)
        await session.commit()
        await session.refresh(status)

        try:
            await index_library(session, status)
            status.status = "completed"
            status.completed_at = datetime.utcnow()
        except Exception as e:
            status.status = "error"
            status.error_message = str(e)
            print(f"Indexing error: {e}")
        finally:
            await session.commit()


async def index_library(session: AsyncSession, status: IndexStatus):
    """Index all music files in the library."""
    music_path = Path(settings.music_path)

    if not music_path.exists():
        raise Exception(f"Music path does not exist: {music_path}")

    # Count total files first
    print("Counting files...")
    total_files = 0
    for root, dirs, files in os.walk(music_path):
        for f in files:
            ext = Path(f).suffix.lower()
            if ext in AUDIO_EXTENSIONS or ext in PLAYLIST_EXTENSIONS:
                total_files += 1

    status.total_files = total_files
    await session.commit()
    print(f"Found {total_files} files to index")

    # Clear existing data if force reindex
    await session.execute(delete(Track))
    await session.execute(delete(PlaylistEntry))
    await session.execute(delete(Playlist).where(Playlist.is_user_created == False))
    await session.commit()

    # Index files
    processed = 0
    batch_size = 100
    tracks_batch = []
    playlists_to_process = []

    for root, dirs, files in os.walk(music_path):
        root_path = Path(root)
        rel_root = root_path.relative_to(music_path)

        # Check for folder art
        folder_art = None
        for art_name in ART_FILENAMES:
            art_path = root_path / art_name
            if art_path.exists():
                folder_art = str(rel_root / art_name)
                break

        for filename in files:
            file_path = root_path / filename
            rel_path = str(rel_root / filename)
            ext = Path(filename).suffix.lower()

            if ext in AUDIO_EXTENSIONS:
                track = await process_audio_file(file_path, rel_path, folder_art)
                if track:
                    tracks_batch.append(track)

            elif ext in PLAYLIST_EXTENSIONS:
                playlists_to_process.append((file_path, rel_path))

            processed += 1
            status.processed_files = processed

            # Commit in batches
            if len(tracks_batch) >= batch_size:
                session.add_all(tracks_batch)
                await session.commit()
                tracks_batch = []
                print(f"Indexed {processed}/{total_files} files...")

    # Commit remaining tracks
    if tracks_batch:
        session.add_all(tracks_batch)
        await session.commit()

    # Process playlists after tracks are indexed
    for playlist_path, rel_path in playlists_to_process:
        await process_playlist_file(session, playlist_path, rel_path)

    print(f"Indexing complete: {processed} files processed")


async def process_audio_file(
    file_path: Path, rel_path: str, folder_art: Optional[str]
) -> Optional[Track]:
    """Process a single audio file and extract metadata."""
    try:
        stat = file_path.stat()
        audio = mutagen.File(file_path)

        if audio is None:
            return None

        # Extract metadata
        title = None
        artist = None
        album = None
        album_artist = None
        track_number = None
        disc_number = None
        duration = None
        year = None
        genre = None
        has_embedded_art = False

        if audio:
            duration = audio.info.length if hasattr(audio.info, "length") else None

            tags = audio.tags if hasattr(audio, "tags") else audio

            if tags:
                # Try different tag formats
                title = _get_tag(tags, ["TIT2", "title", "\xa9nam", "Title"])
                artist = _get_tag(tags, ["TPE1", "artist", "\xa9ART", "Artist"])
                album = _get_tag(tags, ["TALB", "album", "\xa9alb", "Album"])
                album_artist = _get_tag(tags, ["TPE2", "albumartist", "aART"])
                genre = _get_tag(tags, ["TCON", "genre", "\xa9gen", "Genre"])

                # Track number
                track_str = _get_tag(tags, ["TRCK", "tracknumber", "trkn"])
                if track_str:
                    if isinstance(track_str, tuple):
                        track_number = track_str[0]
                    elif "/" in str(track_str):
                        track_number = int(str(track_str).split("/")[0])
                    else:
                        try:
                            track_number = int(track_str)
                        except (ValueError, TypeError):
                            pass

                # Disc number
                disc_str = _get_tag(tags, ["TPOS", "discnumber", "disk"])
                if disc_str:
                    if isinstance(disc_str, tuple):
                        disc_number = disc_str[0]
                    elif "/" in str(disc_str):
                        disc_number = int(str(disc_str).split("/")[0])
                    else:
                        try:
                            disc_number = int(disc_str)
                        except (ValueError, TypeError):
                            pass

                # Year
                year_str = _get_tag(tags, ["TDRC", "date", "\xa9day", "Year"])
                if year_str:
                    try:
                        year = int(str(year_str)[:4])
                    except (ValueError, TypeError):
                        pass

                # Check for embedded art
                has_embedded_art = _has_embedded_art(audio, tags)

        # Fallback to path-based metadata
        if not title:
            title = file_path.stem

        if not artist or not album:
            path_parts = Path(rel_path).parts
            if len(path_parts) >= 3:
                # Artist/Album/Track structure
                if not artist:
                    artist = path_parts[-3]
                if not album:
                    album = path_parts[-2]
            elif len(path_parts) >= 2:
                # Artist/Track structure
                if not artist:
                    artist = path_parts[-2]

        return Track(
            file_path=rel_path,
            title=title,
            artist=artist,
            album=album,
            album_artist=album_artist,
            track_number=track_number,
            disc_number=disc_number,
            duration=duration,
            year=year,
            genre=genre,
            has_embedded_art=has_embedded_art,
            has_folder_art=folder_art is not None,
            folder_art_path=folder_art,
            file_size=stat.st_size,
            file_format=file_path.suffix.lower().lstrip("."),
            last_modified=datetime.fromtimestamp(stat.st_mtime),
        )

    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return None


def _get_tag(tags, keys: list) -> Optional[str]:
    """Get a tag value trying multiple key names."""
    for key in keys:
        try:
            if hasattr(tags, "get"):
                val = tags.get(key)
            elif hasattr(tags, "__getitem__"):
                try:
                    val = tags[key]
                except (KeyError, IndexError):
                    continue
            else:
                continue

            if val:
                if isinstance(val, list):
                    val = val[0]
                if hasattr(val, "text"):
                    return str(val.text[0]) if val.text else None
                return str(val)
        except Exception:
            continue
    return None


def _has_embedded_art(audio, tags) -> bool:
    """Check if audio file has embedded album art."""
    try:
        # FLAC, OGG
        if hasattr(audio, "pictures") and audio.pictures:
            return True

        # ID3 (MP3)
        if hasattr(tags, "getall"):
            if tags.getall("APIC"):
                return True

        # MP4/M4A
        if tags and "covr" in tags:
            return True

        return False
    except Exception:
        return False


async def process_playlist_file(session: AsyncSession, file_path: Path, rel_path: str):
    """Process an M3U playlist file."""
    try:
        name = file_path.stem

        playlist = Playlist(
            name=name,
            file_path=rel_path,
            is_user_created=False,
        )
        session.add(playlist)
        await session.flush()

        # Parse M3U file
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = f.readlines()

        position = 0
        playlist_dir = file_path.parent

        for line in lines:
            line = line.strip()

            # Skip comments and extended info
            if not line or line.startswith("#"):
                continue

            # Resolve relative paths
            if not os.path.isabs(line):
                track_path = (playlist_dir / line).resolve()
                try:
                    rel_track_path = str(track_path.relative_to(Path(settings.music_path)))
                except ValueError:
                    rel_track_path = line
            else:
                rel_track_path = line

            # Try to find matching track in database
            result = await session.execute(
                select(Track).where(Track.file_path == rel_track_path)
            )
            track = result.scalar_one_or_none()

            entry = PlaylistEntry(
                playlist_id=playlist.id,
                track_id=track.id if track else None,
                track_path=rel_track_path,
                position=position,
            )
            session.add(entry)
            position += 1

        await session.commit()
        print(f"Imported playlist: {name} ({position} tracks)")

    except Exception as e:
        print(f"Error processing playlist {file_path}: {e}")
