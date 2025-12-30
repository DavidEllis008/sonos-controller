import { useEffect } from 'react'
import { useStore } from '../store'

function Queue() {
  const { queue, fetchQueue, clearQueue, loading } = useStore()

  useEffect(() => {
    fetchQueue()
  }, [])

  if (loading.queue) {
    return <div className="loading"><div className="spinner" /></div>
  }

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Queue</h1>
        {queue.length > 0 && (
          <button className="btn btn-secondary" onClick={clearQueue}>
            Clear Queue
          </button>
        )}
      </div>

      {queue.length === 0 ? (
        <div className="empty-state">
          <p>Queue is empty</p>
          <p style={{ fontSize: 14, marginTop: 8 }}>
            Add tracks from Browse or Search
          </p>
        </div>
      ) : (
        <div className="track-list">
          {queue.map((track, index) => (
            <div key={index} className="track-row queue-row">
              <span className="track-number">{index + 1}</span>
              <div className="track-title-cell">
                <div className="album-art album-art-sm">
                  {track.album_art ? (
                    <img src={track.album_art} alt="" />
                  ) : (
                    <div className="album-art-placeholder">
                      <MusicIcon />
                    </div>
                  )}
                </div>
                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {track.artist} {track.album && `· ${track.album}`}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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

export default Queue
