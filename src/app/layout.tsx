import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ConectaILPI',
  description: 'Sistema de Gestão de ILPI',
  robots: 'noindex, nofollow, noarchive',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
