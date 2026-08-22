import { useState } from 'react'
import TopNav from './TopNav.jsx'
import resultsBg from '../assets/results-marble-bg.png'
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

export default function ResultsScreen({ onNavigate, result, coords, onDismiss }) {
  const [notifySent, setNotifySent] = useState(null)
  const [sentForReview, setSentForReview] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  if (!result) {
    return (
      <div className="narw-screen results">
        <TopNav onNavigate={onNavigate} />
        <h1 className="results__heading">Results</h1>
        <div className="results__panel results__panel--empty">
          <p>No verdict yet — run a clip through the council first.</p>
          <button className="pill-btn" onClick={() => onNavigate('record')}>
            Go record / upload
          </button>
        </div>
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
      <div className="results__bg">
        <img src={resultsBg} alt="" />
      </div>

      <TopNav onNavigate={onNavigate} />
      <h1 className="results__heading">Results</h1>

      <div className="results__panel" style={{ borderLeftColor: tier.color }}>
        <p className="results__title">COUNCIL VERDICT</p>

        <div className="results__verdict-row">
          <span className="results__dot" style={{ background: tier.color }} />
          <span className="results__label">{tier.label}</span>
          <span className="results__score" style={{ color: tier.color }}>
            {Math.round(result.confidence * 100)}%
          </span>
          <p className="results__message" style={{ color: tier.color }}>
            {tier.message}
          </p>
        </div>

        <ul className="results__checks">
          {CHECK_ORDER.map((key) => {
            const check = result.council[key]
            return (
              <li key={key}>
                {check.vote ? '✅' : '❌'} {CHECK_LABEL[key]} : <span className="results__check-score">{check.score.toFixed(2)}</span>
              </li>
            )
          })}
        </ul>

        <div className="results__actions">
          {result.confidence_tier === 'low' ? (
            <button className="pill-btn results__btn-ghost" onClick={onDismiss}>
              DISMISS
            </button>
          ) : (
            <>
              {result.confidence_tier === 'medium' && !sentForReview && (
                <button className="pill-btn results__btn-outline" onClick={() => setSentForReview(true)}>
                  SEND FOR REVIEW
                </button>
              )}
              {sentForReview && <span className="results__review-note">Flagged for human review (simulated)</span>}
              <button
                className="pill-btn results__btn-primary"
                style={{ background: tier.color }}
                onClick={handleNotify}
                disabled={inRange.length === 0}
              >
                NOTIFY TEAM
              </button>
            </>
          )}
          <button className="pill-btn results__btn-ghost" onClick={() => setShowDetails((v) => !v)}>
            VIEW DETAILS
          </button>
        </div>

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
  )
}
