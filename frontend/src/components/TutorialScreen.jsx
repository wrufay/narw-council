import tutorialGlow from '../assets/tutorial-glow.png'
import tutorialWhale from '../assets/tutorial-whale.png'
import TopNav from './TopNav.jsx'
import './TutorialScreen.css'

export default function TutorialScreen({ onNavigate, onStart }) {
  return (
    <div className="narw-screen tutorial">
      <TopNav onNavigate={onNavigate} />

      <h1 className="tutorial__heading">Tutorial</h1>

      <div className="tutorial__glow">
        <img src={tutorialGlow} alt="" />
      </div>

      <div className="tutorial__body">
        <p className="tutorial__quote">
          <span>"I think I heard a </span>
          <strong>right whale</strong>
          <span>."</span>
        </p>

        <p className="tutorial__copy">
          NARW Council is an AI council which scores the clip on multiple signals and tells NARW
          calls apart from similar species like humpback, fin, and minke whales.
        </p>
        <p className="tutorial__copy">
          Just record the sound on a boat or upload audio clip and it will give you the answer in
          tiers based on how confident NARW Council is!
        </p>
        <p className="tutorial__copy">
          If you get a Possible NARW or higher, you can directly notify the team.
        </p>

        <button className="pill-btn tutorial__start" onClick={onStart}>
          Start Now
        </button>
      </div>

      <div className="tutorial__whale">
        <img src={tutorialWhale} alt="" />
      </div>
    </div>
  )
}
