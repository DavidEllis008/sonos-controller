import { useEffect } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { useStore, startPolling } from './store'
import NowPlaying from './pages/NowPlaying'
import Browse from './pages/Browse'
import Queue from './pages/Queue'
import Speakers from './pages/Speakers'
import Search from './pages/Search'
import PlayerBar from './components/PlayerBar'

function App() {
  const { fetchDevices, fetchIndexStatus } = useStore()

  useEffect(() => {
    fetchDevices()
    fetchIndexStatus()
    startPolling()
  }, [])

  return (
    <div className="app">
      <div className="main-content">
        <nav className="sidebar">
          <div className="nav-section">
            <div className="nav-title">Menu</div>
            <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <PlayIcon />
              <span>Now Playing</span>
            </NavLink>
            <NavLink to="/browse" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <LibraryIcon />
              <span>Browse</span>
            </NavLink>
            <NavLink to="/queue" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <QueueIcon />
              <span>Queue</span>
            </NavLink>
            <NavLink to="/search" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <SearchIcon />
              <span>Search</span>
            </NavLink>
            <NavLink to="/speakers" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <SpeakerIcon />
              <span>Speakers</span>
            </NavLink>
          </div>
          <IndexStatus />
        </nav>
        <main className="content">
          <Routes>
            <Route path="/" element={<NowPlaying />} />
            <Route path="/browse/*" element={<Browse />} />
            <Route path="/queue" element={<Queue />} />
            <Route path="/search" element={<Search />} />
            <Route path="/speakers" element={<Speakers />} />
          </Routes>
        </main>
      </div>
      <PlayerBar />
    </div>
  )
}

function IndexStatus() {
  const { indexStatus, triggerReindex } = useStore()

  if (!indexStatus) return null

  if (indexStatus.status === 'running') {
    return (
      <div className="card" style={{ marginTop: 'auto' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
          Indexing library...
        </div>
        <div style={{ fontSize: 12 }}>
          {indexStatus.processed_files} / {indexStatus.total_files}
        </div>
        <div style={{
          height: 4,
          background: 'var(--bg-tertiary)',
          borderRadius: 2,
          marginTop: 8,
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            background: 'var(--accent)',
            width: `${(indexStatus.processed_files / indexStatus.total_files) * 100}%`,
            transition: 'width 0.3s'
          }} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginTop: 'auto' }}>
      <button
        className="btn btn-secondary"
        style={{ width: '100%' }}
        onClick={triggerReindex}
      >
        Re-scan Library
      </button>
    </div>
  )
}

// Icons
function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z"/>
    </svg>
  )
}

function LibraryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z"/>
    </svg>
  )
}

function QueueIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
    </svg>
  )
}

function SpeakerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 16c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
    </svg>
  )
}

export default App
