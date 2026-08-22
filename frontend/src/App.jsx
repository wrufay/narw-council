import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import LandingScreen from './components/LandingScreen.jsx'
import TutorialScreen from './components/TutorialScreen.jsx'
import ToolDesktop from './components/ToolDesktop.jsx'
import PageTransition from './components/PageTransition.jsx'
import RecordScreen from './components/RecordScreen.jsx'
import ResultsScreen from './components/ResultsScreen.jsx'
import MapScreen from './components/MapScreen.jsx'
import { classifyAudio, ClassifyError } from './lib/api.js'
import { FALLBACK_COORDS, nearestZoneName } from './data/fisheries.js'
import { haversineDistanceKm } from './lib/geo.js'

export default function App() {
  const location = useLocation()
  const navigate = useNavigate()

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
      setHistory((prev) => [
        {
          id: crypto.randomUUID(),
          name: audioFile.name,
          coords,
          location: nearestZoneName(coords, haversineDistanceKm),
          timestamp: new Date(),
          result: data,
        },
        ...prev,
      ])
      navigate('/run/council')
    } catch (err) {
      setError(err instanceof ClassifyError ? err.message : 'Something went wrong classifying that clip.')
    } finally {
      setIsClassifying(false)
    }
  }

  function handleDismiss() {
    setResult(null)
    setAudioFile(null)
    navigate('/run/classify')
  }

  // /run/* shares one persistent "monitor" frame - only cross into/out of it
  // should trigger the outer page transition, not every switch inside it.
  const sectionKey = location.pathname.startsWith('/run') ? '/run' : location.pathname

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={sectionKey}>
        <Route path="/" element={<PageTransition><LandingScreen /></PageTransition>} />
        <Route path="/tutorial" element={<PageTransition><TutorialScreen /></PageTransition>} />
        <Route path="/run" element={<PageTransition><ToolDesktop /></PageTransition>}>
          <Route index element={<Navigate to="classify" replace />} />
          <Route
            path="classify"
            element={
              <RecordScreen
                audioFile={audioFile}
                onFileSelected={handleFileSelected}
                onClassify={handleClassify}
                isClassifying={isClassifying}
                error={error}
                history={history}
              />
            }
          />
          <Route path="council" element={<ResultsScreen result={result} coords={coords} onDismiss={handleDismiss} />} />
          <Route
            path="map"
            element={<MapScreen coords={coords} usedFallbackLocation={usedFallbackLocation} result={result} />}
          />
        </Route>
      </Routes>
    </AnimatePresence>
  )
}
