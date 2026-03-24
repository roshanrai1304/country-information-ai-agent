const STORAGE_KEY = 'archivist_history'
const MAX_ENTRIES = 50

export interface HistoryEntry {
  id: string
  question: string
  answer: string
  countries: string[]
  timestamp: number
}

export function getHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function saveToHistory(entry: Omit<HistoryEntry, 'id'>): void {
  if (typeof window === 'undefined') return
  const history = getHistory()
  const newEntry: HistoryEntry = { ...entry, id: crypto.randomUUID() }
  history.unshift(newEntry)
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_ENTRIES)))
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(STORAGE_KEY)
}
