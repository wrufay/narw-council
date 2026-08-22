import './CouncilPanel.css'

const VOTE_ICON = { pass: '✅', warn: '⚠️', fail: '❌' }

const TIER_COPY = {
  high: {
    label: 'High confidence',
    message: 'Strong signal — notify is the primary action.',
    className: 'tier--high',
  },
  medium: {
    label: 'Medium confidence',
    message: 'Possible detection — flagged for human review, not auto-escalated.',
    className: 'tier--medium',
  },
  low: {
    label: 'Low confidence',
    message: 'Likely not a NARW call — logged anyway, patterns over time may matter.',
    className: 'tier--low',
  },
}

const CHECK_LABEL = {
  frequency_pattern: 'Frequency pattern',
  call_duration: 'Call duration',
  background_noise: 'Background noise',
}

export default function CouncilPanel({ result, isClassifying }) {
  return (
    <div className="glass-panel panel">
      <p className="panel__title">Council Verdict</p>

      {isClassifying && <p className="council-panel__empty">Council is reviewing the clip…</p>}

      {!isClassifying && !result && (
        <p className="council-panel__empty">Run a clip through the council to see its verdict here.</p>
      )}

      {!isClassifying && result && (
        <>
          <div className={`council-panel__tier ${TIER_COPY[result.confidence_tier].className}`}>
            <div className="council-panel__tier-top">
              <span className="council-panel__tier-label">{TIER_COPY[result.confidence_tier].label}</span>
              <span className="council-panel__score">{Math.round(result.confidence_score * 100)}%</span>
            </div>
            <p className="council-panel__tier-message">{TIER_COPY[result.confidence_tier].message}</p>
          </div>

          <ul className="council-panel__votes">
            {result.council.map((c) => (
              <li key={c.check}>
                <span className="council-panel__vote-icon">{VOTE_ICON[c.vote]}</span>
                <div>
                  <div className="council-panel__vote-head">
                    <span>{CHECK_LABEL[c.check] || c.check}</span>
                    <span className="council-panel__vote-score">{Math.round(c.score * 100)}%</span>
                  </div>
                  <p>{c.detail}</p>
                </div>
              </li>
            ))}
          </ul>

          <p className="council-panel__meta">
            {result.audio_duration_sec}s clip · model {result.model_version}
          </p>
        </>
      )}
    </div>
  )
}
