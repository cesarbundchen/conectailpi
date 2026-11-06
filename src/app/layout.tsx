import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'ConectaILPI', template: '%s · ConectaILPI' },
  description: 'Gestão completa para instituições de longa permanência para idosos.',
  applicationName: 'ConectaILPI',
  robots: 'noindex, nofollow, noarchive',
  appleWebApp: { capable: true, title: 'ConectaILPI', statusBarStyle: 'black-translucent' },
  icons: {
    icon: [{ url: '/icon.png', type: 'image/png' }, { url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#01435F',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  )
}
