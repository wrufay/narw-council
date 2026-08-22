import { useEffect, useRef, useState } from 'react'
import Waveform from './Waveform.jsx'
import './UploadPanel.css'

export default function UploadPanel({ audioFile, onFileSelected, onClassify, isClassifying, error }) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordError, setRecordError] = useState(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const fileInputRef = useRef(null)
  const audioUrlRef = useRef(null)
  const [audioUrl, setAudioUrl] = useState(null)

  useEffect(() => {
    if (!audioFile) {
      setAudioUrl(null)
      return
    }
    const url = URL.createObjectURL(audioFile)
    audioUrlRef.current = url
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
    <div className="glass-panel panel">
      <p className="panel__title">Record / Upload</p>

      <div className="upload-panel__controls">
        <button
          className={`pill-btn ${isRecording ? 'pill-btn--pink' : 'pill-btn--blue'}`}
          onClick={isRecording ? stopRecording : startRecording}
        >
          {isRecording ? '⏺ Stop recording' : '🎙️ Record'}
        </button>
        <button className="pill-btn pill-btn--ghost" onClick={() => fileInputRef.current?.click()}>
          📁 Upload clip
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          hidden
          onChange={handleFileInput}
        />
      </div>

      {recordError && <p className="upload-panel__error">{recordError}</p>}

      {audioFile && (
        <div className="upload-panel__preview">
          <Waveform audioUrl={audioUrl} />
          <div className="upload-panel__file-row">
            <span className="upload-panel__filename">{audioFile.name}</span>
            {audioUrl && <audio src={audioUrl} controls />}
          </div>
        </div>
      )}

      {error && <p className="upload-panel__error">{error}</p>}

      <button
        className="pill-btn pill-btn--pink upload-panel__submit"
        onClick={onClassify}
        disabled={!audioFile || isClassifying}
      >
        {isClassifying ? 'Convening council…' : 'Run council review'}
      </button>
    </div>
  )
}
