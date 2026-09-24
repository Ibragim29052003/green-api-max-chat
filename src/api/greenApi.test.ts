import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import type { Credentials, IncomingNotificationBody } from '../types'
import {
  checkAccount,
  deleteNotification,
  extractTextMessage,
  getStateInstance,
  normalizeApiUrl,
  receiveNotification,
  sendMessage,
} from './greenApi'

const credentials: Credentials = {
  apiUrl: 'https://3100.api.green-api.com/',
  idInstance: '3100000000',
  apiTokenInstance: 'secret-token',
}

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

const mockJson = (payload: unknown, status = 200) => {
  globalThis.fetch = (async () =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch
}

describe('GREEN-API client', () => {
  it('normalizes and validates API URLs', () => {
    assert.equal(
      normalizeApiUrl('https://3100.api.green-api.com///'),
      'https://3100.api.green-api.com',
    )
    assert.throws(() => normalizeApiUrl('http://example.com'), /HTTPS/)
    assert.equal(
      normalizeApiUrl('http://127.0.0.1:4174/'),
      'http://127.0.0.1:4174',
    )
  })

  it('checks the instance state', async () => {
    mockJson({ stateInstance: 'authorized' })
    assert.equal(await getStateInstance(credentials), 'authorized')
  })

  it('creates a chat only when the MAX account exists', async () => {
    mockJson({ exist: true, chatId: '10000000', fromCache: true })
    assert.deepEqual(await checkAccount(credentials, '79991234567'), {
      chatId: '10000000',
    })

    mockJson({ exist: false, chatId: '' })
    await assert.rejects(
      () => checkAccount(credentials, '79991234567'),
      /не найден аккаунт MAX/,
    )
  })

  it('sends a text message and returns its id', async () => {
    mockJson({ idMessage: 'message-id' })
    assert.equal(
      await sendMessage(credentials, '10000000', 'Привет!'),
      'message-id',
    )
  })

  it('receives and deletes notifications', async () => {
    mockJson({
      receiptId: 42,
      body: { typeWebhook: 'incomingMessageReceived' },
    })
    const notification = await receiveNotification(
      credentials,
      new AbortController().signal,
    )
    assert.equal(notification?.receiptId, 42)

    mockJson(true)
    await assert.doesNotReject(() => deleteNotification(credentials, 42))
  })

  it('treats an empty notification response as no message', async () => {
    globalThis.fetch = (async () => new Response('null')) as typeof fetch
    assert.equal(
      await receiveNotification(credentials, new AbortController().signal),
      null,
    )
  })

  it('surfaces useful API errors', async () => {
    mockJson({ reason: 'instance is starting or not authorized' }, 400)
    await assert.rejects(
      () => getStateInstance(credentials),
      /instance is starting or not authorized/,
    )
  })
})

describe('notification parsing', () => {
  it('extracts incoming text messages', () => {
    const body: IncomingNotificationBody = {
      typeWebhook: 'incomingMessageReceived',
      timestamp: 1_763_115_112,
      idMessage: 'incoming-id',
      senderData: { chatId: '10000000' },
      messageData: {
        typeMessage: 'textMessage',
        textMessageData: { textMessage: 'Привет!' },
      },
    }

    assert.deepEqual(extractTextMessage(body), {
      chatId: '10000000',
      id: 'incoming-id',
      text: 'Привет!',
      timestamp: 1_763_115_112_000,
    })
  })

  it('ignores non-text notifications', () => {
    assert.equal(
      extractTextMessage({ typeWebhook: 'outgoingMessageStatus' }),
      null,
    )
  })
})
