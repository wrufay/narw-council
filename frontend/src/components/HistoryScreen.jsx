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

const SAMPLE_KEY = 'sample'

// illustrative only, never counted in the real clip total or grouped by
// date - just so this page always shows what a populated folder looks like
const SAMPLE_ENTRIES = [
  {
    id: 'sample-1',
    name: 'sample-clip-01.wav',
    location: 'Bay of Fundy',
    timestamp: new Date(2026, 7, 22, 15, 32),
    result: {
      prediction: 'NARW',
      confidence: 0.91,
      confidence_tier: 'high',
      council: {
        contour_shape: { vote: true, score: 0.85 },
        texture_lbp: { vote: true, score: 0.91 },
        noise_check: { vote: true, score: 0.88 },
      },
    },
  },
  {
    id: 'sample-2',
    name: 'sample-clip-02.wav',
    location: 'Gulf of St. Lawrence',
    timestamp: new Date(2026, 7, 22, 10, 17),
    result: {
      prediction: 'NARW',
      confidence: 0.61,
      confidence_tier: 'medium',
      council: {
        contour_shape: { vote: true, score: 0.61 },
        texture_lbp: { vote: true, score: 0.77 },
        noise_check: { vote: false, score: 0.49 },
      },
    },
  },
  {
    id: 'sample-3',
    name: 'sample-clip-03.wav',
    location: 'Roseway Basin',
    timestamp: new Date(2026, 7, 21, 18, 50),
    result: {
      prediction: 'not_NARW',
      confidence: 0.22,
      confidence_tier: 'low',
      council: {
        contour_shape: { vote: false, score: 0.52 },
        texture_lbp: { vote: false, score: 0.24 },
        noise_check: { vote: false, score: 0.18 },
      },
    },
  },
]

function dateKey(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function FolderIcon({ sample }) {
  return (
    <svg
      width="40"
      height="34"
      viewBox="0 0 24 20"
      fill={sample ? 'none' : 'var(--surface-2)'}
      stroke={sample ? 'var(--text-2)' : 'none'}
      strokeWidth={sample ? '1.5' : '0'}
      strokeDasharray={sample ? '3 2' : undefined}
      xmlns="http://www.w3.org/2000/svg"
    >
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

  const isSample = openDate === SAMPLE_KEY
  const openEntries = isSample ? SAMPLE_ENTRIES : openDate ? groups.get(openDate) ?? [] : []

  function handleBack() {
    setOpenDate(null)
    setExpandedId(null)
  }

  return (
    <div className="history">
      <div className="history__toolbar">
        {openDate ? (
          <button className="history__back" onClick={handleBack}>
            &larr; {isSample ? 'Sample' : openDate}
          </button>
        ) : (
          <span className="history__toolbar-label">Recent</span>
        )}
        <span className="history__toolbar-count">
          {history.length} clip{history.length === 1 ? '' : 's'}
        </span>
      </div>

      {isSample && (
        <p className="history__sample-banner">Example data — not from a real session.</p>
      )}

      {openDate ? (
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

          <button
            className="history__folder history__folder--sample"
            onClick={() => setOpenDate(SAMPLE_KEY)}
          >
            <FolderIcon sample />
            <span className="history__folder-name">Sample</span>
            <span className="history__folder-meta">({SAMPLE_ENTRIES.length} example)</span>
          </button>
        </div>
      )}
    </div>
  )
}
