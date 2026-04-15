import axios from 'axios'

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  timeout: 60000, // 60s for AI calls
})

export interface Book {
  id: number
  title: string
  author: string
  rating: number | null
  num_reviews: number | null
  description: string
  price: string
  availability: string
  book_url: string
  cover_image_url: string
  genre: string
  ai_summary: string
  ai_genre: string
  ai_sentiment: string
  ai_processed: boolean
  created_at: string
}

export interface RAGResult {
  answer: string
  sources: { id: number; title: string; url: string }[]
  context_used: string
  cached: boolean
}

export interface ChatHistoryItem {
  id: number
  question: string
  answer: string
  sources: number[]
  created_at: string
}

// Books
export const getBooks = (params?: Record<string, string>) =>
  API.get<{ count: number; results: Book[] }>('/books/', { params })

export const getBook = (id: number) =>
  API.get<Book>(`/books/${id}/`)

export const getRecommendations = (id: number) =>
  API.get<{ results: Book[]; cached: boolean }>(`/books/${id}/recommend/`)

export const triggerScraper = (pages: number) =>
  API.post('/books/scrape/', { pages })

export const processBookAI = (id: number) =>
  API.post(`/books/${id}/process-ai/`)

// RAG
export const ragQuery = (question: string, top_k = 5) =>
  API.post<RAGResult>('/rag/query/', { question, top_k })

// Chat history
export const getChatHistory = () =>
  API.get<{ results: ChatHistoryItem[] }>('/chat-history/')

export default API
