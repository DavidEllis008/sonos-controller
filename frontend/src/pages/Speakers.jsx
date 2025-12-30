import { useEffect } from 'react'
import { useStore } from '../store'

function Speakers() {
  const { devices, activeDeviceUid, setActiveDevice, fetchDevices, loading } = useStore()

  useEffect(() => {
    fetchDevices()
  }, [])

  if (loading.devices) {
    return <div className="loading"><div className="spinner" /></div>
  }

  // Group devices by coordinator
  const groups = {}
  const standalone = []

  devices.forEach(device => {
    if (device.is_coordinator) {
      groups[device.uid] = {
        coordinator: device,
        members: [device],
      }
    }
  })

  devices.forEach(device => {
    if (!device.is_coordinator && device.coordinator_uid) {
      if (groups[device.coordinator_uid]) {
        groups[device.coordinator_uid].members.push(device)
      } else {
        standalone.push(device)
      }
    }
  })

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Speakers</h1>
        <button className="btn btn-secondary" onClick={fetchDevices}>
          Refresh
        </button>
      </div>

      {devices.length === 0 ? (
        <div className="empty-state">
          <p>No Sonos devices found</p>
          <p style={{ fontSize: 14, marginTop: 8 }}>
            Make sure your devices are on and connected to the network
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {Object.values(groups).map(group => (
            <div key={group.coordinator.uid} className="card">
              <div className="speaker-card-header" style={{ marginBottom: group.members.length > 1 ? 16 : 0 }}>
                <div className="speaker-card-info">
                  <SpeakerIcon />
                  <div>
                    <div className="speaker-card-name">
                      {group.members.length > 1
                        ? group.members.map(m => m.name).join(' + ')
                        : group.coordinator.name
                      }
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {group.coordinator.ip}
                      {group.coordinator.is_playing && ' · Playing'}
                    </div>
                  </div>
                </div>
                <button
                  className={`btn ${activeDeviceUid === group.coordinator.uid ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveDevice(group.coordinator.uid)}
                >
                  {activeDeviceUid === group.coordinator.uid ? 'Active' : 'Select'}
                </button>
              </div>

              {group.members.length > 1 && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                    Group members:
                  </div>
                  {group.members.map(member => (
                    <div key={member.uid} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                      <div style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: member.is_coordinator ? 'var(--accent)' : 'var(--text-muted)'
                      }} />
                      <span style={{ fontSize: 14 }}>{member.name}</span>
                      {member.is_coordinator && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(coordinator)</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="speaker-volume-row">
                <VolumeIcon />
                <input
                  type="range"
                  min="0"
                  max="100"
                  defaultValue={group.coordinator.volume || 50}
                  onChange={async (e) => {
                    await fetch(`/api/sonos/devices/${group.coordinator.uid}/volume`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ volume: parseInt(e.target.value) }),
                    })
                  }}
                  className="speaker-volume-slider"
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 32 }}>
                  {group.coordinator.volume}%
                </span>
              </div>
            </div>
          ))}

          {standalone.map(device => (
            <div key={device.uid} className="card">
              <div className="speaker-card-header">
                <div className="speaker-card-info">
                  <SpeakerIcon />
                  <div>
                    <div className="speaker-card-name">{device.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {device.ip}
                    </div>
                  </div>
                </div>
                <button
                  className={`btn ${activeDeviceUid === device.uid ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setActiveDevice(device.uid)}
                >
                  {activeDeviceUid === device.uid ? 'Active' : 'Select'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SpeakerIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 16c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
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

export default Speakers
