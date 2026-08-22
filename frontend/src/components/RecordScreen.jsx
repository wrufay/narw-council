import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Waveform from './Waveform.jsx'
import HistoryScreen from './HistoryScreen.jsx'
import panelWhaleBg from '../assets/tutorial-whale.png'
import { nearestZoneName } from '../data/fisheries.js'
import { haversineDistanceKm } from '../lib/geo.js'
import './RecordScreen.css'

export default function RecordScreen({
  audioFile,
  onFileSelected,
  onClassify,
  isClassifying,
  error,
  history,
  coords,
  usedFallbackLocation,
  onUseCurrentLocation,
  onSetCoords,
}) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordError, setRecordError] = useState(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const fileInputRef = useRef(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [editingCoords, setEditingCoords] = useState(false)
  const [latInput, setLatInput] = useState('')
  const [lngInput, setLngInput] = useState('')

  function handleToggleEditCoords() {
    if (!editingCoords) {
      setLatInput(coords[1].toFixed(4))
      setLngInput(coords[0].toFixed(4))
    }
    setEditingCoords((v) => !v)
  }

  function handleApplyCoords(e) {
    e.preventDefault()
    const lat = parseFloat(latInput)
    const lng = parseFloat(lngInput)
    if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return
    onSetCoords(lat, lng)
    setEditingCoords(false)
  }

  useEffect(() => {
    if (!audioFile) {
      setAudioUrl(null)
      return
    }
    const url = URL.createObjectURL(audioFile)
    setAudioUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [audioFile])

  async function startRecording() {
    setRecordError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' })
        onFileSelected(file)
        stream.getTracks().forEach((t) => t.stop())
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch {
      setRecordError('Microphone access denied or unavailable — try uploading a clip instead.')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  function handleFileInput(e) {
    const file = e.target.files?.[0]
    if (file) onFileSelected(file)
  }

  function handleReset() {
    onFileSelected(null)
    setRecordError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="narw-screen record">
      <div className="record__intro">
        <h1 className="record__headline">
          <span className="record__headline-lead">"I think I heard a</span>
          <span className="record__headline-emphasis">right whale."</span>
        </h1>
        <div className="record__body">
          <p>
            NARW Council is an <span className="record__annotate">AI council</span> which scores the
            clip on multiple signals and tells NARW calls apart from similar species like humpback,
            fin, and minke whales.
          </p>
          <p>
            Just record the sound on a boat or upload audio clip and it will give you the answer in
            tiers based on how <span className="record__annotate">confident</span> NARW Council is!
          </p>
        </div>
      </div>

      <div className="record__right">
      <div className="record__panel">
        <img className="record__panel-bg" src={panelWhaleBg} alt="" aria-hidden="true" />

        <div className="record__location">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 21s7-6.4 7-12a7 7 0 10-14 0c0 5.6 7 12 7 12z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          {editingCoords ? (
            <form className="record__coords-form" onSubmit={handleApplyCoords}>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                placeholder="Lat"
                value={latInput}
                onChange={(e) => setLatInput(e.target.value)}
                className="record__coords-input"
              />
              <input
                type="number"
                step="any"
                inputMode="decimal"
                placeholder="Long"
                value={lngInput}
                onChange={(e) => setLngInput(e.target.value)}
                className="record__coords-input"
              />
              <button type="submit" className="record__location-btn">
                Set
              </button>
              <button type="button" className="record__location-btn" onClick={() => setEditingCoords(false)}>
                Cancel
              </button>
            </form>
          ) : (
            <>
              <span className="record__location-text">
                {usedFallbackLocation ? 'Fallback — ' : ''}
                {nearestZoneName(coords, haversineDistanceKm)}
              </span>
              <div className="record__location-actions">
                <button type="button" className="record__location-btn" onClick={onUseCurrentLocation}>
                  Use Current
                </button>
                <button type="button" className="record__location-btn" onClick={handleToggleEditCoords}>
                  Enter Lat/Long
                </button>
              </div>
            </>
          )}
        </div>

        <div className="record__controls">
          <motion.button
            whileTap={{ scale: 0.94 }}
            className={`pill-btn pill-btn--outline record__control-btn ${isRecording ? 'record__control-btn--active' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="9" y="2" width="6" height="12" rx="3" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M5 11a7 7 0 0014 0M12 18v3.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {isRecording ? 'Stop' : 'Record'}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.94 }}
            className="pill-btn pill-btn--outline record__control-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 19V6M6 11l6-6 6 6M5 21h14"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Upload
          </motion.button>
          <input ref={fileInputRef} type="file" accept="audio/*" hidden onChange={handleFileInput} />
        </div>

        <AnimatePresence>
          {isRecording && (
            <motion.div
              className="record__live"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <span className="record__live-dot" />
              Listening…
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {recordError && (
            <motion.p
              key="record-error"
              className="record__error"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {recordError}
            </motion.p>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {audioFile && (
            <motion.div
              className="record__preview"
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <Waveform audioUrl={audioUrl} />
              <div className="record__file-row">
                <span>{audioFile.name}</span>
                {audioUrl && <audio src={audioUrl} controls />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              key="classify-error"
              className="record__error"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="record__actions">
          <button
            className="pill-btn pill-btn--outline record__reset"
            onClick={handleReset}
            disabled={!audioFile || isClassifying}
          >
            Reset
          </button>
          <motion.button
            className="pill-btn record__submit"
            onClick={onClassify}
            disabled={!audioFile || isClassifying}
            animate={isClassifying ? { opacity: [1, 0.7, 1] } : { opacity: 1 }}
            transition={isClassifying ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : {}}
          >
            {isClassifying && <span className="record__spinner" />}
            {isClassifying ? 'Convening council…' : 'Run Council Analysis'}
          </motion.button>
        </div>
      </div>

      <div className="record__history-divider" />
      <HistoryScreen history={history} />
      </div>
    </div>
  )
}
