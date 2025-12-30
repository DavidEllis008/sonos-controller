import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { useStore, startPolling } from './store'
import NowPlaying from './pages/NowPlaying'
import Browse from './pages/Browse'
import Queue from './pages/Queue'
import Speakers from './pages/Speakers'
import Search from './pages/Search'
import PlayerBar from './components/PlayerBar'

function App() {
  const { fetchDevices, fetchIndexStatus } = useStore()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    fetchDevices()
    fetchIndexStatus()
    startPolling()
  }, [])

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  const navLinks = [
    { to: '/', icon: <PlayIcon />, label: 'Now Playing' },
    { to: '/browse', icon: <LibraryIcon />, label: 'Browse' },
    { to: '/queue', icon: <QueueIcon />, label: 'Queue' },
    { to: '/search', icon: <SearchIcon />, label: 'Search' },
    { to: '/speakers', icon: <SpeakerIcon />, label: 'Speakers' },
  ]

  return (
    <div className="app">
      {/* Mobile Header */}
      <header className="mobile-header">
        <div className="mobile-header-content">
          <span className="mobile-header-title">Sonos</span>
          <button
            className="hamburger-btn"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
          >
            <HamburgerIcon />
          </button>
        </div>
      </header>

      {/* Mobile Nav Overlay */}
      <div
        className={`mobile-nav-overlay ${mobileNavOpen ? 'open' : ''}`}
        onClick={() => setMobileNavOpen(false)}
      />

      {/* Mobile Nav Drawer */}
      <nav className={`mobile-nav ${mobileNavOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <span style={{ fontSize: 20, fontWeight: 600 }}>Menu</span>
          <button
            className="hamburger-btn"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="nav-section">
          {navLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setMobileNavOpen(false)}
            >
              {link.icon}
              <span>{link.label}</span>
            </NavLink>
          ))}
        </div>
        <IndexStatus />
      </nav>

      <div className="main-content">
        {/* Desktop Sidebar */}
        <nav className="sidebar">
          <div className="nav-section">
            <div className="nav-title">Menu</div>
            {navLinks.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {link.icon}
                <span>{link.label}</span>
              </NavLink>
            ))}
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

function HamburgerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
  )
}

export default App
