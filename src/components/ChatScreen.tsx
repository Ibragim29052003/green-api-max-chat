import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { checkAccount, sendMessage } from '../api/greenApi'
import { useNotifications } from '../hooks/useNotifications'
import type { ChatContact, ChatMessage, Credentials } from '../types'
import {
  formatPhone,
  formatPhoneInput,
  isSupportedPhone,
  normalizePhone,
} from '../utils/phone'
import { MaxLogo } from './MaxLogo'

interface ChatScreenProps {
  credentials: Credentials
  onLogout: () => void
}

const formatTime = (timestamp: number) =>
  new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)

export const ChatScreen = ({ credentials, onLogout }: ChatScreenProps) => {
  const [phoneInput, setPhoneInput] = useState('')
  const [contact, setContact] = useState<ChatContact | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [isCreatingChat, setIsCreatingChat] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const lastMessage = messages.at(-1)

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((current) => {
      if (current.some((item) => item.id === message.id)) {
        return current
      }
      return [...current, message]
    })
  }, [])

  const { isListening, receiveError } = useNotifications({
    credentials,
    activeChatId: contact?.chatId || '',
    onMessage: appendMessage,
  })

  useEffect(() => {
    if (!lastMessage) return

    const prefersReducedMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches
    messagesEndRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    })
  }, [lastMessage])

  useEffect(() => {
    if (contact) composerRef.current?.focus()
  }, [contact])

  const handleCreateChat = async (event: FormEvent) => {
    event.preventDefault()
    const phone = normalizePhone(phoneInput)

    if (!isSupportedPhone(phone)) {
      setChatError('Введите номер РФ или Беларуси в международном формате')
      return
    }

    setIsCreatingChat(true)
    setChatError(null)

    try {
      const { chatId } = await checkAccount(credentials, phone)
      setContact({ chatId, phone, name: formatPhone(phone) })
      setMessages([])
      setPhoneInput('')
    } catch (error) {
      setChatError(
        error instanceof Error ? error.message : 'Не удалось создать чат',
      )
    } finally {
      setIsCreatingChat(false)
    }
  }

  const handlePhoneKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const { selectionEnd, selectionStart, value } = event.currentTarget

    if (
      event.key !== 'Backspace' ||
      selectionStart === null ||
      selectionEnd === null ||
      selectionStart !== selectionEnd ||
      selectionStart === 0 ||
      /\d/.test(value[selectionStart - 1])
    ) {
      return
    }

    let digitIndex = selectionStart - 1
    while (digitIndex >= 0 && !/\d/.test(value[digitIndex])) {
      digitIndex -= 1
    }

    event.preventDefault()
    const nextValue =
      digitIndex >= 0
        ? `${value.slice(0, digitIndex)}${value.slice(digitIndex + 1)}`
        : ''
    setPhoneInput(formatPhoneInput(nextValue))
    setChatError(null)
  }

  const handleSendMessage = async (event: FormEvent) => {
    event.preventDefault()
    const text = messageInput.trim()

    if (!contact || !text || isSending) {
      return
    }

    setIsSending(true)
    setChatError(null)

    try {
      const id = await sendMessage(credentials, contact.chatId, text)
      appendMessage({
        id,
        direction: 'outgoing',
        text,
        timestamp: Date.now(),
        status: 'sent',
      })
      setMessageInput('')
    } catch (error) {
      setChatError(
        error instanceof Error
          ? error.message
          : 'Не удалось отправить сообщение',
      )
    } finally {
      setIsSending(false)
    }
  }

  return (
    <main className="chat-page">
      <aside className="sidebar">
        <header className="sidebar__header">
          <div className="sidebar__brand">
            <MaxLogo />
            <strong>MAX Chat</strong>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onLogout}
            title="Выйти"
            aria-label="Выйти из MAX Chat"
          >
            ↪
          </button>
        </header>

        <form
          className="new-chat-form"
          onSubmit={handleCreateChat}
          aria-busy={isCreatingChat}
        >
          <label htmlFor="phone">Новый чат</label>
          <div className="new-chat-form__controls">
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={19}
              placeholder="+7 (999) 123-45-67"
              value={phoneInput}
              onChange={(event) => {
                setPhoneInput(formatPhoneInput(event.target.value))
                setChatError(null)
              }}
              onKeyDown={handlePhoneKeyDown}
              aria-invalid={Boolean(chatError && !contact)}
              aria-describedby={
                chatError && !contact ? 'phone-error' : undefined
              }
            />
            <button
              type="submit"
              disabled={isCreatingChat}
              aria-label="Создать чат"
            >
              {isCreatingChat ? (
                '…'
              ) : (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h6" />
                  <path d="M18 2v6M15 5h6" />
                </svg>
              )}
            </button>
          </div>
          {chatError && !contact && (
            <div className="sidebar-error" id="phone-error" role="alert">
              {chatError}
            </div>
          )}
        </form>

        <div className="conversation-list">
          {contact ? (
            <article
              className="conversation conversation--active"
              aria-current="page"
            >
              <span className="avatar" aria-hidden="true">
                {contact.name.slice(1, 3)}
              </span>
              <span className="conversation__content">
                <strong>{contact.name}</strong>
                <small>
                  {lastMessage?.text || 'Чат создан. Напишите сообщение'}
                </small>
              </span>
              {lastMessage && <time>{formatTime(lastMessage.timestamp)}</time>}
            </article>
          ) : (
            <div className="sidebar-empty">
              <span>＋</span>
              <p>Введите номер, чтобы начать новый чат</p>
            </div>
          )}
        </div>

        <div className="sidebar__footer" role="status" aria-live="polite">
          <span
            className={`status-dot ${isListening ? 'status-dot--online' : ''}`}
          />
          {contact
            ? isListening
              ? 'GREEN-API подключён'
              : 'Подключение…'
            : 'GREEN-API готов'}
        </div>
      </aside>

      <section className="chat-panel">
        {contact ? (
          <>
            <header className="chat-header">
              <span className="avatar avatar--header" aria-hidden="true">
                {contact.name.slice(1, 3)}
              </span>
              <div>
                <h1>{contact.name}</h1>
                <small>{receiveError ? 'Ошибка получения' : 'MAX'}</small>
              </div>
            </header>

            <div
              className="messages"
              role="log"
              aria-label={`Переписка с ${contact.name}`}
              aria-live="polite"
            >
              {messages.length === 0 && (
                <div className="messages-empty">
                  <MaxLogo size="large" />
                  <h2>Чат создан</h2>
                  <p>Отправьте первое текстовое сообщение</p>
                </div>
              )}

              {messages.map((message) => (
                <article
                  className={`message message--${message.direction}`}
                  key={message.id}
                >
                  <p>{message.text}</p>
                  <footer>
                    <time>{formatTime(message.timestamp)}</time>
                    {message.direction === 'outgoing' && (
                      <span role="img" aria-label="Отправлено">
                        ✓
                      </span>
                    )}
                  </footer>
                </article>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {(chatError || receiveError) && (
              <div className="chat-error" role="alert">
                {chatError || receiveError}
              </div>
            )}

            <form
              className="composer"
              onSubmit={handleSendMessage}
              aria-busy={isSending}
            >
              <label className="visually-hidden" htmlFor="message">
                Текст сообщения
              </label>
              <textarea
                id="message"
                ref={composerRef}
                rows={1}
                maxLength={4000}
                placeholder="Сообщение"
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    event.currentTarget.form?.requestSubmit()
                  }
                }}
              />
              <button
                type="submit"
                disabled={!messageInput.trim() || isSending}
                aria-label="Отправить сообщение"
              >
                {isSending ? '…' : '➤'}
              </button>
            </form>
          </>
        ) : (
          <div className="welcome-state">
            <MaxLogo size="large" />
            <h1>Добро пожаловать в MAX Chat</h1>
            <p>Введите номер телефона, чтобы начать переписку</p>
          </div>
        )}
      </section>
    </main>
  )
}
