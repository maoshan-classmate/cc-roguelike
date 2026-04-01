import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './store/useAuthStore'
import { networkClient } from './network/socket'
import { useNavigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import LobbyPage from './pages/LobbyPage'
import RoomPage from './pages/RoomPage'
import GamePage from './pages/GamePage'

function AuthErrorHandler() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    const handler = (data: any) => {
      console.warn('[Auth] Token expired or invalid:', data.message)
      logout()
      navigate('/login', { replace: true })
    }
    networkClient.on('auth:error', handler)
    return () => networkClient.off('auth:error', handler)
  }, [navigate, logout])

  return null
}

function App() {
  const { user } = useAuthStore()

  return (
    <>
      <AuthErrorHandler />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/lobby" /> : <LoginPage />} />
        <Route path="/lobby" element={user ? <LobbyPage /> : <Navigate to="/login" />} />
        <Route path="/room/:roomId" element={user ? <RoomPage /> : <Navigate to="/login" />} />
        <Route path="/game/:roomId" element={user ? <GamePage /> : <Navigate to="/login" />} />
        <Route path="/" element={<Navigate to={user ? "/lobby" : "/login"} />} />
      </Routes>
    </>
  )
}

export default App
