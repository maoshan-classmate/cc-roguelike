import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './store/useAuthStore'
import { networkClient } from './network/socket'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import LoginPage from './pages/LoginPage'
import LobbyPage from './pages/LobbyPage'
import RoomPage from './pages/RoomPage'
import GamePage from './pages/GamePage'

function AuthErrorHandler() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    const handler = (data: { message?: string }) => {
      console.warn('[Auth] Token expired or invalid:', data.message)
      logout()
      navigate('/login', { replace: true })
    }
    networkClient.on('auth:error', handler)
    return () => networkClient.off('auth:error', handler)
  }, [navigate, logout])

  return null
}

// ── Page transition wrapper (fade + subtle slide) ──
const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.18 } },
}

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ width: '100%', minHeight: '100vh' }}
    >
      {children}
    </motion.div>
  )
}

function App() {
  const { user } = useAuthStore()
  const location = useLocation()

  return (
    <>
      <AuthErrorHandler />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/login" element={user ? <Navigate to="/lobby" /> : <PageTransition><LoginPage /></PageTransition>} />
          <Route path="/lobby" element={user ? <PageTransition><LobbyPage /></PageTransition> : <Navigate to="/login" />} />
          <Route path="/room/:roomId" element={user ? <PageTransition><RoomPage /></PageTransition> : <Navigate to="/login" />} />
          <Route path="/game/:roomId" element={user ? <PageTransition><GamePage /></PageTransition> : <Navigate to="/login" />} />
          <Route path="/" element={<Navigate to={user ? "/lobby" : "/login"} />} />
        </Routes>
      </AnimatePresence>
    </>
  )
}

export default App
