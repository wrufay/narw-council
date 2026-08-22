import splashWaves from '../assets/splash-waves.png'
import splashSwirl from '../assets/splash-swirl.png'
import './SplashScreen.css'

export default function SplashScreen({ onTutorial, onStart }) {
  return (
    <div className="narw-screen splash">
      <div className="splash__bg splash__bg--waves">
        <img src={splashWaves} alt="" />
      </div>
      <div className="splash__bg splash__bg--swirl-a">
        <img src={splashSwirl} alt="" />
      </div>
      <div className="splash__bg splash__bg--swirl-b">
        <img src={splashSwirl} alt="" />
      </div>

      <div className="splash__card">
        <h1 className="splash__title">NARW Council</h1>
        <div className="splash__actions">
          <button className="pill-btn pill-btn--ghost" onClick={onTutorial}>
            Tutorial
          </button>
          <button className="pill-btn pill-btn--ghost" onClick={onStart}>
            Start
          </button>
        </div>
      </div>
    </div>
  )
}
