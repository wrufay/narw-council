import { useState } from 'react'
import Landing from './components/Landing.jsx'
import TutorialOverlay from './components/TutorialOverlay.jsx'
import Dashboard from './components/Dashboard.jsx'
import './App.css'

export default function App() {
  const [view, setView] = useState('landing')
  const [showTutorial, setShowTutorial] = useState(false)

  if (view === 'dashboard') {
    return <Dashboard onBack={() => setView('landing')} />
  }

  return (
    <>
      <Landing
        onStart={() => setView('dashboard')}
        onTutorial={() => setShowTutorial(true)}
      />
      {showTutorial && <TutorialOverlay onClose={() => setShowTutorial(false)} />}
    </>
  )
}
