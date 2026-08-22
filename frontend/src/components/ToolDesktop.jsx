import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { FISHERIES } from '../data/fisheries.js'
import './ToolDesktop.css'

const THEME_KEY = 'narw-tool-theme'
const ALERT_RESET_MS = 3000

const DOCK_ITEMS = [
  {
    to: '/run/classify',
    label: 'classify',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    to: '/run/council',
    label: 'council',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M4 12.5l5 5L20 6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    to: '/run/map',
    label: 'map',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 21s7-6.4 7-12a7 7 0 10-14 0c0 5.6 7 12 7 12z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
]

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function ToolDesktop() {
  const location = useLocation()
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) || 'dark'
    } catch {
      return 'dark'
    }
  })
  const [alerted, setAlerted] = useState(false)
  const alertTimeoutRef = useRef(null)

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // ignore - theme just won't persist
    }
  }, [theme])

  useEffect(() => () => clearTimeout(alertTimeoutRef.current), [])

  function handleAlertAllFisheries() {
    setAlerted(true)
    clearTimeout(alertTimeoutRef.current)
    alertTimeoutRef.current = setTimeout(() => setAlerted(false), ALERT_RESET_MS)
  }

  const activeItem = DOCK_ITEMS.find((item) => location.pathname.startsWith(item.to))

  return (
    <div className="tool-desktop">
      <video
        className="tool-desktop__bg-video"
        src="/app-bg.mp4"
        autoPlay={!prefersReducedMotion}
        loop
        muted
        playsInline
      />
      <div className="tool-desktop__bg-overlay" />
      <div className="tool-desktop__bg-shimmer" />

      <div className={`tool-desktop__screen ${theme === 'light' ? 'tool-desktop__screen--light' : ''}`}>
        <div className="tool-desktop__titlebar">
          <div className="tool-desktop__traffic-lights">
            <NavLink to="/" className="tool-desktop__dot tool-desktop__dot--red" aria-label="Close, back to home" />
            <span className="tool-desktop__dot tool-desktop__dot--yellow" />
            <span className="tool-desktop__dot tool-desktop__dot--green" />
          </div>

          <span className="tool-desktop__title">{activeItem?.label ?? 'NARW Council'}</span>

          <div className="tool-desktop__titlebar-actions">
            <button
              className={`tool-desktop__alert-btn ${alerted ? 'tool-desktop__alert-btn--sent' : ''}`}
              onClick={handleAlertAllFisheries}
              disabled={alerted}
              title={`Simulated - notifies all ${FISHERIES.length} fleet zones, not just ones in range`}
            >
              {alerted ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 12.5l5 5L20 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M12 3a5.5 5.5 0 00-5.5 5.5c0 4.2-1.5 5.7-2.2 6.4a.7.7 0 00.5 1.2h14.4a.7.7 0 00.5-1.2c-.7-.7-2.2-2.2-2.2-6.4A5.5 5.5 0 0012 3z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                  <path d="M9.5 19a2.5 2.5 0 005 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              )}
              <span>{alerted ? 'Alerted (simulated)' : 'Alert All Fisheries'}</span>
            </button>

            <button
              className="tool-desktop__theme-toggle"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8" />
                  <path
                    d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6M18.4 18.4l-1.6-1.6M7.2 7.2L5.6 5.6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M20 14.5A8.5 8.5 0 1110 3.2a7 7 0 0010 11.3z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="tool-desktop__content">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="tool-desktop__panel"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="tool-desktop__taskbar">
        <div className="tool-desktop__dock">
          {DOCK_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `tool-desktop__dock-item ${isActive ? 'tool-desktop__dock-item--active' : ''}`}
              aria-label={item.label}
            >
              <span className="tool-desktop__dock-icon">
                {item.icon}
                <span className="tool-desktop__dock-dot" />
              </span>
              <span className="tool-desktop__dock-label">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  )
}
