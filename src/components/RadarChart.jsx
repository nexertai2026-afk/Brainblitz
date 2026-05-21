import { useRef, useEffect } from 'react'

const LABELS = ['Memory', 'Speed', 'Logic', 'Focus', 'Language', 'Reflex']
const KEYS = ['memory', 'speed', 'logic', 'focus', 'language', 'reflex']
const COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6']

export default function RadarChart({ profile, size = 280 }) {
  const canvasRef = useRef(null)
  const center = size / 2
  const radius = size * 0.38
  const levels = 4

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    canvasRef.current.width = size * dpr
    canvasRef.current.height = size * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, size, size)

    const n = KEYS.length
    const angleStep = (Math.PI * 2) / n

    // Draw grid rings
    for (let lv = 1; lv <= levels; lv++) {
      const r = (radius / levels) * lv
      ctx.beginPath()
      for (let i = 0; i <= n; i++) {
        const angle = angleStep * i - Math.PI / 2
        const x = center + r * Math.cos(angle)
        const y = center + r * Math.sin(angle)
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // Draw axis lines
    for (let i = 0; i < n; i++) {
      const angle = angleStep * i - Math.PI / 2
      ctx.beginPath()
      ctx.moveTo(center, center)
      ctx.lineTo(center + radius * Math.cos(angle), center + radius * Math.sin(angle))
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.stroke()
    }

    // Draw data polygon
    ctx.beginPath()
    for (let i = 0; i <= n; i++) {
      const idx = i % n
      const val = (profile[KEYS[idx]] || 0) / 100
      const r = val * radius
      const angle = angleStep * idx - Math.PI / 2
      const x = center + r * Math.cos(angle)
      const y = center + r * Math.sin(angle)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.fillStyle = 'rgba(124, 58, 237, 0.2)'
    ctx.fill()
    ctx.strokeStyle = '#7c3aed'
    ctx.lineWidth = 2.5
    ctx.stroke()

    // Draw data points
    for (let i = 0; i < n; i++) {
      const val = (profile[KEYS[i]] || 0) / 100
      const r = val * radius
      const angle = angleStep * i - Math.PI / 2
      const x = center + r * Math.cos(angle)
      const y = center + r * Math.sin(angle)
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fillStyle = COLORS[i]
      ctx.fill()
      ctx.strokeStyle = '#0a0a1a'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // Draw labels
    ctx.font = '600 12px Outfit, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let i = 0; i < n; i++) {
      const angle = angleStep * i - Math.PI / 2
      const lx = center + (radius + 24) * Math.cos(angle)
      const ly = center + (radius + 24) * Math.sin(angle)
      ctx.fillStyle = COLORS[i]
      ctx.fillText(LABELS[i], lx, ly)

      // Value below label
      ctx.font = '700 11px Space Grotesk, monospace'
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.fillText(profile[KEYS[i]] || 0, lx, ly + 14)
      ctx.font = '600 12px Outfit, sans-serif'
    }
  }, [profile, size])

  return (
    <canvas ref={canvasRef} style={{ width: size, height: size }} />
  )
}
