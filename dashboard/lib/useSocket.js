'use client'
import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

export function useSocket(token) {
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [botStatus, setBotStatus] = useState('stopped')
  const [logs, setLogs] = useState([])
  const [pairingCode, setPairingCode] = useState(null)

  useEffect(() => {
    if (!token) return

    const socket = io(BACKEND_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 2000,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    socket.on('bot:status', ({ status }) => {
      setBotStatus(status)
      // Clear pairing code once connected
      if (status === 'connected') {
        setPairingCode(null)
      }
    })

    socket.on('bot:log', (entry) => {
      setLogs(prev => {
        const next = [...prev, entry]
        return next.slice(-200) // keep last 200
      })
    })

    socket.on('bot:pairing_code', ({ code }) => {
      setPairingCode(code)
    })

    return () => {
      socket.disconnect()
    }
  }, [token])

  return {
    socket: socketRef.current,
    connected,
    botStatus,
    setBotStatus,
    logs,
    setLogs,
    pairingCode,
    setPairingCode
  }
}

export function useAdminSocket(token) {
  const socketRef = useRef(null)
  const [connected, setConnected] = useState(false)
  const [botUpdates, setBotUpdates] = useState({})

  useEffect(() => {
    if (!token) return

    const socket = io(BACKEND_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
    })

    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('admin:bot:status', ({ userId, status }) => {
      setBotUpdates(prev => ({
        ...prev,
        [userId]: { ...prev[userId], status, updatedAt: Date.now() }
      }))
    })

    return () => socket.disconnect()
  }, [token])

  return { socket: socketRef.current, connected, botUpdates }
}
