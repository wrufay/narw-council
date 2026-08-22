import { useState } from 'react'
import { FISHERIES, PROXIMITY_RADIUS_KM } from '../data/fisheries.js'
import { haversineDistanceKm } from '../lib/geo.js'
import './ResultsScreen.css'

const CHECK_ORDER = ['contour_shape', 'texture_lbp', 'noise_check']
const CHECK_LABEL = {
  contour_shape: 'Frequency Pattern',
  texture_lbp: 'Call Duration',
  noise_check: 'Background Noise Check',
}

const TIER_INFO = {
  high: {
    label: 'NARW',
    message: "It's a NARW! You can notify your team.",
    color: 'var(--tier-high)',
  },
  medium: {
    label: 'Possible NARW',
    message: 'Human review recommended before notifying.',
    color: 'var(--tier-medium)',
  },
  low: {
    label: 'Not NARW',
    message: 'Confidence too low to notify automatically.',
    color: 'var(--tier-low)',
  },
}

// pass/warn/fail derived from the check's own real score - not part of the
// API contract, just a friendlier read of the same number the pill shows.
function checkStatus(score) {
  if (score >= 0.6) return 'pass'
  if (score >= 0.35) return 'warn'
  return 'fail'
}

function CheckIcon({ status }) {
  if (status === 'pass') {
    return (
      <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (status === 'warn') {
    return (
      <svg width="10" height="9" viewBox="0 0 10 9" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M5 1L9.3 8H.7L5 1z"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path d="M5 4v1.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <circle cx="5" cy="7" r="0.6" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1l7 7M8 1L1 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export default function ResultsScreen({ result, coords, onDismiss }) {
  const [notifySent, setNotifySent] = useState(null)
  const [sentForReview, setSentForReview] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  if (!result) {
    return (
      <div className="narw-screen results">
        <p className="results__placeholder">Your results will show up here.</p>
      </div>
    )
  }

  const tier = TIER_INFO[result.confidence_tier]
  const inRange = FISHERIES.filter((f) => haversineDistanceKm(coords, f.coords) <= PROXIMITY_RADIUS_KM)

  function handleNotify() {
    setNotifySent({
      at: new Date().toLocaleTimeString(),
      recipients: inRange.map((f) => f.name),
    })
  }

  return (
    <div className="narw-screen results">
      <div className="results__content">
        <div className="results__card" style={{ borderLeftColor: tier.color }}>
          <span className="results__eyebrow">Council Verdict</span>

          <div className="results__verdict-row">
            <div className="results__verdict-label-row">
              <span className="results__dot" style={{ background: tier.color }} />
              <h1 className="results__label">{tier.label}</h1>
            </div>
            <span className="results__score" style={{ color: tier.color }}>
              {Math.round(result.confidence * 100)}%
            </span>
          </div>
          <p className="results__message" style={{ color: tier.color }}>
            {tier.message}
          </p>

          <div className="results__seats">
            {CHECK_ORDER.map((key) => {
              const check = result.council[key]
              const status = checkStatus(check.score)
              return (
                <div key={key} className={`results__seat results__seat--${status}`}>
                  <span className="results__seat-avatar">
                    <CheckIcon status={status} />
                  </span>
                  <span className="results__seat-label">{CHECK_LABEL[key]}</span>
                  <span className="results__seat-score">{check.score.toFixed(2)}</span>
                </div>
              )
            })}
          </div>

          <div className="results__actions">
            {result.confidence_tier === 'low' ? (
              <button className="pill-btn results__btn results__btn--low" onClick={onDismiss}>
                DISMISS
              </button>
            ) : (
              <>
                {result.confidence_tier === 'medium' && (
                  <button
                    className="pill-btn results__btn results__btn--high"
                    onClick={() => setSentForReview(true)}
                    disabled={sentForReview}
                  >
                    {sentForReview ? 'FLAGGED FOR REVIEW' : 'SEND FOR REVIEW'}
                  </button>
                )}
                <button
                  className={`pill-btn results__btn results__btn--${result.confidence_tier}`}
                  onClick={handleNotify}
                  disabled={inRange.length === 0}
                >
                  NOTIFY TEAM
                </button>
              </>
            )}
            <button className="pill-btn results__btn results__btn--ghost" onClick={() => setShowDetails((v) => !v)}>
              VIEW DETAILS
            </button>
          </div>

          {sentForReview && result.confidence_tier === 'medium' && (
            <p className="results__review-note">Flagged for human review (simulated) — nothing was actually sent.</p>
          )}

          {notifySent && (
            <div className="results__receipt">
              <span className="results__receipt-badge">SIMULATED — nothing was actually sent</span>
              <p>
                At {notifySent.at}, would notify {notifySent.recipients.length} fleet zone
                {notifySent.recipients.length === 1 ? '' : 's'}: {notifySent.recipients.join(', ')}
              </p>
            </div>
          )}

          {showDetails && (
            <div className="results__details">
              <p>prediction: {result.prediction}</p>
              <p>confidence: {result.confidence}</p>
              <p>confidence_tier: {result.confidence_tier}</p>
              {CHECK_ORDER.map((key) => (
                <p key={key}>
                  {key}: vote={String(result.council[key].vote)}, score={result.council[key].score}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
