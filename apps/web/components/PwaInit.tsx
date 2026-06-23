'use client'
import { useEffect, useState } from 'react'

export default function PwaInit() {
  const [prompt, setPrompt] = useState<any>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    // Capture install prompt
    const handler = (e: any) => {
      e.preventDefault()
      setPrompt(e)
      const dismissed = sessionStorage.getItem('pwa-dismissed')
      if (!dismissed) setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function install() {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setShowBanner(false)
    setPrompt(null)
  }

  function dismiss() {
    setShowBanner(false)
    sessionStorage.setItem('pwa-dismissed', '1')
  }

  if (!showBanner) return null

  return (
    <div
      dir="rtl"
      style={{
        position: 'fixed', bottom: '1rem', left: '1rem', right: '1rem', zIndex: 9999,
        background: '#1a2332', border: '1px solid rgba(90,169,230,.35)', borderRadius: '1rem',
        padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
        boxShadow: '0 8px 32px rgba(0,0,0,.5)',
      }}>
      <div style={{ fontSize: '1.8rem' }}>📲</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '.85rem', fontWeight: 700, color: '#fff' }}>نصب اپلیکیشن</div>
        <div style={{ fontSize: '.75rem', color: '#8b949e', marginTop: '.2rem' }}>برای دسترسی سریع‌تر نصب کنید</div>
      </div>
      <button onClick={install}
        style={{ padding: '.5rem 1rem', borderRadius: '.75rem', border: 'none', background: '#5aa9e6', color: '#0d1117', fontWeight: 700, fontSize: '.8rem', cursor: 'pointer' }}>
        نصب
      </button>
      <button onClick={dismiss}
        style={{ padding: '.5rem', borderRadius: '.5rem', border: 'none', background: 'transparent', color: '#8b949e', cursor: 'pointer', fontSize: '1rem' }}>
        ✕
      </button>
    </div>
  )
}
