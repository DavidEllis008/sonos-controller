import { useStore } from '../store'

function NowPlaying() {
  const { nowPlaying, isPlaying, play, pause, next, previous, queue } = useStore()

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

  return (
    <div className="now-playing-container">
      <div className="now-playing-main">
        <div className="album-art album-art-lg">
          {nowPlaying?.album_art ? (
            <img src={nowPlaying.album_art} alt="" />
          ) : (
            <div className="album-art-placeholder" style={{ fontSize: 48 }}>
              <MusicIcon />
            </div>
          )}
        </div>

        <div className="now-playing-info">
          <h1 className="now-playing-title">
            {nowPlaying?.title || 'Not playing'}
          </h1>
          <p className="now-playing-artist">
            {nowPlaying?.artist || '—'}
          </p>
          <p className="now-playing-album">
            {nowPlaying?.album || ''}
          </p>

          <div className="now-playing-controls">
            <button className="btn btn-icon btn-secondary" onClick={previous}>
              <PreviousIcon />
            </button>
            <button
              className="btn btn-icon btn-primary"
              style={{ width: 56, height: 56 }}
              onClick={isPlaying ? pause : play}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button className="btn btn-icon btn-secondary" onClick={next}>
              <NextIcon />
            </button>
          </div>

          <div className="now-playing-progress">
            <span>{formatTime(nowPlaying?.position)}</span>
            <div className="now-playing-progress-bar">
              <div
                className="now-playing-progress-fill"
                style={{ width: `${getProgress(nowPlaying)}%` }}
              />
            </div>
            <span>{formatTime(nowPlaying?.duration)}</span>
          </div>
        </div>
      </div>

      {queue.length > 0 && (
        <div className="up-next-section">
          <h2 className="up-next-title">Up Next</h2>
          <div className="track-list">
            {queue.slice(0, 5).map((track, index) => (
              <div key={index} className="list-item">
                <div className="album-art album-art-sm">
                  {track.album_art ? (
                    <img src={track.album_art} alt="" />
                  ) : (
                    <div className="album-art-placeholder">
                      <MusicIcon size={16} />
                    </div>
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {track.artist}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function getProgress(nowPlaying) {
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

function MusicIcon({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z"/>
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
    </svg>
  )
}

function PreviousIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
    </svg>
  )
}

function NextIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 18l8.5-6L6 6v12zm2-12v12l6.5-6L8 6zm8 0v12h2V6h-2z"/>
    </svg>
  )
}

export default NowPlaying
