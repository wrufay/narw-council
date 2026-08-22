import { useEffect, useState } from 'react'
import SplashScreen from './components/SplashScreen.jsx'
import TutorialScreen from './components/TutorialScreen.jsx'
import RecordScreen from './components/RecordScreen.jsx'
import ResultsScreen from './components/ResultsScreen.jsx'
import MapScreen from './components/MapScreen.jsx'
import HistoryScreen from './components/HistoryScreen.jsx'
import { classifyAudio, ClassifyError } from './lib/api.js'
import { FALLBACK_COORDS } from './data/fisheries.js'

export default function App() {
  const [screen, setScreen] = useState('splash')

  const [audioFile, setAudioFile] = useState(null)
  const [coords, setCoords] = useState(FALLBACK_COORDS)
  const [usedFallbackLocation, setUsedFallbackLocation] = useState(true)
  const [result, setResult] = useState(null)
  const [isClassifying, setIsClassifying] = useState(false)
  const [error, setError] = useState(null)
  const [history, setHistory] = useState([])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords([pos.coords.longitude, pos.coords.latitude])
        setUsedFallbackLocation(false)
      },
      () => setUsedFallbackLocation(true),
      { timeout: 5000 },
    )
  }, [])

  function handleFileSelected(file) {
    setAudioFile(file)
    setResult(null)
    setError(null)
  }

  async function handleClassify() {
    if (!audioFile) return
    setIsClassifying(true)
    setError(null)
    try {
      const data = await classifyAudio(audioFile)
      setResult(data)
      setHistory((prev) => [{ id: crypto.randomUUID(), name: audioFile.name, coords, result: data }, ...prev])
      setScreen('results')
    } catch (err) {
      setError(err instanceof ClassifyError ? err.message : 'Something went wrong classifying that clip.')
    } finally {
      setIsClassifying(false)
    }
  }

  function handleDismiss() {
    setResult(null)
    setAudioFile(null)
    setScreen('record')
  }

  switch (screen) {
    case 'tutorial':
      return <TutorialScreen onNavigate={setScreen} onStart={() => setScreen('record')} />
    case 'record':
      return (
        <RecordScreen
          onNavigate={setScreen}
          audioFile={audioFile}
          onFileSelected={handleFileSelected}
          onClassify={handleClassify}
          isClassifying={isClassifying}
          error={error}
        />
      )
    case 'results':
      return (
        <ResultsScreen onNavigate={setScreen} result={result} coords={coords} onDismiss={handleDismiss} />
      )
    case 'map':
      return (
        <MapScreen onNavigate={setScreen} coords={coords} usedFallbackLocation={usedFallbackLocation} result={result} />
      )
    case 'history':
      return <HistoryScreen onNavigate={setScreen} history={history} />
    case 'splash':
    default:
      return <SplashScreen onTutorial={() => setScreen('tutorial')} onStart={() => setScreen('record')} />
  }
}
