import TopNav from './TopNav.jsx'
import './HistoryScreen.css'

const TIER_COLOR = { high: 'var(--tier-high)', medium: 'var(--tier-medium)', low: 'var(--tier-low)' }
const TIER_LABEL = { high: 'NARW', medium: 'Possible NARW', low: 'Not NARW' }

export default function HistoryScreen({ onNavigate, history }) {
  return (
    <div className="narw-screen history">
      <TopNav onNavigate={onNavigate} />
      <h1 className="history__heading">History</h1>

      <div className="history__panel">
        {history.length === 0 ? (
          <p className="history__empty">No clips reviewed this session yet.</p>
        ) : (
          <ul className="history__list">
            {history.map((entry) => (
              <li key={entry.id}>
                <span className="history__dot" style={{ background: TIER_COLOR[entry.result.confidence_tier] }} />
                <span className="history__name">{entry.name}</span>
                <span className="history__label">{TIER_LABEL[entry.result.confidence_tier]}</span>
                <span className="history__score">{Math.round(entry.result.confidence * 100)}%</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
