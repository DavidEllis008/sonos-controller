from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import soco
from soco import SoCo
from soco.exceptions import SoCoException

router = APIRouter()

# Cache discovered devices
_devices: dict[str, SoCo] = {}


class VolumeRequest(BaseModel):
    volume: int


class GroupRequest(BaseModel):
    coordinator_uid: str
    member_uids: list[str]


class PlayUriRequest(BaseModel):
    uri: str
    title: Optional[str] = None
    artist: Optional[str] = None
    album: Optional[str] = None
    album_art_uri: Optional[str] = None


def _discover_devices() -> dict[str, SoCo]:
    """Discover all Sonos devices on the network."""
    global _devices
    try:
        devices = soco.discover(timeout=5, include_invisible=True, allow_network_scan=True)
        if devices:
            _devices = {d.uid: d for d in devices}
        else:
            print("no sonos devices found")
    except Exception as e:
        print(f"Error discovering Sonos devices: {e}")
        _devices = soco.discover()
    return _devices


def _get_device(uid: str) -> SoCo:
    """Get a Sonos device by UID."""
    if uid not in _devices:
        _discover_devices()
    if uid not in _devices:
        raise HTTPException(status_code=404, detail=f"Device {uid} not found")
    return _devices[uid]


def _device_to_dict(device: SoCo) -> dict:
    """Convert a SoCo device to a dictionary."""
    try:
        group = device.group
        coordinator = group.coordinator if group else device
        members = [m.uid for m in group.members] if group else [device.uid]

        return {
            "uid": device.uid,
            "name": device.player_name,
            "ip": device.ip_address,
            "is_coordinator": device.uid == coordinator.uid,
            "coordinator_uid": coordinator.uid,
            "group_members": members,
            "volume": device.volume,
            "mute": device.mute,
            "is_playing": device.get_current_transport_info().get("current_transport_state") == "PLAYING",
        }
    except Exception as e:
        return {
            "uid": device.uid,
            "name": device.player_name,
            "ip": device.ip_address,
            "error": str(e),
        }


def _get_track_info(device: SoCo) -> dict:
    """Get current track information."""
    try:
        info = device.get_current_track_info()
        transport = device.get_current_transport_info()

        return {
            "title": info.get("title", ""),
            "artist": info.get("artist", ""),
            "album": info.get("album", ""),
            "album_art": info.get("album_art", ""),
            "duration": info.get("duration", "0:00:00"),
            "position": info.get("position", "0:00:00"),
            "uri": info.get("uri", ""),
            "transport_state": transport.get("current_transport_state", "STOPPED"),
        }
    except Exception as e:
        return {"error": str(e)}


@router.get("/devices")
async def get_devices():
    """Discover and return all Sonos devices."""
    devices = _discover_devices()
    return {"devices": [_device_to_dict(d) for d in devices.values()]}


@router.get("/devices/{uid}")
async def get_device(uid: str):
    """Get a specific Sonos device."""
    device = _get_device(uid)
    return _device_to_dict(device)


@router.get("/devices/{uid}/now-playing")
async def get_now_playing(uid: str):
    """Get current track info for a device."""
    device = _get_device(uid)
    # Get coordinator for grouped speakers
    if device.group:
        device = device.group.coordinator
    return _get_track_info(device)


@router.post("/devices/{uid}/play")
async def play(uid: str):
    """Start playback on a device."""
    device = _get_device(uid)
    try:
        device.play()
        return {"status": "playing"}
    except SoCoException as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/devices/{uid}/pause")
async def pause(uid: str):
    """Pause playback on a device."""
    device = _get_device(uid)
    try:
        device.pause()
        return {"status": "paused"}
    except SoCoException as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/devices/{uid}/stop")
async def stop(uid: str):
    """Stop playback on a device."""
    device = _get_device(uid)
    try:
        device.stop()
        return {"status": "stopped"}
    except SoCoException as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/devices/{uid}/next")
async def next_track(uid: str):
    """Skip to next track."""
    device = _get_device(uid)
    try:
        device.next()
        return {"status": "next"}
    except SoCoException as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/devices/{uid}/previous")
async def previous_track(uid: str):
    """Skip to previous track."""
    device = _get_device(uid)
    try:
        device.previous()
        return {"status": "previous"}
    except SoCoException as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/devices/{uid}/volume")
async def set_volume(uid: str, request: VolumeRequest):
    """Set volume for a device."""
    device = _get_device(uid)
    try:
        device.volume = max(0, min(100, request.volume))
        return {"volume": device.volume}
    except SoCoException as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/devices/{uid}/mute")
async def toggle_mute(uid: str):
    """Toggle mute for a device."""
    device = _get_device(uid)
    try:
        device.mute = not device.mute
        return {"mute": device.mute}
    except SoCoException as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/devices/{uid}/queue")
async def get_queue(uid: str, start: int = 0, count: int = 50):
    """Get the current queue for a device."""
    device = _get_device(uid)
    try:
        queue = device.get_queue(start=start, max_items=count)
        items = []
        for item in queue:
            items.append({
                "title": item.title,
                "artist": item.creator,
                "album": item.album,
                "album_art": item.album_art_uri,
                "uri": item.resources[0].uri if item.resources else "",
            })
        return {
            "queue": items,
            "total": len(device.get_queue()),
            "start": start,
        }
    except SoCoException as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/devices/{uid}/queue/clear")
async def clear_queue(uid: str):
    """Clear the queue for a device."""
    device = _get_device(uid)
    try:
        device.clear_queue()
        return {"status": "cleared"}
    except SoCoException as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/devices/{uid}/play-uri")
async def play_uri(uid: str, request: PlayUriRequest):
    """Play a URI on a device (clears queue and plays)."""
    device = _get_device(uid)
    try:
        device.clear_queue()
        device.add_uri_to_queue(request.uri)
        device.play_from_queue(0)
        return {"status": "playing", "uri": request.uri}
    except SoCoException as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/devices/{uid}/add-to-queue")
async def add_to_queue(uid: str, request: PlayUriRequest):
    """Add a URI to the end of the queue."""
    device = _get_device(uid)
    try:
        position = device.add_uri_to_queue(request.uri)
        return {"status": "added", "position": position}
    except SoCoException as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/devices/{uid}/play-next")
async def play_next(uid: str, request: PlayUriRequest):
    """Add a URI to play next (after current track)."""
    device = _get_device(uid)
    try:
        # Get current queue position
        track_info = device.get_current_track_info()
        current_pos = int(track_info.get("playlist_position", 0))
        position = device.add_uri_to_queue(request.uri, position=current_pos + 1)
        return {"status": "added", "position": position}
    except SoCoException as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/group")
async def create_group(request: GroupRequest):
    """Group speakers together."""
    coordinator = _get_device(request.coordinator_uid)
    try:
        for member_uid in request.member_uids:
            if member_uid != request.coordinator_uid:
                member = _get_device(member_uid)
                member.join(coordinator)
        return {"status": "grouped"}
    except SoCoException as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/devices/{uid}/ungroup")
async def ungroup(uid: str):
    """Remove a device from its group."""
    device = _get_device(uid)
    try:
        device.unjoin()
        return {"status": "ungrouped"}
    except SoCoException as e:
        raise HTTPException(status_code=400, detail=str(e))
