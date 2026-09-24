import type {
  Credentials,
  IncomingNotification,
  IncomingNotificationBody,
} from '../types'

interface ApiErrorPayload {
  reason?: string
  message?: string
  description?: string
}

interface StateResponse {
  stateInstance?: string
}

interface CheckAccountResponse {
  exist?: boolean
  chatId?: string
  status?: boolean
  reason?: string
}

interface SendMessageResponse {
  idMessage?: string
}

const REQUEST_TIMEOUT_MS = 15_000

const statusFallbacks: Record<number, string> = {
  401: 'Проверьте idInstance и apiTokenInstance',
  403: 'Доступ запрещён. Проверьте состояние и ограничения аккаунта MAX',
  466: 'Достигнут лимит чатов тарифа MAX Developer',
  469: 'Слишком много проверок номеров. Повторите попытку позже',
}

const getErrorMessage = (
  payload: ApiErrorPayload | null,
  status: number,
): string =>
  payload?.reason ||
  payload?.message ||
  payload?.description ||
  statusFallbacks[status] ||
  `GREEN-API вернул ошибку ${status}`

const readErrorPayload = async (
  response: Response,
): Promise<ApiErrorPayload | null> => {
  const text = await response.text().catch(() => '')
  if (!text) return null

  try {
    return JSON.parse(text) as ApiErrorPayload
  } catch {
    return { message: text }
  }
}

const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const controller = new AbortController()
  const timeoutId = globalThis.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  )
  const headers = new Headers(init?.headers)

  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  try {
    const response = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,
    })

    if (!response.ok) {
      const payload = await readErrorPayload(response)
      throw new Error(getErrorMessage(payload, response.status))
    }

    if (response.status === 204) {
      return undefined as T
    }

    return (await response.json()) as T
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('GREEN-API не ответил вовремя. Повторите попытку.')
    }

    if (error instanceof TypeError) {
      throw new Error(
        'Не удалось связаться с GREEN-API. Проверьте apiUrl и подключение к интернету.',
      )
    }

    throw error
  } finally {
    globalThis.clearTimeout(timeoutId)
  }
}

export const normalizeApiUrl = (value: string): string => {
  let url: URL

  try {
    url = new URL(value.trim())
  } catch {
    throw new Error('Введите корректный apiUrl из кабинета GREEN-API')
  }

  const isLocalDevelopment = ['localhost', '127.0.0.1'].includes(url.hostname)
  if (url.protocol !== 'https:' && !isLocalDevelopment) {
    throw new Error('apiUrl должен использовать безопасный протокол HTTPS')
  }

  return url.toString().replace(/\/+$/, '')
}

const endpoint = (credentials: Credentials, method: string): string => {
  const apiUrl = normalizeApiUrl(credentials.apiUrl)
  const idInstance = encodeURIComponent(credentials.idInstance.trim())
  const apiTokenInstance = encodeURIComponent(
    credentials.apiTokenInstance.trim(),
  )

  return `${apiUrl}/waInstance${idInstance}/${method}/${apiTokenInstance}`
}

export const getStateInstance = async (
  credentials: Credentials,
): Promise<string> => {
  const data = await request<StateResponse>(
    endpoint(credentials, 'getStateInstance'),
  )

  if (!data.stateInstance) {
    throw new Error('Не удалось определить состояние инстанса')
  }

  return data.stateInstance
}

export const checkAccount = async (
  credentials: Credentials,
  phone: string,
): Promise<{ chatId: string }> => {
  const data = await request<CheckAccountResponse>(
    endpoint(credentials, 'checkAccount'),
    {
      method: 'POST',
      body: JSON.stringify({ phoneNumber: Number(phone) }),
    },
  )

  if (data.status === false) {
    throw new Error(data.reason || 'Не удалось проверить номер')
  }

  if (!data.exist || !data.chatId) {
    throw new Error('На этом номере не найден аккаунт MAX')
  }

  return { chatId: data.chatId }
}

export const sendMessage = async (
  credentials: Credentials,
  chatId: string,
  message: string,
): Promise<string> => {
  const data = await request<SendMessageResponse>(
    endpoint(credentials, 'sendMessage'),
    {
      method: 'POST',
      body: JSON.stringify({ chatId, message }),
    },
  )

  if (!data.idMessage) {
    throw new Error('API не вернул идентификатор сообщения')
  }

  return data.idMessage
}

export const receiveNotification = async (
  credentials: Credentials,
  signal: AbortSignal,
): Promise<IncomingNotification | null> => {
  try {
    const response = await fetch(
      `${endpoint(credentials, 'receiveNotification')}?receiveTimeout=5`,
      { signal },
    )

    if (!response.ok) {
      const payload = await readErrorPayload(response)
      throw new Error(getErrorMessage(payload, response.status))
    }

    const text = await response.text()
    if (!text.trim() || text.trim() === 'null') {
      return null
    }

    try {
      return JSON.parse(text) as IncomingNotification
    } catch {
      throw new Error('GREEN-API вернул уведомление в неизвестном формате')
    }
  } catch (error) {
    if (signal.aborted) throw error

    if (error instanceof TypeError) {
      throw new Error('Соединение с GREEN-API прервано')
    }

    throw error
  }
}

export const deleteNotification = async (
  credentials: Credentials,
  receiptId: number,
): Promise<void> => {
  await request<boolean>(
    `${endpoint(credentials, 'deleteNotification')}/${receiptId}`,
    { method: 'DELETE' },
  )
}

export const extractTextMessage = (
  body: IncomingNotificationBody,
): { chatId: string; id: string; text: string; timestamp: number } | null => {
  if (
    body.typeWebhook !== 'incomingMessageReceived' ||
    body.messageData?.typeMessage !== 'textMessage'
  ) {
    return null
  }

  const chatId = body.senderData?.chatId
  const text = body.messageData.textMessageData?.textMessage
  if (!chatId || !text) {
    return null
  }

  return {
    chatId,
    id: body.idMessage || `incoming-${body.timestamp || Date.now()}`,
    text,
    timestamp: (body.timestamp || Math.floor(Date.now() / 1000)) * 1000,
  }
}
