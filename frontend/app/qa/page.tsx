'use client'
import { useState, useEffect, useRef } from 'react'
import { Send, Sparkles, BookOpen, Clock, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { ragQuery, getChatHistory, type RAGResult, type ChatHistoryItem } from '@/lib/api'
import { TextSkeleton } from '@/components/Skeleton'

const SAMPLE_QUESTIONS = [
  'What mystery books do you recommend?',
  'Tell me about books with a dark tone',
  'Which books are highly rated?',
  'What fantasy novels are available?',
  'Suggest books similar to romance genre',
]

interface Message {
  id: string
  type: 'user' | 'ai'
  text: string
  result?: RAGResult
  loading?: boolean
  timestamp: Date
}

function SourceChip({ source }: { source: { id: number; title: string; url: string } }) {
  return (
    <Link href={`/books/${source.id}`}
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors"
      style={{ background: 'var(--cream)', color: 'var(--forest)', border: '1px solid var(--border)' }}>
      <BookOpen size={11} />
      {source.title.length > 30 ? source.title.slice(0, 30) + '…' : source.title}
    </Link>
  )
}

function AIMessage({ msg }: { msg: Message }) {
  const [showContext, setShowContext] = useState(false)

  if (msg.loading) {
    return (
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'var(--forest)' }}>
          <Sparkles size={14} color="white" className="animate-pulse" />
        </div>
        <div className="flex-1 rounded-2xl rounded-tl-sm p-4"
          style={{ background: 'white', border: '1px solid var(--border)', maxWidth: '80%' }}>
          <TextSkeleton lines={3} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 fade-up">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{ background: 'var(--forest)' }}>
        <Sparkles size={14} color="white" />
      </div>
      <div className="flex-1" style={{ maxWidth: '82%' }}>
        <div className="rounded-2xl rounded-tl-sm p-5"
          style={{ background: 'white', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <p style={{ color: 'var(--ink)', fontSize: '0.92rem', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
            {msg.result?.answer || msg.text}
          </p>

          {/* Sources */}
          {msg.result?.sources && msg.result.sources.length > 0 && (
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '8px' }}>
                Sources
              </p>
              <div className="flex flex-wrap gap-2">
                {msg.result.sources.map(s => <SourceChip key={s.id} source={s} />)}
              </div>
            </div>
          )}

          {/* Cached badge */}
          {msg.result?.cached && (
            <span className="mt-3 inline-block text-xs px-2 py-0.5 rounded"
              style={{ background: 'var(--cream)', color: 'var(--muted)' }}>
              ⚡ Cached response
            </span>
          )}

          {/* Context toggle (for debugging / transparency) */}
          {msg.result?.context_used && (
            <div className="mt-3">
              <button onClick={() => setShowContext(!showContext)}
                className="flex items-center gap-1 text-xs transition-colors"
                style={{ color: 'var(--muted)' }}>
                {showContext ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showContext ? 'Hide' : 'Show'} retrieved context
              </button>
              {showContext && (
                <pre className="mt-2 p-3 rounded-lg text-xs overflow-auto fade-up"
                  style={{ background: 'var(--cream)', color: 'var(--muted)',
                    maxHeight: '150px', whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                  {msg.result.context_used}
                </pre>
              )}
            </div>
          )}
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '4px', marginLeft: '4px' }}>
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

function UserMessage({ msg }: { msg: Message }) {
  return (
    <div className="flex gap-3 justify-end fade-up">
      <div style={{ maxWidth: '75%' }}>
        <div className="rounded-2xl rounded-tr-sm px-5 py-3"
          style={{ background: 'var(--forest)', color: 'white' }}>
          <p style={{ fontSize: '0.92rem', lineHeight: 1.6 }}>{msg.text}</p>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '4px',
          marginRight: '4px', textAlign: 'right' }}>
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

export default function QAPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState<ChatHistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load chat history on mount
  useEffect(() => {
    getChatHistory().then(res => setHistory(res.data.results)).catch(() => {})
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (question: string) => {
    if (!question.trim() || sending) return
    setInput('')
    setSending(true)

    const userMsg: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: question,
      timestamp: new Date(),
    }
    const loadingMsg: Message = {
      id: Date.now().toString() + '_ai',
      type: 'ai',
      text: '',
      loading: true,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMsg, loadingMsg])

    try {
      const res = await ragQuery(question)
      const aiMsg: Message = {
        id: loadingMsg.id,
        type: 'ai',
        text: res.data.answer,
        result: res.data,
        timestamp: new Date(),
      }
      setMessages(prev => prev.map(m => m.id === loadingMsg.id ? aiMsg : m))
      // Refresh history
      getChatHistory().then(r => setHistory(r.data.results)).catch(() => {})
    } catch (e: any) {
      const errMsg: Message = {
        id: loadingMsg.id,
        type: 'ai',
        text: e?.response?.data?.error || 'Something went wrong. Make sure LM Studio is running.',
        timestamp: new Date(),
      }
      setMessages(prev => prev.map(m => m.id === loadingMsg.id ? errMsg : m))
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col" style={{ height: 'calc(100vh - 64px - 80px)' }}>

      {/* Header */}
      <div className="mb-6 fade-up flex items-start justify-between">
        <div>
          <h1 className="text-3xl mb-1" style={{ color: 'var(--forest)', letterSpacing: '-0.02em' }}>
            Ask About Books
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
            Powered by LM Studio + ChromaDB RAG pipeline
          </p>
        </div>
        <button onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm"
          style={{ background: 'var(--cream)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
          <Clock size={14} />
          History ({history.length})
        </button>
      </div>

      {/* Chat history panel */}
      {showHistory && history.length > 0 && (
        <div className="mb-5 rounded-2xl overflow-hidden fade-up"
          style={{ border: '1px solid var(--border)', background: 'white', maxHeight: '220px', overflow: 'auto' }}>
          <div className="px-4 py-3 flex items-center gap-2 sticky top-0"
            style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
            <Clock size={13} style={{ color: 'var(--muted)' }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Previous Questions
            </span>
          </div>
          {history.map(h => (
            <button key={h.id} onClick={() => { setShowHistory(false); sendMessage(h.question) }}
              className="w-full text-left px-4 py-3 transition-colors hover:bg-amber-50"
              style={{ borderBottom: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--ink)' }}>
              <span style={{ color: 'var(--muted)', marginRight: '8px' }}>Q:</span>
              {h.question}
            </button>
          ))}
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-5 mb-5 pr-1">
        {messages.length === 0 ? (
          <div className="fade-up">
            {/* Welcome state */}
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'var(--forest)' }}>
                <Sparkles size={28} color="var(--amber)" />
              </div>
              <h2 className="text-xl mb-2" style={{ color: 'var(--ink)' }}>Ask anything about your books</h2>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', maxWidth: '360px', margin: '0 auto' }}>
                The AI searches your book library using semantic similarity and generates answers with citations.
              </p>
            </div>

            {/* Sample questions */}
            <div className="mt-6">
              <p style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '12px', textAlign: 'center' }}>
                Try asking
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {SAMPLE_QUESTIONS.map(q => (
                  <button key={q} onClick={() => sendMessage(q)}
                    className="px-4 py-2 rounded-xl text-sm transition-all card-lift"
                    style={{ background: 'white', border: '1px solid var(--border)', color: 'var(--ink)' }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map(msg =>
            msg.type === 'user'
              ? <UserMessage key={msg.id} msg={msg} />
              : <AIMessage key={msg.id} msg={msg} />
          )
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input box */}
      <form onSubmit={handleSubmit}
        className="rounded-2xl flex items-end gap-3 p-3 fade-up"
        style={{
          background: 'white',
          border: '1.5px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          animationDelay: '0.15s',
        }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any) } }}
          placeholder="Ask about books, genres, recommendations…"
          rows={1}
          className="flex-1 outline-none resize-none bg-transparent text-sm px-2 py-1"
          style={{ color: 'var(--ink)', maxHeight: '120px', lineHeight: 1.6 }}
          disabled={sending}
        />
        <button type="submit" disabled={sending || !input.trim()}
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all"
          style={{
            background: sending || !input.trim() ? 'var(--border)' : 'var(--forest)',
            color: 'white',
            cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
          }}>
          <Send size={16} className={sending ? 'animate-pulse' : ''} />
        </button>
      </form>
    </div>
  )
}
