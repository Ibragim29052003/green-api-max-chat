import assert from 'node:assert/strict'
import { after, afterEach, describe, it } from 'node:test'
import { cleanup, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { installDom } from '../test/dom'
import type { Credentials } from '../types'
import { CredentialsScreen } from './CredentialsScreen'

const dom = installDom()

afterEach(cleanup)
after(dom.cleanup)

describe('CredentialsScreen', () => {
  it('validates required credentials', async () => {
    const user = userEvent.setup({ document: dom.document })
    const view = render(<CredentialsScreen onConnect={async () => undefined} />)

    await user.click(view.getByRole('button', { name: 'Продолжить' }))
    assert.match(
      view.getByRole('alert').textContent || '',
      /Заполните все поля/,
    )
  })

  it('submits credentials and can reveal the token', async () => {
    const user = userEvent.setup({ document: dom.document })
    let submitted: Credentials | null = null
    const view = render(
      <CredentialsScreen
        onConnect={async (credentials) => {
          submitted = credentials
        }}
      />,
    )

    await user.type(
      view.getByLabelText('apiUrl'),
      'https://3100.api.green-api.com',
    )
    await user.type(view.getByLabelText('idInstance'), '3100000000')
    const tokenInput = view.getByLabelText('apiTokenInstance')
    await user.type(tokenInput, 'secret-token')
    assert.equal(tokenInput.getAttribute('type'), 'password')

    await user.click(view.getByRole('button', { name: 'Показать токен' }))
    assert.equal(tokenInput.getAttribute('type'), 'text')
    await user.click(view.getByRole('button', { name: 'Продолжить' }))

    assert.deepEqual(submitted, {
      apiUrl: 'https://3100.api.green-api.com',
      idInstance: '3100000000',
      apiTokenInstance: 'secret-token',
    })
  })

  it('has no detectable accessibility violations', async () => {
    const view = render(<CredentialsScreen onConnect={async () => undefined} />)
    const result = await axe.run(view.container, {
      rules: { 'color-contrast': { enabled: false } },
    })
    assert.deepEqual(
      result.violations.map((violation) => violation.id),
      [],
    )
  })
})
