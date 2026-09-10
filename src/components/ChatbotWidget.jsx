import { useEffect, useRef, useState } from 'react'
import { Icon } from '@iconify/react'
import IconBadge from './ui/IconBadge'
import Button from './ui/Button'
import { sendChatMessage } from '../api/chat'
import { useLanguage } from '../i18n'

const GREETING = { id: 'greeting', from: 'bot', text: '안녕하세요! 트레블봇이에요 😊 여행 계획 짜는 거 도와드릴까요?' }

function createConversationId() {
  return globalThis.crypto?.randomUUID?.() || `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function createMessageId() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

// 봇 답변을 글자 단위로 써 내려간다 — 길어도 2초 안에 끝나도록 한 틱에 여러 글자씩
function TypedText({ text, animate, onProgress }) {
  const [shown, setShown] = useState(animate ? 0 : text.length)
  const done = shown >= text.length

  useEffect(() => {
    if (!animate) return undefined
    const total = text.length
    const step = Math.max(1, Math.ceil(total / 80))
    const id = setInterval(() => {
      setShown((current) => {
        const next = Math.min(total, current + step)
        if (next >= total) clearInterval(id)
        return next
      })
    }, 24)
    return () => clearInterval(id)
  }, [text, animate])

  useEffect(() => {
    onProgress?.()
  }, [shown, onProgress])

  return (
    <>
      {text.slice(0, shown)}
      {!done && <span className="chat-caret ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] bg-brand align-baseline" aria-hidden="true" />}
    </>
  )
}

function BotAvatar() {
  return (
    <IconBadge className="w-6 h-6 rounded-full bg-brand-light shrink-0 mr-1.5 mt-auto">
      <Icon icon="solar:chat-round-dots-bold" width={12} color="#2563EB" />
    </IconBadge>
  )
}

// 입력 중 말풍선 — 점 세 개가 파도처럼 튀고, 아래에 작은 안내가 따라온다
function TypingBubble() {
  return (
    <div className="chat-in-left flex flex-col items-start" role="status" aria-label="트레블봇이 답변을 작성 중">
      <div className="flex">
        <BotAvatar />
        <div className="flex h-9 items-center gap-1 rounded-2xl rounded-tl-sm border border-slate-100 bg-white px-3.5">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="chat-dot h-1.5 w-1.5 rounded-full bg-brand"
              style={{ animationDelay: `${dot * 160}ms` }}
            />
          ))}
        </div>
      </div>
      <span className="ml-8 mt-1 text-[10.5px] text-slate-400">트레블봇이 입력 중…</span>
    </div>
  )
}

export default function ChatbotWidget() {
  // UI 문구는 한국어 고정 — 선택 언어는 챗봇 답변 언어(API language 파라미터)에만 쓴다
  const { language } = useLanguage()
  const [open, setOpen] = useState(false)
  const [openCount, setOpenCount] = useState(0) // 열 때마다 대화가 다시 스르륵 쌓이도록 목록을 새로 마운트
  const [messages, setMessages] = useState([GREETING])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const conversationId = useRef(createConversationId())
  const abortRef = useRef(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const reduceMotion = useRef(prefersReducedMotion())

  const scrollToBottom = (smooth) => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth && !reduceMotion.current ? 'smooth' : 'auto' })
  }

  useEffect(() => {
    scrollToBottom(true)
  }, [messages, sending, open])

  // 패널이 열리면 입력창에 바로 커서를 둔다
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 250)
      return () => clearTimeout(id)
    }
    return undefined
  }, [open])

  function toggleOpen() {
    setOpen((v) => {
      if (!v) setOpenCount((c) => c + 1)
      return !v
    })
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return

    setMessages((prev) => [...prev, { id: createMessageId(), from: 'user', text }])
    setInput('')
    setError('')
    setSending(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await sendChatMessage(
        {
          message: text,
          conversationId: conversationId.current,
          language,
        },
        { signal: controller.signal }
      )
      setMessages((prev) => [...prev, { id: createMessageId(), from: 'bot', text: response.reply, typed: !reduceMotion.current }])
    } catch (err) {
      // 새 대화로 넘어가며 중단된 요청 — 새 대화 상태를 건드리지 않는다.
      if (controller.signal.aborted) return
      if (err.response?.status === 401) {
        setError('로그인 후 트레블봇을 이용할 수 있어요.')
      } else if (err.response?.status === 429) {
        setError('요청이 많아요. 잠시 후 다시 시도해주세요.')
      } else {
        setError('답변을 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
      }
    } finally {
      if (!controller.signal.aborted) setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleSend()
  }

  const handleNewConversation = () => {
    abortRef.current?.abort()
    conversationId.current = createConversationId()
    setMessages([{ ...GREETING, id: `greeting-${Date.now()}` }])
    setInput('')
    setError('')
    setSending(false)
  }

  return (
    // 루트는 pointer-events-none — 닫힌 패널의 투명 영역이 아래 요소(장바구니 버튼) 클릭을 가로채지 않게
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Popup — floating chat window */}
      <div
        className={`relative mb-4 origin-bottom-right transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? 'pointer-events-auto translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-3 scale-90 opacity-0'
        }`}
      >
        {/* Soft blurred contact shadow, for the floating feel */}
        <div className="absolute -bottom-4 left-6 right-6 h-9 bg-slate-900/25 blur-2xl rounded-full -z-10" />

        <div className="w-[300px] h-[480px] bg-white rounded-[28px] ring-1 ring-black/5 shadow-popup overflow-hidden flex flex-col">
          {/* Header */}
          <div className="shrink-0 bg-brand pt-5 pb-3 px-4 flex items-center gap-2.5">
            <IconBadge className="w-8 h-8 rounded-full bg-white/20 shrink-0">
              <Icon icon="solar:chat-round-dots-bold" width={16} color="white" />
            </IconBadge>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-white leading-tight">트레블봇</div>
              <div className="flex items-center gap-1.5 text-[10.5px] text-blue-50/90">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="chat-ping absolute inset-0 rounded-full bg-emerald-300" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-emerald-300" />
                </span>
                {sending ? '답변 작성 중' : '온라인'}
              </div>
            </div>
            <IconBadge
              as="button"
              onClick={handleNewConversation}
              className="w-7 h-7 rounded-full text-white/80 hover:bg-white/10 hover:rotate-180 transition-all duration-500 shrink-0"
              aria-label="새 대화"
            >
              <Icon icon="solar:restart-linear" width={17} />
            </IconBadge>
            <IconBadge
              as="button"
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-full text-white/80 hover:bg-white/10 transition-all shrink-0"
              aria-label="챗봇 닫기"
            >
              <Icon icon="solar:close-circle-linear" width={18} />
            </IconBadge>
          </div>

          {/* Messages — 열 때마다 새로 마운트해 대화가 차례로 스르륵 쌓인다 */}
          <div key={openCount} ref={scrollRef} className="flex-1 overflow-y-auto bg-slate-50 px-3 py-3 space-y-2.5">
            {messages.map((m, i) => {
              const isUser = m.from === 'user'
              return (
                <div
                  key={m.id}
                  className={`${isUser ? 'chat-in-right justify-end' : 'chat-in-left justify-start'} flex`}
                  style={{ animationDelay: `${Math.min(i, 6) * 55}ms` }}
                >
                  {!isUser && <BotAvatar />}
                  <div
                    className={`max-w-[76%] whitespace-pre-wrap px-3 py-2 text-[12.5px] leading-snug ${
                      isUser
                        ? 'bg-brand text-white rounded-2xl rounded-tr-sm shadow-[0_4px_12px_rgba(37,99,235,0.25)]'
                        : 'bg-white border border-slate-100 text-slate-700 rounded-2xl rounded-tl-sm'
                    }`}
                  >
                    {m.typed ? <TypedText text={m.text} animate onProgress={() => scrollToBottom(false)} /> : m.text}
                  </div>
                </div>
              )
            })}
            {sending && <TypingBubble />}
          </div>

          {/* Composer */}
          <div className="shrink-0 border-t border-slate-100 bg-white p-2.5">
            {error && (
              <p className="chat-in-left mb-2 px-1 text-[11px] text-rose-500" role="alert">
                {error}
              </p>
            )}
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={sending ? '답변을 기다리는 중…' : '메시지를 입력하세요...'}
                disabled={sending}
                className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-full px-3.5 py-2 text-[12.5px] outline-none transition-all focus:border-brand/50 focus:bg-white focus:ring-4 focus:ring-brand/10 disabled:opacity-60"
              />
              <Button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
                  input.trim() && !sending ? 'scale-100 hover:scale-110 active:scale-95' : 'scale-95'
                }`}
                aria-label="전송"
              >
                <Icon icon="solar:plain-2-bold" width={14} color="white" className={input.trim() && !sending ? '-rotate-12 transition-transform' : 'transition-transform'} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating action button */}
      <Button
        onClick={toggleOpen}
        className={`pointer-events-auto w-14 h-14 rounded-full border-[3px] border-white shadow-float flex items-center justify-center hover:scale-105 hover:shadow-float-hover ${
          open ? '' : 'animate-float'
        }`}
        aria-label={open ? '챗봇 닫기' : '챗봇 열기'}
        aria-expanded={open}
      >
        <span className={`flex transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'rotate-90' : 'rotate-0'}`}>
          <Icon icon={open ? 'solar:close-circle-bold' : 'solar:chat-round-dots-bold'} width={24} />
        </span>
      </Button>
    </div>
  )
}
