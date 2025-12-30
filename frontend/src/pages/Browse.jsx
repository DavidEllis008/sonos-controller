import { useState, useEffect } from 'react'
import { Routes, Route, Link, useParams } from 'react-router-dom'
import TrackList from '../components/TrackList'

function Browse() {
  return (
    <Routes>
      <Route index element={<BrowseHome />} />
      <Route path="artists" element={<ArtistList />} />
      <Route path="artists/:artist" element={<ArtistDetail />} />
      <Route path="albums" element={<AlbumList />} />
      <Route path="albums/:album" element={<AlbumDetail />} />
      <Route path="playlists" element={<PlaylistList />} />
      <Route path="playlists/:id" element={<PlaylistDetail />} />
    </Routes>
  )
}

function BrowseHome() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetch('/api/library/stats')
      .then(r => r.json())
      .then(setStats)
  }, [])

  return (
    <div>
      <h1 className="section-title" style={{ marginBottom: 24 }}>Browse Library</h1>

      <div className="grid">
        <Link to="/browse/artists" className="card" style={{ textDecoration: 'none' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>
            <ArtistIcon />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Artists</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {stats?.artists || 0} artists
          </p>
        </Link>

        <Link to="/browse/albums" className="card" style={{ textDecoration: 'none' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>
            <AlbumIcon />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Albums</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {stats?.albums || 0} albums
          </p>
        </Link>

        <Link to="/browse/playlists" className="card" style={{ textDecoration: 'none' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>
            <PlaylistIcon />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Playlists</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Browse playlists
          </p>
        </Link>
      </div>

      {stats && (
        <div style={{ marginTop: 32, color: 'var(--text-muted)', fontSize: 14 }}>
          {stats.tracks} tracks · {formatDuration(stats.total_duration)}
        </div>
      )}
    </div>
  )
}

function ArtistList() {
  const [artists, setArtists] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/library/artists?limit=500')
      .then(r => r.json())
      .then(data => {
        setArtists(data.artists)
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div>
      <h1 className="section-title" style={{ marginBottom: 24 }}>Artists</h1>
      <div className="grid">
        {artists.map(artist => (
          <Link
            key={artist.name}
            to={`/browse/artists/${encodeURIComponent(artist.name)}`}
            className="card"
            style={{ textDecoration: 'none' }}
          >
            <div className="album-art" style={{ marginBottom: 12 }}>
              <div className="album-art-placeholder">
                <ArtistIcon />
              </div>
            </div>
            <h3 style={{ fontWeight: 500, marginBottom: 4 }}>{artist.name}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              {artist.track_count} tracks
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}

function ArtistDetail() {
  const { artist } = useParams()
  const [albums, setAlbums] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/library/artists/${encodeURIComponent(artist)}/albums`)
      .then(r => r.json())
      .then(data => {
        setAlbums(data.albums)
        setLoading(false)
      })
  }, [artist])

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div>
      <Link to="/browse/artists" style={{ color: 'var(--text-muted)', fontSize: 14 }}>
        ← Back to Artists
      </Link>
      <h1 className="section-title" style={{ margin: '16px 0 24px' }}>{artist}</h1>
      <div className="grid">
        {albums.map(album => (
          <Link
            key={album.name}
            to={`/browse/albums/${encodeURIComponent(album.name)}?artist=${encodeURIComponent(artist)}`}
            className="card"
            style={{ textDecoration: 'none' }}
          >
            <div className="album-art" style={{ marginBottom: 12 }}>
              <div className="album-art-placeholder">
                <AlbumIcon />
              </div>
            </div>
            <h3 style={{ fontWeight: 500, marginBottom: 4 }}>{album.name}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              {album.year} · {album.track_count} tracks
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}

function AlbumList() {
  const [albums, setAlbums] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/library/albums?limit=500')
      .then(r => r.json())
      .then(data => {
        setAlbums(data.albums)
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div>
      <h1 className="section-title" style={{ marginBottom: 24 }}>Albums</h1>
      <div className="grid">
        {albums.map((album, i) => (
          <Link
            key={`${album.name}-${album.artist}-${i}`}
            to={`/browse/albums/${encodeURIComponent(album.name)}?artist=${encodeURIComponent(album.artist || '')}`}
            className="card"
            style={{ textDecoration: 'none' }}
          >
            <div className="album-art" style={{ marginBottom: 12 }}>
              <div className="album-art-placeholder">
                <AlbumIcon />
              </div>
            </div>
            <h3 style={{ fontWeight: 500, marginBottom: 4 }}>{album.name}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              {album.artist}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}

function AlbumDetail() {
  const { album } = useParams()
  const artist = new URLSearchParams(window.location.search).get('artist')
  const [tracks, setTracks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const url = artist
      ? `/api/library/albums/${encodeURIComponent(album)}/tracks?artist=${encodeURIComponent(artist)}`
      : `/api/library/albums/${encodeURIComponent(album)}/tracks`

    fetch(url)
      .then(r => r.json())
      .then(data => {
        setTracks(data.tracks)
        setLoading(false)
      })
  }, [album, artist])

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div>
      <Link to="/browse/albums" style={{ color: 'var(--text-muted)', fontSize: 14 }}>
        ← Back to Albums
      </Link>
      <div className="album-detail-header">
        <div className="album-art album-detail-art">
          {tracks[0]?.art_url ? (
            <img src={tracks[0].art_url} alt="" />
          ) : (
            <div className="album-art-placeholder">
              <AlbumIcon />
            </div>
          )}
        </div>
        <div className="album-detail-info">
          <h1>{album}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>{artist}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8 }}>
            {tracks.length} tracks
          </p>
        </div>
      </div>
      <TrackList tracks={tracks} showAlbum={false} />
    </div>
  )
}

function PlaylistList() {
  const [playlists, setPlaylists] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/playlists')
      .then(r => r.json())
      .then(data => {
        setPlaylists(data.playlists)
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div>
      <h1 className="section-title" style={{ marginBottom: 24 }}>Playlists</h1>
      {playlists.length === 0 ? (
        <div className="empty-state">No playlists found</div>
      ) : (
        <div className="grid">
          {playlists.map(playlist => (
            <Link
              key={playlist.id}
              to={`/browse/playlists/${playlist.id}`}
              className="card"
              style={{ textDecoration: 'none' }}
            >
              <div className="album-art" style={{ marginBottom: 12 }}>
                <div className="album-art-placeholder">
                  <PlaylistIcon />
                </div>
              </div>
              <h3 style={{ fontWeight: 500, marginBottom: 4 }}>{playlist.name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                {playlist.track_count} tracks
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function PlaylistDetail() {
  const { id } = useParams()
  const [playlist, setPlaylist] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/playlists/${id}`)
      .then(r => r.json())
      .then(data => {
        setPlaylist(data)
        setLoading(false)
      })
  }, [id])

  if (loading) return <div className="loading"><div className="spinner" /></div>
  if (!playlist) return <div className="empty-state">Playlist not found</div>

  return (
    <div>
      <Link to="/browse/playlists" style={{ color: 'var(--text-muted)', fontSize: 14 }}>
        ← Back to Playlists
      </Link>
      <h1 className="section-title" style={{ margin: '16px 0 24px' }}>{playlist.name}</h1>
      <TrackList tracks={playlist.tracks} />
    </div>
  )
}

function formatDuration(seconds) {
  if (!seconds) return ''
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins} min`
}

function ArtistIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
  )
}

function AlbumIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
    </svg>
  )
}

function PlaylistIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
    </svg>
  )
}

export default Browse
