import { create } from 'zustand'

const API_BASE = '/api'

export const useStore = create((set, get) => ({
  // Sonos devices
  devices: [],
  activeDeviceUid: null,

  // Now playing
  nowPlaying: null,
  isPlaying: false,

  // Queue
  queue: [],

  // Library
  indexStatus: null,

  // Loading states
  loading: {
    devices: false,
    nowPlaying: false,
    queue: false,
  },

  // Error states
  error: null,

  // Get active device
  getActiveDevice: () => {
    const { devices, activeDeviceUid } = get()
    return devices.find(d => d.uid === activeDeviceUid)
  },

  // Fetch devices
  fetchDevices: async () => {
    set(s => ({ loading: { ...s.loading, devices: true } }))
    try {
      const res = await fetch(`${API_BASE}/sonos/devices`)
      const data = await res.json()
      set({ devices: data.devices, error: null })

      // Auto-select first device if none selected
      if (!get().activeDeviceUid && data.devices.length > 0) {
        set({ activeDeviceUid: data.devices[0].uid })
        get().fetchNowPlaying()
      }
    } catch (err) {
      set({ error: err.message })
    } finally {
      set(s => ({ loading: { ...s.loading, devices: false } }))
    }
  },

  // Set active device
  setActiveDevice: (uid) => {
    set({ activeDeviceUid: uid })
    get().fetchNowPlaying()
    get().fetchQueue()
  },

  // Fetch now playing
  fetchNowPlaying: async () => {
    const uid = get().activeDeviceUid
    if (!uid) return

    set(s => ({ loading: { ...s.loading, nowPlaying: true } }))
    try {
      const res = await fetch(`${API_BASE}/sonos/devices/${uid}/now-playing`)
      const data = await res.json()
      set({
        nowPlaying: data,
        isPlaying: data.transport_state === 'PLAYING',
      })
    } catch (err) {
      console.error('Error fetching now playing:', err)
    } finally {
      set(s => ({ loading: { ...s.loading, nowPlaying: false } }))
    }
  },

  // Playback controls
  play: async () => {
    const uid = get().activeDeviceUid
    if (!uid) return
    await fetch(`${API_BASE}/sonos/devices/${uid}/play`, { method: 'POST' })
    set({ isPlaying: true })
    get().fetchNowPlaying()
  },

  pause: async () => {
    const uid = get().activeDeviceUid
    if (!uid) return
    await fetch(`${API_BASE}/sonos/devices/${uid}/pause`, { method: 'POST' })
    set({ isPlaying: false })
  },

  next: async () => {
    const uid = get().activeDeviceUid
    if (!uid) return
    await fetch(`${API_BASE}/sonos/devices/${uid}/next`, { method: 'POST' })
    setTimeout(() => get().fetchNowPlaying(), 500)
  },

  previous: async () => {
    const uid = get().activeDeviceUid
    if (!uid) return
    await fetch(`${API_BASE}/sonos/devices/${uid}/previous`, { method: 'POST' })
    setTimeout(() => get().fetchNowPlaying(), 500)
  },

  setVolume: async (volume) => {
    const uid = get().activeDeviceUid
    if (!uid) return
    await fetch(`${API_BASE}/sonos/devices/${uid}/volume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ volume }),
    })
  },

  // Queue
  fetchQueue: async () => {
    const uid = get().activeDeviceUid
    if (!uid) return

    set(s => ({ loading: { ...s.loading, queue: true } }))
    try {
      const res = await fetch(`${API_BASE}/sonos/devices/${uid}/queue`)
      const data = await res.json()
      set({ queue: data.queue })
    } catch (err) {
      console.error('Error fetching queue:', err)
    } finally {
      set(s => ({ loading: { ...s.loading, queue: false } }))
    }
  },

  clearQueue: async () => {
    const uid = get().activeDeviceUid
    if (!uid) return
    await fetch(`${API_BASE}/sonos/devices/${uid}/queue/clear`, { method: 'POST' })
    set({ queue: [] })
  },

  // Play actions
  playNow: async (uri) => {
    const uid = get().activeDeviceUid
    if (!uid) return
    await fetch(`${API_BASE}/sonos/devices/${uid}/play-uri`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri }),
    })
    get().fetchNowPlaying()
    get().fetchQueue()
  },

  playNext: async (uri) => {
    const uid = get().activeDeviceUid
    if (!uid) return
    await fetch(`${API_BASE}/sonos/devices/${uid}/play-next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri }),
    })
    get().fetchQueue()
  },

  addToQueue: async (uri) => {
    const uid = get().activeDeviceUid
    if (!uid) return
    await fetch(`${API_BASE}/sonos/devices/${uid}/add-to-queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri }),
    })
    get().fetchQueue()
  },

  // Index status
  fetchIndexStatus: async () => {
    try {
      const res = await fetch(`${API_BASE}/library/status`)
      const data = await res.json()
      set({ indexStatus: data })
    } catch (err) {
      console.error('Error fetching index status:', err)
    }
  },

  triggerReindex: async () => {
    await fetch(`${API_BASE}/library/reindex`, { method: 'POST' })
    get().fetchIndexStatus()
  },
}))

// Polling for now playing updates
let pollInterval = null

export const startPolling = () => {
  if (pollInterval) return
  pollInterval = setInterval(() => {
    useStore.getState().fetchNowPlaying()
  }, 5000)
}

export const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}
