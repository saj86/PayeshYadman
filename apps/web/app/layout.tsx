import type { Metadata, Viewport } from 'next'
import './globals.css'
import PwaInit from '@/components/PwaInit'

export const metadata: Metadata = {
  title: 'سامانه پایش یادمان',
  description: 'سامانه پایش و مدیریت یادمان‌های شهری تهران',
  manifest: '/manifest.json',
  icons: { apple: '/icon-192.png' },
}

export const viewport: Viewport = {
  themeColor: '#5aa9e6',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <body className="min-h-screen bg-bg text-text-primary">
        {children}
        <PwaInit />
      </body>
    </html>
  )
}
