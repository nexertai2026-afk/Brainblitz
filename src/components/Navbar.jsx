// FILE: src/components/Navbar.jsx
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { useScore } from '../context/ScoreContext'

export default function Navbar() {
  const { user, profile, signOut } = useAuthContext()
  const { totalScore } = useScore()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <nav className="nav-float">
      <Link to="/" className="nav-logo">⚡ BrainBlitz</Link>
      <ul className="nav-links">
        <li>
          <NavLink
            to="/"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            end
          >
            Modules
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            Profile
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/scores"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            Scores
          </NavLink>
        </li>
      </ul>
      <div className="nav-meta">
        {user ? (
          <>
            <span className="nav-meta-item">
              {profile?.username || user.email?.split('@')[0]}
            </span>
            <div className="nav-meta-divider" />
            <span className="nav-meta-item">{totalScore} XP</span>
            <div className="nav-meta-divider" />
            <button
              className="nav-auth-btn nav-auth-logout"
              onClick={handleSignOut}
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <span className="nav-meta-item">{totalScore} XP</span>
            <div className="nav-meta-divider" />
            {/* Changed: now navigates to /login page instead of opening modal */}
            <Link to="/login" className="nav-auth-btn nav-auth-login">
              Login
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}