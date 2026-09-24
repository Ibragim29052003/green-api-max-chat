import assert from 'node:assert/strict'
import { after, afterEach, describe, it } from 'node:test'
import { cleanup, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { installDom } from '../test/dom'
import type { Credentials } from '../types'
import { ChatScreen } from './ChatScreen'

const dom = installDom()

afterEach(() => {
  cleanup()
})
after(dom.cleanup)

const credentials: Credentials = {
  apiUrl: 'https://3100.api.green-api.com',
  idInstance: '3100000000',
  apiTokenInstance: 'secret-token',
}

const createFetchMock = () => {
  let notificationDelivered = false

  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)

    if (url.includes('/checkAccount/')) {
      return new Response(JSON.stringify({ exist: true, chatId: '10000000' }))
    }

    if (url.includes('/sendMessage/')) {
      return new Response(JSON.stringify({ idMessage: 'sent-id' }))
    }

    if (url.includes('/deleteNotification/')) {
      return new Response(JSON.stringify(true))
    }

    if (url.includes('/receiveNotification/') && !notificationDelivered) {
      notificationDelivered = true
      return new Response(
        JSON.stringify({
          receiptId: 7,
          body: {
            typeWebhook: 'incomingMessageReceived',
            timestamp: 1_763_115_112,
            idMessage: 'incoming-id',
            senderData: { chatId: '10000000' },
            messageData: {
              typeMessage: 'textMessage',
              textMessageData: { textMessage: 'Ответ из MAX' },
            },
          },
        }),
      )
    }

    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener(
        'abort',
        () => reject(new DOMException('Aborted', 'AbortError')),
        { once: true },
      )
    })
  }) as typeof fetch
}

describe('ChatScreen', () => {
  it('creates a chat, receives a reply and sends a message', async () => {
    globalThis.fetch = createFetchMock()
    const user = userEvent.setup({ document: dom.document })
    const view = render(
      <ChatScreen credentials={credentials} onLogout={() => undefined} />,
    )

    await user.type(view.getByLabelText('Новый чат'), '+7 999 123-45-67')
    await user.click(view.getByRole('button', { name: 'Создать чат' }))

    await waitFor(() => {
      assert.ok(view.getByRole('heading', { name: '+7 (999) 123-45-67' }))
      assert.match(view.getByRole('log').textContent || '', /Ответ из MAX/)
    })

    const composer = view.getByLabelText('Текст сообщения')
    assert.equal(dom.document.activeElement, composer)
    await user.type(composer, 'Привет из приложения')
    await user.click(view.getByRole('button', { name: 'Отправить сообщение' }))

    await waitFor(() => {
      assert.match(
        view.getByRole('log').textContent || '',
        /Привет из приложения/,
      )
      assert.ok(view.getByLabelText('Отправлено'))
    })
  })

  it('rejects unsupported phone formats', async () => {
    globalThis.fetch = createFetchMock()
    const user = userEvent.setup({ document: dom.document })
    const view = render(
      <ChatScreen credentials={credentials} onLogout={() => undefined} />,
    )

    await user.type(view.getByLabelText('Новый чат'), '+1 555 123 4567')
    await user.click(view.getByRole('button', { name: 'Создать чат' }))
    assert.match(view.getByRole('alert').textContent || '', /РФ или Беларуси/)
  })

  it('allows the masked phone number to be erased with Backspace', async () => {
    globalThis.fetch = createFetchMock()
    const user = userEvent.setup({ document: dom.document })
    const view = render(
      <ChatScreen credentials={credentials} onLogout={() => undefined} />,
    )
    const phoneInput = view.getByLabelText('Новый чат') as HTMLInputElement

    await user.type(phoneInput, '999')
    assert.equal(phoneInput.value, '+7 (999)')

    await user.keyboard('{Backspace}{Backspace}{Backspace}{Backspace}')
    assert.equal(phoneInput.value, '')
  })

  it('has no detectable accessibility violations', async () => {
    globalThis.fetch = createFetchMock()
    const view = render(
      <ChatScreen credentials={credentials} onLogout={() => undefined} />,
    )
    const result = await axe.run(view.container, {
      rules: { 'color-contrast': { enabled: false } },
    })
    assert.deepEqual(
      result.violations.map((violation) => violation.id),
      [],
    )
  })
})
