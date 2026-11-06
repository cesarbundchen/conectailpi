import type { MetadataRoute } from 'next'

// Manifesto do aplicativo (PWA): permite "Instalar app" no Android, iPhone e computador
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ConectaILPI',
    short_name: 'ConectaILPI',
    description: 'Gestão completa para instituições de longa permanência para idosos.',
    lang: 'pt-BR',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#01435F',
    theme_color: '#01435F',
    categories: ['medical', 'business', 'productivity'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
