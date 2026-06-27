'use client'

import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Sparkles,
  Send,
  Loader2,
  User,
  Bot,
  Calculator,
  ShieldCheck,
  TrendingUp,
  Lightbulb,
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const SUGGESTIONS = [
  { icon: Calculator, text: 'What is the GOSI contribution rate in Saudi Arabia?', label: 'Formula' },
  { icon: ShieldCheck, text: 'What are the compliance deadlines for payroll in UAE?', label: 'Compliance' },
  { icon: TrendingUp, text: 'Help me detect if any payroll amounts look unusual', label: 'Anomaly' },
  { icon: Lightbulb, text: 'Write a formula for housing allowance as 25% of basic', label: 'Builder' },
]

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm your PayrollPro AI assistant. I can help you with:

• **Formula building** — generate payroll formulas for any country
• **Compliance advice** — tax rates, social insurance, labor law deadlines
• **Anomaly detection** — flag unusual salary changes or calculation errors
• **Payroll guidance** — explain calculations, compare rules across countries

How can I help you today?`,
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text: string) {
    if (!text.trim()) return
    setInput('')

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (!res.ok) {
        const j = await res.json() as { message?: string }
        toast.error(j.message ?? 'AI assistant is temporarily unavailable')
        return
      }

      // Stream the response
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      const assistantMsgId = crypto.randomUUID()
      setMessages((prev) => [
        ...prev,
        { id: assistantMsgId, role: 'assistant', content: '', timestamp: new Date() },
      ])

      if (reader) {
        let accumulated = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          accumulated += decoder.decode(value, { stream: true })
          const snapshot = accumulated
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, content: snapshot } : m
            )
          )
        }
      }
    } catch {
      toast.error('Failed to connect to AI. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">AI Payroll Assistant</h1>
          <p className="text-xs text-gray-400">Powered by GPT-4o · Data is anonymized before sending</p>
        </div>
        <Badge className="ml-auto bg-green-100 text-green-700 text-xs">Online</Badge>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'assistant'
                ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                : 'bg-gray-200'
            }`}>
              {msg.role === 'assistant'
                ? <Bot className="w-4 h-4 text-white" />
                : <User className="w-4 h-4 text-gray-600" />
              }
            </div>
            <Card className={`max-w-[80%] border-0 shadow-sm ${
              msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white'
            }`}>
              <CardContent className="p-3">
                <div
                  className={`text-sm whitespace-pre-wrap leading-relaxed ${
                    msg.role === 'user' ? 'text-white' : 'text-gray-800'
                  }`}
                  dangerouslySetInnerHTML={{
                    __html: msg.content
                      .replaceAll(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replaceAll('\n', '<br />')
                      .replaceAll('•', '•'),
                  }}
                />
                {msg.content === '' && loading && (
                  <div className="flex gap-1 items-center h-4">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions (only show when no user messages) */}
      {messages.length === 1 && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.text}
              className="flex items-start gap-2 p-3 text-left rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors text-xs"
              onClick={() => sendMessage(s.text)}
            >
              <s.icon className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <span className="text-gray-600">{s.text}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-3 pt-4 border-t border-gray-100">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about payroll formulas, compliance, or calculations…"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void sendMessage(input)
            }
          }}
          disabled={loading}
          className="flex-1"
        />
        <Button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          size="icon"
          className="shrink-0"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-center text-gray-400 mt-2">
        All data is anonymized before being sent to AI. No employee names or IDs are shared.
      </p>
    </div>
  )
}
