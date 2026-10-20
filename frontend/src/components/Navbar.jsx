import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Briefcase, LayoutDashboard, Building2, LogOut, Sun, Moon } from 'lucide-react'
import { useAuth } from '../auth'
import clsx from 'clsx'

function getInitialTheme() {
  try {
    const saved = localStorage.getItem('theme')
    if (saved === 'light' || saved === 'dark') return saved
  } catch {}
  return 'dark'
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  try { localStorage.setItem('theme', theme) } catch {}
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [theme, setTheme] = useState(getInitialTheme)

  // Apply theme on mount and whenever it changes
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggleTheme = () =>
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const linkClass = ({ isActive }) =>
    clsx(
      'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition',
      isActive
        ? 'bg-[var(--bg-3)] text-[var(--text)]'
        : 'text-[var(--text-muted)] hover:bg-[var(--bg-3)] hover:text-[var(--text)]'
    )

  return (
    <nav className="border-b border-[var(--border)] bg-[var(--bg-2)]">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 font-semibold text-[var(--text)]"
        >
          <Briefcase size={20} className="text-[var(--accent)]" />
          <span>Job Tracker</span>
        </Link>

        <div className="flex items-center gap-1">
          <NavLink to="/" end className={linkClass}>
            <LayoutDashboard size={16} />
            <span className="hidden sm:inline">Dashboard</span>
          </NavLink>
          <NavLink to="/applications" className={linkClass}>
            <Briefcase size={16} />
            <span className="hidden sm:inline">Applications</span>
          </NavLink>
          <NavLink to="/companies" className={linkClass}>
            <Building2 size={16} />
            <span className="hidden sm:inline">Companies</span>
          </NavLink>

          <div className="ml-4 flex items-center gap-2 border-l border-[var(--border)] pl-4">
            <span className="hidden text-sm text-[var(--text-muted)] sm:inline">
              {user?.email}
            </span>

            {/* Dark / light mode toggle */}
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-3)] hover:text-[var(--text)]"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-3)] hover:text-[var(--text)]"
              title="Log out"
              aria-label="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
