import { useEffect, useRef, useState } from 'react'
import {
  deleteNotification,
  extractTextMessage,
  receiveNotification,
} from '../api/greenApi'
import type { ChatMessage, Credentials } from '../types'

const waitForRetry = (signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timeoutId = globalThis.setTimeout(resolve, 3000)
    signal.addEventListener(
      'abort',
      () => {
        globalThis.clearTimeout(timeoutId)
        resolve()
      },
      { once: true },
    )
  })

interface UseNotificationsOptions {
  credentials: Credentials
  activeChatId: string
  onMessage: (message: ChatMessage) => void
}

export const useNotifications = ({
  credentials,
  activeChatId,
  onMessage,
}: UseNotificationsOptions) => {
  const [isListening, setIsListening] = useState(false)
  const [receiveError, setReceiveError] = useState<string | null>(null)
  const onMessageRef = useRef(onMessage)

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    if (!activeChatId) {
      setIsListening(false)
      setReceiveError(null)
      return
    }

    const controller = new AbortController()
    let stopped = false

    const listen = async () => {
      setIsListening(true)

      while (!stopped) {
        try {
          const notification = await receiveNotification(
            credentials,
            controller.signal,
          )
          setReceiveError(null)

          if (!notification) {
            continue
          }

          const message = extractTextMessage(notification.body)
          if (message?.chatId === activeChatId) {
            onMessageRef.current({
              id: message.id,
              direction: 'incoming',
              text: message.text,
              timestamp: message.timestamp,
            })
          }

          await deleteNotification(credentials, notification.receiptId)
        } catch (error) {
          if (controller.signal.aborted) {
            break
          }

          setReceiveError(
            error instanceof Error
              ? error.message
              : 'Не удалось получить входящие сообщения',
          )
          await waitForRetry(controller.signal)
        }
      }

      if (!stopped) setIsListening(false)
    }

    void listen()

    return () => {
      stopped = true
      controller.abort()
    }
  }, [activeChatId, credentials])

  return { isListening, receiveError }
}
