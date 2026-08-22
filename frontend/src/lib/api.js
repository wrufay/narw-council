const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export class ClassifyError extends Error {}

export async function classifyAudio(file) {
  const form = new FormData()
  form.append('audio', file)

  let res
  try {
    res = await fetch(`${API_BASE_URL}/classify`, { method: 'POST', body: form })
  } catch {
    throw new ClassifyError('Could not reach the classifier backend. Is it running / awake?')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ClassifyError(body?.detail || `Classifier returned ${res.status}`)
  }

  return res.json()
}

export async function pingHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`)
    return res.ok
  } catch {
    return false
  }
}
