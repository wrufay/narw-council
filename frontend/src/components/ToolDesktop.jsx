import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import './ToolDesktop.css'

const THEME_KEY = 'narw-tool-theme'

const DOCK_ITEMS = [
  {
    to: '/run/classify',
    label: 'Classify',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    to: '/run/council',
    label: 'Council',
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
    label: 'Map',
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
  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // ignore - theme just won't persist
    }
  }, [theme])

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
          <div className="tool-desktop__titlebar-left">
            <div className="tool-desktop__traffic-lights">
              <NavLink to="/" className="tool-desktop__dot tool-desktop__dot--red" aria-label="Close, back to home" />
            </div>

            {location.pathname.startsWith('/run/map') && (
              <span className="tool-desktop__title">Right Risks — Historical Data</span>
            )}
          </div>

          <div className="tool-desktop__titlebar-actions">
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
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28, mass: 0.7 }}
            className="tool-desktop__panel"
          >
            <Outlet context={{ theme }} />
          </motion.div>
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
              <span className="tool-desktop__dock-tooltip">{item.label}</span>
              <span className="tool-desktop__dock-icon">
                {item.icon}
                <span className="tool-desktop__dock-dot" />
              </span>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  )
}
