import { useCallback, useEffect, useState } from 'react'
import { api } from './api'

export interface CaptchaState {
  id: string
  svg: string
  text: string
  loading: boolean
  setText: (value: string) => void
  refresh: () => void
  reset: () => void
}

/**
 * Pulls a fresh SVG challenge from the server. Each code is single-use,
 * so every submit — successful or not — is followed by a refresh.
 */
export function useCaptcha(): CaptchaState {
  const [id, setId] = useState('')
  const [svg, setSvg] = useState('')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setLoading(true)
    setText('')
    api
      .get<{ id: string; svg: string }>('/api/captcha')
      .then((data) => {
        setId(data.id)
        setSvg(data.svg)
      })
      .catch(() => setSvg(''))
      .finally(() => setLoading(false))
  }, [])

  useEffect(refresh, [refresh])

  return { id, svg, text, loading, setText, refresh, reset: refresh }
}
