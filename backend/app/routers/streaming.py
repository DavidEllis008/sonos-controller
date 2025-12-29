import os
import mimetypes
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import FileResponse, Response, StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import mutagen

from ..config import settings
from ..models import Track, get_session

router = APIRouter()

# MIME types for supported formats
MIME_TYPES = {
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".wav": "audio/wav",
    ".flac": "audio/flac",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
}


def get_mime_type(file_path: str) -> str:
    """Get MIME type for a file."""
    ext = Path(file_path).suffix.lower()
    return MIME_TYPES.get(ext, mimetypes.guess_type(file_path)[0] or "application/octet-stream")


@router.get("/{file_path:path}")
async def stream_file(file_path: str, request: Request):
    """Stream a music file with range request support."""
    # Security: ensure path doesn't escape music directory
    full_path = Path(settings.music_path) / file_path
    try:
        full_path = full_path.resolve()
        if not str(full_path).startswith(str(Path(settings.music_path).resolve())):
            raise HTTPException(status_code=403, detail="Access denied")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid path")

    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    if not full_path.is_file():
        raise HTTPException(status_code=400, detail="Not a file")

    file_size = full_path.stat().st_size
    mime_type = get_mime_type(str(full_path))

    # Handle range requests for seeking
    range_header = request.headers.get("range")

    if range_header:
        return _range_response(full_path, file_size, mime_type, range_header)

    return FileResponse(
        full_path,
        media_type=mime_type,
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
        },
    )


def _range_response(
    file_path: Path, file_size: int, mime_type: str, range_header: str
) -> StreamingResponse:
    """Handle HTTP range requests for seeking support."""
    try:
        range_spec = range_header.replace("bytes=", "")
        start_str, end_str = range_spec.split("-")

        start = int(start_str) if start_str else 0
        end = int(end_str) if end_str else file_size - 1

        # Clamp values
        start = max(0, start)
        end = min(file_size - 1, end)

        if start > end:
            raise HTTPException(status_code=416, detail="Invalid range")

        content_length = end - start + 1

        def iter_file():
            with open(file_path, "rb") as f:
                f.seek(start)
                remaining = content_length
                chunk_size = 65536  # 64KB chunks

                while remaining > 0:
                    chunk = f.read(min(chunk_size, remaining))
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk

        return StreamingResponse(
            iter_file(),
            status_code=206,
            media_type=mime_type,
            headers={
                "Accept-Ranges": "bytes",
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Content-Length": str(content_length),
            },
        )

    except ValueError:
        raise HTTPException(status_code=416, detail="Invalid range format")


@router.get("/art/embedded/{track_id}")
async def get_embedded_art(track_id: int, session: AsyncSession = Depends(get_session)):
    """Get embedded album art from a track's metadata."""
    result = await session.execute(select(Track).where(Track.id == track_id))
    track = result.scalar_one_or_none()

    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    if not track.has_embedded_art:
        raise HTTPException(status_code=404, detail="No embedded art")

    full_path = Path(settings.music_path) / track.file_path

    if not full_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    try:
        audio = mutagen.File(full_path)

        # Try different tag formats for embedded art
        art_data = None
        mime_type = "image/jpeg"

        if hasattr(audio, "pictures") and audio.pictures:
            # FLAC, OGG
            art_data = audio.pictures[0].data
            mime_type = audio.pictures[0].mime

        elif hasattr(audio, "tags"):
            tags = audio.tags

            # ID3 (MP3)
            if hasattr(tags, "getall"):
                apic_frames = tags.getall("APIC")
                if apic_frames:
                    art_data = apic_frames[0].data
                    mime_type = apic_frames[0].mime

            # MP4/M4A
            elif "covr" in tags:
                covers = tags["covr"]
                if covers:
                    art_data = bytes(covers[0])
                    # MP4 cover format
                    if hasattr(covers[0], "imageformat"):
                        fmt = covers[0].imageformat
                        if fmt == 13:  # JPEG
                            mime_type = "image/jpeg"
                        elif fmt == 14:  # PNG
                            mime_type = "image/png"

        if not art_data:
            raise HTTPException(status_code=404, detail="Could not extract art")

        return Response(content=art_data, media_type=mime_type)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting art: {e}")


@router.get("/art/{art_path:path}")
async def get_folder_art(art_path: str):
    """Get folder-based album art."""
    full_path = Path(settings.music_path) / art_path

    try:
        full_path = full_path.resolve()
        if not str(full_path).startswith(str(Path(settings.music_path).resolve())):
            raise HTTPException(status_code=403, detail="Access denied")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid path")

    if not full_path.exists():
        raise HTTPException(status_code=404, detail="Art not found")

    return FileResponse(full_path, media_type=get_mime_type(str(full_path)))
