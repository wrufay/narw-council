import { useNavigate } from 'react-router-dom'
import heroWaves from '../assets/splash-waves.png'
import tutorialWhale from '../assets/tutorial-whale.png'
import TopNav from './TopNav.jsx'
import './TutorialScreen.css'

export default function TutorialScreen() {
  const navigate = useNavigate()

  return (
    <div className="narw-screen tutorial">
      <img className="tutorial__bg-photo" src={heroWaves} alt="" />
      <div className="tutorial__bg-gradient" />

      <TopNav />

      <div className="tutorial__content">
        <span className="tutorial__eyebrow">How It Works</span>

        <p className="tutorial__quote">
          <span>&ldquo;I think I heard a </span>
          <em>right whale</em>
          <span>.&rdquo;</span>
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

        <button className="pill-btn tutorial__start" onClick={() => navigate('/run/classify')}>
          Start Now &rarr;
        </button>
      </div>

      <img className="tutorial__whale" src={tutorialWhale} alt="" />
    </div>
  )
}
