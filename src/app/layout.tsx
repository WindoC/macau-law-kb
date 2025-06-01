import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import 'bootstrap/dist/css/bootstrap.min.css'
import './globals.css'
import BootstrapProvider from '@/components/BootstrapProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Macau Law Knowledge Base',
  description: 'AI-powered legal search, Q&A, and consultation for Macau law',
  keywords: ['Macau law', 'legal search', 'AI consultation', 'legal Q&A'],
  authors: [{ name: 'Macau Law KB Team' }],
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

/**
 * Root layout component for the application
 * Provides global styles and Bootstrap integration
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-HK">
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <BootstrapProvider />
        <div id="root">
          {children}
        </div>
      </body>
    </html>
  )
}
