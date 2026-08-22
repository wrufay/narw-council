import './Landing.css'

export default function Landing({ onStart, onTutorial }) {
  return (
    <div className="landing">
      <div className="landing__glow landing__glow--a" />
      <div className="landing__glow landing__glow--b" />
      <div className="landing__content">
        <span className="landing__eyebrow">🐋 field detection tool</span>
        <h1 className="landing__title glow-title">NARW Council</h1>
        <p className="landing__tagline">
          Turn "I think I heard something" into a confident, shareable verdict — in the moment,
          on the water.
        </p>
        <div className="landing__actions">
          <button className="pill-btn pill-btn--ghost" onClick={onTutorial}>
            Tutorial
          </button>
          <button className="pill-btn pill-btn--pink" onClick={onStart}>
            Start
          </button>
        </div>
      </div>
    </div>
  )
}
