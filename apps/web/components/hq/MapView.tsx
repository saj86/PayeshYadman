'use client'
import { useEffect, useRef } from 'react'

export default function MapView() {
  const mapRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined' || mapRef.current) return
    import('leaflet').then(L => {
      if (!containerRef.current || mapRef.current) return

      const map = L.map(containerRef.current, {
        center: [35.6892, 51.3890],
        zoom: 12,
      })

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map)

      const points = [
        { lat: 35.7219, lng: 51.3347, name: 'مصلی امام خمینی(ره)', color: '#c2a35a', type: 'محوطه وداع' },
        { lat: 35.7010, lng: 51.3385, name: 'ایستگاه آب‌رسانی', color: '#5aa9e6', type: 'آب‌رسانی' },
        { lat: 35.6788, lng: 51.4230, name: 'موکب پذیرایی', color: '#e0c14f', type: 'پذیرایی' },
        { lat: 35.5970, lng: 51.3800, name: 'بهشت زهرا(س)', color: '#56c48a', type: 'محوطه تدفین' },
        { lat: 35.7215, lng: 51.3360, name: 'پارکینگ ورودی شرقی', color: '#b08ce0', type: 'پارکینگ' },
      ]

      points.forEach(p => {
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:14px;height:14px;border-radius:50%;background:${p.color};border:2px solid rgba(255,255,255,.6);box-shadow:0 0 8px ${p.color}88;"></div>`,
          iconSize: [14, 14],
        })
        L.marker([p.lat, p.lng], { icon }).addTo(map)
          .bindPopup(`<b style="font-family:Vazirmatn,sans-serif">${p.name}</b><br><small>${p.type}</small>`)
      })

      mapRef.current = map
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '400px' }}>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.min.css" />
    </div>
  )
}
