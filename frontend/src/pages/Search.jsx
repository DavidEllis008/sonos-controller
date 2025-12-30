import { useState } from 'react'
import { Link } from 'react-router-dom'
import TrackList from '../components/TrackList'

function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    try {
      const res = await fetch(`/api/library/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setResults(data)
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="section-title" style={{ marginBottom: 24 }}>Search</h1>

      <form onSubmit={handleSearch} style={{ marginBottom: 32 }}>
        <div className="search-container" style={{ maxWidth: 600 }}>
          <SearchIcon />
          <input
            type="text"
            className="search-input"
            placeholder="Search artists, albums, or tracks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
      </form>

      {loading && (
        <div className="loading"><div className="spinner" /></div>
      )}

      {results && !loading && (
        <div>
          {results.artists.length > 0 && (
            <section className="search-results-section">
              <h2 className="search-results-title">Artists</h2>
              <div className="search-results-grid">
                {results.artists.map(artist => (
                  <Link
                    key={artist}
                    to={`/browse/artists/${encodeURIComponent(artist)}`}
                    className="card search-result-card"
                  >
                    <div className="search-result-content">
                      <div className="album-art album-art-sm">
                        <div className="album-art-placeholder">
                          <ArtistIcon />
                        </div>
                      </div>
                      <span className="search-result-name">{artist}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results.albums.length > 0 && (
            <section className="search-results-section">
              <h2 className="search-results-title">Albums</h2>
              <div className="search-results-grid">
                {results.albums.map((album, i) => (
                  <Link
                    key={`${album.name}-${i}`}
                    to={`/browse/albums/${encodeURIComponent(album.name)}?artist=${encodeURIComponent(album.artist || '')}`}
                    className="card search-result-card"
                  >
                    <div className="search-result-content">
                      <div className="album-art album-art-sm">
                        <div className="album-art-placeholder">
                          <AlbumIcon />
                        </div>
                      </div>
                      <div className="search-result-text">
                        <div className="search-result-name">{album.name}</div>
                        <div className="search-result-meta">{album.artist}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {results.tracks.length > 0 && (
            <section>
              <h2 className="search-results-title">Tracks</h2>
              <TrackList tracks={results.tracks} />
            </section>
          )}

          {results.artists.length === 0 && results.albums.length === 0 && results.tracks.length === 0 && (
            <div className="empty-state">
              <p>No results found for "{query}"</p>
            </div>
          )}
        </div>
      )}

      {!results && !loading && (
        <div className="empty-state">
          <p style={{ color: 'var(--text-muted)' }}>
            Search your music library
          </p>
        </div>
      )}
    </div>
  )
}

function SearchIcon() {
  return (
    <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
    </svg>
  )
}

function ArtistIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
  )
}

function AlbumIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/>
    </svg>
  )
}

export default Search
