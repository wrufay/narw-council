import './TutorialOverlay.css'

const STEPS = [
  { icon: '🎙️', title: 'Record or upload', body: 'Capture the clip on the boat, or upload one you already have.' },
  { icon: '🐋', title: 'Council review', body: 'The classifier checks frequency pattern, call duration, and background noise — each is one "council vote".' },
  { icon: '📊', title: 'Confidence tier', body: 'High / medium / low — not a binary escalate-or-don’t. Medium means "flag for human review", not auto-escalate.' },
  { icon: '🗺️', title: 'Map & notify', body: 'See which fisheries fall within range of the detection, then send a simulated notify.' },
]

export default function TutorialOverlay({ onClose }) {
  return (
    <div className="tutorial-overlay" onClick={onClose}>
      <div className="glass-panel tutorial-card" onClick={(e) => e.stopPropagation()}>
        <div className="tutorial-card__header">
          <h2>How it works</h2>
          <button className="tutorial-card__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <ol className="tutorial-card__steps">
          {STEPS.map((step) => (
            <li key={step.title}>
              <span className="tutorial-card__icon">{step.icon}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <button className="pill-btn pill-btn--blue" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>
  )
}
