import '~/styles/globals.css'

import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { type Metadata } from 'next'

import { TRPCReactProvider } from '~/trpc/react'

export const metadata: Metadata = {
  title: 'Supply Chain Optimization',
  description:
    'Optimize inventory and supplier allocation with ML-powered recommendations',
  icons: [{ rel: 'icon', url: '/favicon.ico' }],
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-blue-50 text-text-dark">
        <TRPCReactProvider>
          <div className="flex min-h-screen">{children}</div>
        </TRPCReactProvider>
      </body>
    </html>
  )
}
