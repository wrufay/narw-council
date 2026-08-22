import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import whaleTop from '../assets/landing-whale-top.png'
import whaleTail from '../assets/landing-whale-tail.png'
import whaleBottom from '../assets/landing-whale-bottom.png'
import './LandingScreen.css'

const PAPER_URL = 'https://arxiv.org/pdf/1611.04947'
const REPO_URL = 'https://github.com/wrufay/narw-council'

export default function LandingScreen() {
  const navigate = useNavigate()

  return (
    <div className="narw-screen landing">
      <div className="landing__hero">
        <video className="landing__hero-video" src="/landing-vid.mp4" autoPlay loop muted playsInline />

        <div className="landing__whale-layer" aria-hidden="true">
          <img className="landing__whale landing__whale--top" src={whaleTop} alt="" />
          <img className="landing__whale landing__whale--tail" src={whaleTail} alt="" />
          <img className="landing__whale landing__whale--bottom" src={whaleBottom} alt="" />
        </div>

        <div className="landing__hero-gradient" />

        <a
          className="landing__github-link"
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View source on GitHub"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </svg>
        </a>

        <div className="landing__hero-content">
          <span className="landing__eyebrow">North Atlantic Right Whale</span>
          <motion.h1
            className="landing__headline"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
          >
            right call
          </motion.h1>
          <p className="landing__subhead">
            Was that really a right whale? Find out in seconds, not hours.
          </p>

          <div className="landing__cta-row">
            <button className="landing__cta-secondary" onClick={() => navigate('/run/record')}>
              RUN ANALYSIS
            </button>
          </div>

          <div className="landing__trust-row">
            <span><strong>83.8%</strong>&nbsp;test accuracy</span>
            <span className="landing__trust-dot">&middot;</span>
            <a href={PAPER_URL} target="_blank" rel="noopener noreferrer">
              Esfahanian et al. 2017 &nearr;
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
