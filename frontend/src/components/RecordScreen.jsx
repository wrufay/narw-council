import { useEffect, useRef, useState } from 'react'
import Waveform from './Waveform.jsx'
import TopNav from './TopNav.jsx'
import jellyfish from '../assets/record-jellyfish-blue.png'
import swirlBg from '../assets/record-swirl-bg.png'
import whaleSparkle from '../assets/record-whale-sparkle.png'
import './RecordScreen.css'

export default function RecordScreen({ onNavigate, audioFile, onFileSelected, onClassify, isClassifying, error }) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordError, setRecordError] = useState(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const fileInputRef = useRef(null)
  const [audioUrl, setAudioUrl] = useState(null)

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

  return (
    <div className="narw-screen record">
      <div className="record__bg record__bg--swirl">
        <img src={swirlBg} alt="" />
      </div>
      <div className="record__bg record__bg--jellyfish">
        <img src={jellyfish} alt="" />
      </div>
      <div className="record__bg record__bg--sparkle">
        <img src={whaleSparkle} alt="" />
      </div>

      <TopNav onNavigate={onNavigate} />

      <div className="record__panel">
        <p className="record__prompt">Record/upload audio clip on the boat to get a verdict.</p>

        <div className="record__controls">
          <button
            className={`pill-btn record__control-btn ${isRecording ? 'record__control-btn--active' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
          >
            {isRecording ? 'Stop' : 'Record'}
          </button>
          <button className="pill-btn record__control-btn" onClick={() => fileInputRef.current?.click()}>
            Upload
          </button>
          <input ref={fileInputRef} type="file" accept="audio/*" hidden onChange={handleFileInput} />
        </div>

        {recordError && <p className="record__error">{recordError}</p>}

        {audioFile && (
          <div className="record__preview">
            <Waveform audioUrl={audioUrl} />
            <div className="record__file-row">
              <span>{audioFile.name}</span>
              {audioUrl && <audio src={audioUrl} controls />}
            </div>
          </div>
        )}

        {error && <p className="record__error">{error}</p>}

        <button
          className="pill-btn record__submit"
          onClick={onClassify}
          disabled={!audioFile || isClassifying}
        >
          {isClassifying ? 'Convening council…' : 'Run Council Analysis'}
        </button>
      </div>
    </div>
  )
}
