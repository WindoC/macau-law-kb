import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock environment variables
// process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
// process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
// process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
// process.env.GEMINI_API_KEY = 'test-gemini-key'
// process.env.JWT_SECRET = 'test-jwt-secret'
// process.env.CSRF_SECRET = 'test-csrf-secret'

// jest.config.js
module.exports = {
  // other settings...
  setupFiles: ['<rootDir>/jest.env-setup.js'],
};

// Mock global Response for Node.js environment
class MockResponse {
  body: string
  status: number
  statusText: string
  headers: Map<string, string>

  constructor(body?: BodyInit | null, init: ResponseInit = {}) {
    this.body = typeof body === 'string' ? body : JSON.stringify(body)
    this.status = init.status || 200
    this.statusText = init.statusText || 'OK'
    this.headers = new Map(Object.entries(init.headers || {}))
  }

  async json(): Promise<any> {
    return JSON.parse(this.body)
  }

  async text(): Promise<string> {
    return this.body
  }
}

// Mock global Request for Node.js environment
class MockRequest {
  url: string
  method: string
  headers: Map<string, string>
  body?: string

  constructor(url: string, init: RequestInit = {}) {
    this.url = url
    this.method = init.method || 'GET'
    this.headers = new Map(Object.entries((init.headers as Record<string, string>) || {}))
    this.body = typeof init.body === 'string' ? init.body : undefined
  }

  async json(): Promise<any> {
    return this.body ? JSON.parse(this.body) : undefined
  }
}

// Mock Headers
class MockHeaders extends Map<string, string> {
  constructor(init?: HeadersInit) {
    super()
    if (init) {
      if (Array.isArray(init)) {
        init.forEach(([key, value]) => this.set(key, value))
      } else if (typeof init === 'object') {
        Object.entries(init).forEach(([key, value]) => this.set(key, value))
      }
    }
  }

  append(name: string, value: string): void {
    const existing = this.get(name)
    if (existing) {
      this.set(name, `${existing}, ${value}`)
    } else {
      this.set(name, value)
    }
  }
}

// Assign mocks to global (using type assertion to avoid conflicts)
;(global as any).Response = MockResponse
;(global as any).Request = MockRequest
;(global as any).Headers = MockHeaders
