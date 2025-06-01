import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import 'bootstrap/dist/css/bootstrap.min.css'
import './globals.css'

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
        <div id="root">
          {children}
        </div>
        {/* Bootstrap JS - loaded at the end for better performance */}
        <script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"
          integrity="sha384-C6RzsynM9kWDrMNeT87bh95OGNyZPhcTNXj1NW7RuBCsyN/o0jlpcV8Qyq46cDfL"
          crossOrigin="anonymous"
          async
        />
      </body>
    </html>
  )
}
