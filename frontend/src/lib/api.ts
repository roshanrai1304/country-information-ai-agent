export interface FlagInfo {
  country: string
  png: string
  alt: string
}

export interface ApiResponse {
  answer: string
  countries: string[]
  flags: FlagInfo[]
  source: string | null
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export async function askQuestion(question: string): Promise<ApiResponse> {
  const response = await fetch(`${API_URL}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  })

  if (!response.ok) {
    // Try to read the backend's error message from the response body
    let message = 'The service is temporarily unavailable. Please try again.'
    try {
      const body = await response.json()
      if (body?.answer) message = body.answer
    } catch {
      // ignore parse failure — use default message
    }
    throw new ApiError(message, response.status)
  }

  return response.json()
}
