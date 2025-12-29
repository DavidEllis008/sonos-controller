import { useStore } from '../store'

function TrackList({ tracks, showAlbum = true }) {
  const { playNow, playNext, addToQueue } = useStore()

  const formatDuration = (seconds) => {
    if (!seconds) return '—'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="track-list">
      {tracks.map((track, index) => (
        <div key={track.id || index} className="track-row">
          <span className="track-number">{track.track_number || index + 1}</span>
          <div className="track-title-cell">
            <div className="album-art album-art-sm">
              {track.art_url ? (
                <img src={track.art_url} alt="" />
              ) : (
                <div className="album-art-placeholder">
                  <MusicIcon />
                </div>
              )}
            </div>
            <div>
              <div style={{ fontWeight: 500 }}>{track.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {track.artist}
              </div>
            </div>
          </div>
          {showAlbum && (
            <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
              {track.album}
            </div>
          )}
          <span className="track-duration">{formatDuration(track.duration)}</span>
          <TrackMenu
            onPlayNow={() => playNow(track.stream_url)}
            onPlayNext={() => playNext(track.stream_url)}
            onAddToQueue={() => addToQueue(track.stream_url)}
          />
        </div>
      ))}
    </div>
  )
}

function TrackMenu({ onPlayNow, onPlayNext, onAddToQueue }) {
  return (
    <div className="track-menu" style={{ position: 'relative' }}>
      <button
        className="btn btn-icon btn-icon-sm"
        style={{ opacity: 0.5 }}
        onClick={(e) => {
          e.stopPropagation()
          // Simple click handlers - in production would show dropdown
          onPlayNow()
        }}
        title="Play now"
      >
        <PlayIcon />
      </button>
    </div>
  )
}

function MusicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z"/>
    </svg>
  )
}

export default TrackList
