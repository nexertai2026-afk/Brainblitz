// FILE: src/App.jsx
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import MemoryGame from './pages/MemoryGame'
import MathSprint from './pages/MathSprint'
import PatternGame from './pages/PatternGame'
import ReactionGame from './pages/ReactionGame'
import WordScramble from './pages/WordScramble'
import StroopGame from './pages/StroopGame'
import NBackGame from './pages/NBackGame'
import Dashboard from './pages/Dashboard'
import Scores from './pages/Scores'
import { ScoreProvider } from './context/ScoreContext'
import { AuthProvider } from './context/AuthContext'
import { ModalProvider } from './context/ModalContext'
import AuthModal from './components/AuthModal'
import UpdateModal from './components/UpdateModal'

// Navbar + footer hide on these routes
const HIDDEN_CHROME_ROUTES = ['/login']

function AppShell() {
  const { pathname } = useLocation()
  const hideChrome = HIDDEN_CHROME_ROUTES.includes(pathname)

  return (
    <>
      {!hideChrome && <Navbar />}
      <AuthModal />
      <UpdateModal />
      <Routes>
        <Route path="/"        element={<Home />} />
        <Route path="/login"   element={<Login />} />
        <Route path="/memory"  element={<MemoryGame />} />
        <Route path="/math"    element={<MathSprint />} />
        <Route path="/pattern" element={<PatternGame />} />
        <Route path="/reaction"element={<ReactionGame />} />
        <Route path="/word"    element={<WordScramble />} />
        <Route path="/stroop"  element={<StroopGame />} />
        <Route path="/nback"   element={<NBackGame />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/scores"  element={<Scores />} />
      </Routes>
      {!hideChrome && (
        <footer className="footer">⚡ BrainBlitz — Train your brain, level up your mind.</footer>
      )}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ModalProvider>
        <ScoreProvider>
          <AppShell />
        </ScoreProvider>
      </ModalProvider>
    </AuthProvider>
  )
}