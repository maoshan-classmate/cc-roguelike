import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/useAuthStore'
import LoginPage from './pages/LoginPage'
import LobbyPage from './pages/LobbyPage'
import RoomPage from './pages/RoomPage'
import GamePage from './pages/GamePage'

function App() {
  const { user } = useAuthStore()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/lobby" /> : <LoginPage />} />
      <Route path="/lobby" element={user ? <LobbyPage /> : <Navigate to="/login" />} />
      <Route path="/room/:roomId" element={user ? <RoomPage /> : <Navigate to="/login" />} />
      <Route path="/game/:roomId" element={user ? <GamePage /> : <Navigate to="/login" />} />
      <Route path="/" element={<Navigate to={user ? "/lobby" : "/login"} />} />
    </Routes>
  )
}

export default App
