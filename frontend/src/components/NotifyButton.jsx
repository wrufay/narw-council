import { useState } from 'react'
import { FISHERIES, PROXIMITY_RADIUS_KM } from '../data/fisheries.js'
import { haversineDistanceKm } from '../lib/geo.js'
import './NotifyButton.css'

export default function NotifyButton({ coords, result }) {
  const [sent, setSent] = useState(null)

  const inRange = FISHERIES.filter((f) => haversineDistanceKm(coords, f.coords) <= PROXIMITY_RADIUS_KM)
  const isPrimary = result?.confidence_tier === 'high'
  const disabled = !result

  function handleNotify() {
    setSent({
      at: new Date().toLocaleTimeString(),
      recipients: inRange.map((f) => f.name),
      tier: result.confidence_tier,
      prediction: result.species_prediction,
    })
  }

  return (
    <div className="glass-panel panel">
      <p className="panel__title">Notify</p>

      {disabled && <p className="council-panel__empty">Run a council review first.</p>}

      {!disabled && !sent && (
        <>
          <p className="notify-panel__blurb">
            {inRange.length > 0
              ? `${inRange.length} fleet zone${inRange.length > 1 ? 's' : ''} within range of this detection.`
              : 'No fleet zones within range of this detection.'}
          </p>
          <button
            className={`pill-btn ${isPrimary ? 'pill-btn--pink' : 'pill-btn--ghost'}`}
            onClick={handleNotify}
            disabled={inRange.length === 0}
          >
            🔔 Send simulated notify
          </button>
        </>
      )}

      {sent && (
        <div className="notify-panel__receipt">
          <span className="notify-panel__badge">SIMULATED — nothing was actually sent</span>
          <p>
            At {sent.at}, would notify {sent.recipients.length} recipient
            {sent.recipients.length > 1 ? 's' : ''} of a <strong>{sent.tier}</strong>-confidence{' '}
            <strong>{sent.prediction}</strong> detection:
          </p>
          <ul>
            {sent.recipients.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
          <button className="pill-btn pill-btn--ghost" onClick={() => setSent(null)}>
            Reset
          </button>
        </div>
      )}
    </div>
  )
}
