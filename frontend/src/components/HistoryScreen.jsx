import { useState } from 'react'
import TopNav from './TopNav.jsx'
import './HistoryScreen.css'

const CHECK_ORDER = ['contour_shape', 'texture_lbp', 'noise_check']
const CHECK_LABEL = {
  contour_shape: 'Frequency Pattern',
  texture_lbp: 'Call Duration',
  noise_check: 'Background Noise Check',
}

const TIER_COLOR = { high: 'var(--tier-high)', medium: 'var(--tier-medium)', low: 'var(--tier-low)' }
const TIER_LABEL = { high: 'NARW', medium: 'Possible NARW', low: 'Not NARW' }

function formatTimestamp(date) {
  const datePart = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const timePart = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${datePart}  ${timePart}`
}

export default function HistoryScreen({ onNavigate, history }) {
  const [expandedId, setExpandedId] = useState(null)

  return (
    <div className="narw-screen history">
      <TopNav onNavigate={onNavigate} />
      <h1 className="history__heading">History</h1>

      <div className="history__panel">
        {history.length === 0 ? (
          <p className="history__empty">No clips reviewed this session yet.</p>
        ) : (
          <ul className="history__list">
            {history.map((entry) => {
              const tier = entry.result.confidence_tier
              const isExpanded = expandedId === entry.id
              return (
                <li key={entry.id} className="history__row">
                  <div className="history__row-main">
                    <button
                      className="history__expand"
                      onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                    >
                      <span className="history__dot" style={{ background: TIER_COLOR[tier] }} />
                      <span className={`history__arrow ${isExpanded ? 'history__arrow--open' : ''}`}>▶︎</span>
                    </button>

                    <div className="history__label-block">
                      <p className="history__label">{TIER_LABEL[tier]}</p>
                      <p className="history__location">{entry.location}</p>
                    </div>

                    <div className="history__meta">
                      <span className="history__timestamp">{formatTimestamp(entry.timestamp)}</span>
                      <span className="history__score" style={{ color: TIER_COLOR[tier] }}>
                        {Math.round(entry.result.confidence * 100)}%
                      </span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="history__details">
                      <p>clip: {entry.name}</p>
                      <p>prediction: {entry.result.prediction}</p>
                      <p>confidence: {entry.result.confidence}</p>
                      {CHECK_ORDER.map((key) => (
                        <p key={key}>
                          {CHECK_LABEL[key]}: vote={String(entry.result.council[key].vote)}, score=
                          {entry.result.council[key].score}
                        </p>
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
