import { useMemo, useState } from 'react'
import './HistoryScreen.css'

const CHECK_ORDER = ['contour_shape', 'texture_lbp', 'noise_check']
const CHECK_LABEL = {
  contour_shape: 'Frequency Pattern',
  texture_lbp: 'Call Duration',
  noise_check: 'Background Noise Check',
}

const TIER_COLOR = { high: 'var(--tier-high)', medium: 'var(--tier-medium)', low: 'var(--tier-low)' }
const TIER_LABEL = { high: 'NARW', medium: 'Possible NARW', low: 'Not NARW' }

function dateKey(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function FolderIcon() {
  return (
    <svg width="40" height="34" viewBox="0 0 24 20" fill="var(--surface-2)" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 3a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V3z" />
    </svg>
  )
}

export default function HistoryScreen({ history }) {
  const [openDate, setOpenDate] = useState(null)
  const [expandedId, setExpandedId] = useState(null)

  // grouped by calendar date, session-only (no backend) - newest-first
  // since history itself is already prepended newest-first
  const groups = useMemo(() => {
    const map = new Map()
    for (const entry of history) {
      const key = dateKey(entry.timestamp)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(entry)
    }
    return map
  }, [history])

  const openEntries = openDate ? groups.get(openDate) ?? [] : []

  function handleBack() {
    setOpenDate(null)
    setExpandedId(null)
  }

  return (
    <div className="history">
      <div className="history__toolbar">
        {openDate ? (
          <button className="history__back" onClick={handleBack}>
            &larr; {openDate}
          </button>
        ) : (
          <span className="history__toolbar-label">Recent</span>
        )}
        <span className="history__toolbar-count">
          {history.length} clip{history.length === 1 ? '' : 's'}
        </span>
      </div>

      {history.length === 0 ? (
        <p className="history__empty">No clips reviewed yet.</p>
      ) : openDate ? (
        <ul className="history__list">
          {openEntries.map((entry) => {
            const tier = entry.result.confidence_tier
            const isExpanded = expandedId === entry.id
            return (
              <li key={entry.id} className="history__row">
                <button
                  className="history__row-main"
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                >
                  <span className="history__dot" style={{ background: TIER_COLOR[tier] }} />
                  <span className={`history__arrow ${isExpanded ? 'history__arrow--open' : ''}`}>&#9654;&#xFE0E;</span>
                  <span className="history__row-label-block">
                    <span className="history__row-label">{TIER_LABEL[tier]}</span>
                    <span className="history__row-location">{entry.location}</span>
                  </span>
                  <span className="history__row-meta">
                    <span className="history__row-time">{formatTime(entry.timestamp)}</span>
                    <span className="history__row-score" style={{ color: TIER_COLOR[tier] }}>
                      {Math.round(entry.result.confidence * 100)}%
                    </span>
                  </span>
                </button>

                {isExpanded && (
                  <div className="history__row-details">
                    <p>clip: {entry.name}</p>
                    <p>confidence: {entry.result.confidence}</p>
                    {CHECK_ORDER.map((key) => (
                      <p key={key}>
                        {CHECK_LABEL[key]}: {entry.result.council[key].vote ? '✓' : '×'}{' '}
                        {entry.result.council[key].score.toFixed(2)}
                      </p>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="history__grid">
          {[...groups.entries()].map(([date, entries]) => (
            <button key={date} className="history__folder" onClick={() => setOpenDate(date)}>
              <FolderIcon />
              <span className="history__folder-name">{date}</span>
              <span className="history__folder-meta">
                ({entries.length} clip{entries.length === 1 ? '' : 's'})
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
