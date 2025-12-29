import { useStore } from '../store'

function PlayerBar() {
  const {
    nowPlaying,
    isPlaying,
    play,
    pause,
    next,
    previous,
    setVolume,
    getActiveDevice,
  } = useStore()

  const device = getActiveDevice()

  const formatTime = (timeStr) => {
    if (!timeStr) return '0:00'
    const parts = timeStr.split(':')
    if (parts.length === 3) {
      const hours = parseInt(parts[0])
      const mins = parseInt(parts[1])
      const secs = parseInt(parts[2])
      if (hours > 0) return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }
    return timeStr
  }

  const getProgress = () => {
    if (!nowPlaying?.position || !nowPlaying?.duration) return 0
    const parseTime = (t) => {
      const parts = t.split(':').map(Number)
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
      return parts[0] * 60 + parts[1]
    }
    const pos = parseTime(nowPlaying.position)
    const dur = parseTime(nowPlaying.duration)
    return dur > 0 ? (pos / dur) * 100 : 0
  }

  return (
    <div className="player-bar">
      <div className="player-track">
        <div className="album-art album-art-sm">
          {nowPlaying?.album_art ? (
            <img src={nowPlaying.album_art} alt="" />
          ) : (
            <div className="album-art-placeholder">
              <MusicIcon />
            </div>
          )}
        </div>
        <div className="player-track-info">
          <div className="player-track-title">
            {nowPlaying?.title || 'Not playing'}
          </div>
          <div className="player-track-artist">
            {nowPlaying?.artist || '—'}
          </div>
        </div>
      </div>

      <div className="player-controls">
        <div className="player-buttons">
          <button className="btn btn-icon btn-icon-sm btn-secondary" onClick={previous}>
            <PreviousIcon />
          </button>
          <button className="btn btn-icon btn-primary" onClick={isPlaying ? pause : play}>
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button className="btn btn-icon btn-icon-sm btn-secondary" onClick={next}>
            <NextIcon />
          </button>
        </div>
        <div className="player-progress">
          <span className="player-progress-time">{formatTime(nowPlaying?.position)}</span>
          <div className="player-progress-bar">
            <div className="player-progress-fill" style={{ width: `${getProgress()}%` }} />
          </div>
          <span className="player-progress-time">{formatTime(nowPlaying?.duration)}</span>
        </div>
      </div>

      <div className="player-volume">
        <VolumeIcon />
        <input
          type="range"
          className="volume-slider"
          min="0"
          max="100"
          defaultValue={device?.volume || 50}
          onChange={(e) => setVolume(parseInt(e.target.value))}
        />
      </div>
    </div>
  )
}

// Icons
function MusicIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z"/>
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
    </svg>
  )
}

function PreviousIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
    </svg>
  )
}

function NextIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 18l8.5-6L6 6v12zm2-12v12l6.5-6L8 6zm8 0v12h2V6h-2z"/>
    </svg>
  )
}

function VolumeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
    </svg>
  )
}

export default PlayerBar
