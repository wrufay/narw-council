import './HistoryLog.css'

const TIER_DOT = { high: 'var(--pass)', medium: 'var(--warn)', low: 'var(--fail)' }

export default function HistoryLog({ history }) {
  if (history.length === 0) return null

  return (
    <div className="glass-panel panel">
      <p className="panel__title">Detection History (this session)</p>
      <ul className="history-log">
        {history.map((entry) => (
          <li key={entry.id}>
            <span className="history-log__dot" style={{ background: TIER_DOT[entry.result.confidence_tier] }} />
            <span className="history-log__name">{entry.name}</span>
            <span className="history-log__prediction">{entry.result.species_prediction}</span>
            <span className="history-log__score">{Math.round(entry.result.confidence_score * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
