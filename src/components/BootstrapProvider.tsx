'use client'

import { useEffect } from 'react'

/**
 * Bootstrap JavaScript provider component
 * Loads Bootstrap JS functionality on the client side to avoid hydration issues
 */
export default function BootstrapProvider() {
  useEffect(() => {
    // Dynamically import Bootstrap JS only on client side
    const loadBootstrap = async () => {
      if (typeof window !== 'undefined') {
        try {
          // Import Bootstrap JS
          const bootstrap = await import('bootstrap')
          // Make bootstrap available globally if needed
          ;(window as any).bootstrap = bootstrap
        } catch (error) {
          console.warn('Failed to load Bootstrap JS:', error)
        }
      }
    }

    loadBootstrap()
  }, [])

  return null
}
