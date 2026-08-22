import { useEffect, useRef, useState } from 'react'

const BAR_COUNT = 80

export default function Waveform({ audioUrl }) {
  const canvasRef = useRef(null)
  const [peaks, setPeaks] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!audioUrl) return
    let cancelled = false
    setPeaks(null)
    setFailed(false)

    async function decode() {
      try {
        const res = await fetch(audioUrl)
        const arrayBuffer = await res.arrayBuffer()
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        const ctx = new AudioCtx()
        const buffer = await ctx.decodeAudioData(arrayBuffer)
        const channel = buffer.getChannelData(0)
        const blockSize = Math.floor(channel.length / BAR_COUNT) || 1
        const computed = []
        for (let i = 0; i < BAR_COUNT; i++) {
          let sum = 0
          const start = i * blockSize
          for (let j = 0; j < blockSize && start + j < channel.length; j++) {
            sum += Math.abs(channel[start + j])
          }
          computed.push(sum / blockSize)
        }
        const max = Math.max(...computed, 0.0001)
        if (!cancelled) setPeaks(computed.map((v) => v / max))
        ctx.close()
      } catch {
        if (!cancelled) setFailed(true)
      }
    }

    decode()
    return () => {
      cancelled = true
    }
  }, [audioUrl])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !peaks) return
    const ctx = canvas.getContext('2d')
    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)
    const barWidth = width / peaks.length
    peaks.forEach((v, i) => {
      const barHeight = Math.max(2, v * height * 0.9)
      const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height)
      gradient.addColorStop(0, '#6fd8ff')
      gradient.addColorStop(1, '#4a8fc2')
      ctx.fillStyle = gradient
      ctx.fillRect(i * barWidth + 1, height - barHeight, barWidth - 2, barHeight)
    })
  }, [peaks])

  if (failed) return null

  return (
    <canvas
      ref={canvasRef}
      width={480}
      height={64}
      style={{ width: '100%', height: '64px', display: 'block' }}
    />
  )
}
