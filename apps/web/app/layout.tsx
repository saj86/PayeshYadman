import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'سامانه نظارت شهرداری تهران',
  description: 'سامانه یکپارچه نظارت و پایش — قرارگاه بازرسی و نظارت شهرداری تهران',
  manifest: '/manifest.json',
  icons: { apple: '/icon-192.png' },
}

export const viewport: Viewport = {
  themeColor: '#070d15',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen bg-bg text-text-primary">{children}</body>
    </html>
  )
}
