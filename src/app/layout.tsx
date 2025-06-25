import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import 'bootstrap/dist/css/bootstrap.min.css'
import './globals.css'
import BootstrapProvider from '@/components/BootstrapProvider'
import { AuthProvider } from '@/contexts/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Macau Law Knowledge Base',
  description: 'AI-powered legal search, Q&A, and consultation for Macau law',
  keywords: ['Macau law', 'legal search', 'AI consultation', 'legal Q&A'],
  authors: [{ name: 'Antonio Cheong' }],
  icons: {
    icon: [
      { url: '/law-logo.svg', type: 'image/svg+xml' },
    ],
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

/**
 * Root layout component for the application
 * Provides global styles, Bootstrap integration, and authentication context
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
        <link rel="icon" href="/law-logo.svg" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <BootstrapProvider />
          <div id="root">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
