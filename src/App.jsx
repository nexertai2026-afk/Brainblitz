import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
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

export default function App() {
  return (
    <AuthProvider>
      <ModalProvider>
        <ScoreProvider>
          <Navbar />
          <AuthModal />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/memory" element={<MemoryGame />} />
            <Route path="/math" element={<MathSprint />} />
            <Route path="/pattern" element={<PatternGame />} />
            <Route path="/reaction" element={<ReactionGame />} />
            <Route path="/word" element={<WordScramble />} />
            <Route path="/stroop" element={<StroopGame />} />
            <Route path="/nback" element={<NBackGame />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/scores" element={<Scores />} />
          </Routes>
          <footer className="footer">⚡ BrainBlitz — Train your brain, level up your mind.</footer>
        </ScoreProvider>
      </ModalProvider>
    </AuthProvider>
  )
}