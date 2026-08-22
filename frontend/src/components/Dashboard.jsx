import { useEffect, useState } from 'react'
import UploadPanel from './UploadPanel.jsx'
import CouncilPanel from './CouncilPanel.jsx'
import DetectionMap from './DetectionMap.jsx'
import NotifyButton from './NotifyButton.jsx'
import HistoryLog from './HistoryLog.jsx'
import { classifyAudio, ClassifyError } from '../lib/api.js'
import { FALLBACK_COORDS } from '../data/fisheries.js'

export default function Dashboard({ onBack }) {
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
        { id: crypto.randomUUID(), name: audioFile.name, coords, result: data },
        ...prev,
      ])
    } catch (err) {
      setError(err instanceof ClassifyError ? err.message : 'Something went wrong classifying that clip.')
    } finally {
      setIsClassifying(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div className="app-shell__brand">
          <span>🐋</span>
          <span>NARW Council</span>
        </div>
        <button className="pill-btn pill-btn--ghost" onClick={onBack}>
          ← Back
        </button>
      </header>

      <div className="app-shell__grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <UploadPanel
            audioFile={audioFile}
            onFileSelected={handleFileSelected}
            onClassify={handleClassify}
            isClassifying={isClassifying}
            error={error}
          />
          <CouncilPanel result={result} isClassifying={isClassifying} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <DetectionMap coords={coords} usedFallbackLocation={usedFallbackLocation} result={result} />
          <NotifyButton coords={coords} result={result} />
        </div>
      </div>

      <HistoryLog history={history} />
    </div>
  )
}
