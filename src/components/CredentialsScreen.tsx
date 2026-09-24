import { type FormEvent, useState } from 'react'
import type { Credentials } from '../types'
import { MaxLogo } from './MaxLogo'

interface CredentialsScreenProps {
  onConnect: (credentials: Credentials) => Promise<void>
}

export const CredentialsScreen = ({ onConnect }: CredentialsScreenProps) => {
  const [credentials, setCredentials] = useState<Credentials>({
    apiUrl: '',
    idInstance: '',
    apiTokenInstance: '',
  })
  const [showToken, setShowToken] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateField = (field: keyof Credentials, value: string) => {
    setCredentials((current) => ({ ...current, [field]: value }))
    setError(null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (!Object.values(credentials).every((value) => value.trim())) {
      setError('Заполните все поля')
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      await onConnect(credentials)
    } catch (connectError) {
      setError(
        connectError instanceof Error
          ? connectError.message
          : 'Не удалось подключиться к GREEN-API',
      )
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <main className="login-page">
      <div className="space-pattern" aria-hidden="true" />
      <section className="login-card">
        <div className="login-card__brand">
          <MaxLogo size="large" />
          <div>
            <span className="eyebrow">GREEN-API</span>
            <h1>Войдите в MAX Chat</h1>
          </div>
        </div>

        <p className="login-card__description">
          Используйте параметры MAX-инстанса. Данные остаются только в текущей
          вкладке браузера.
        </p>

        <form
          className="credentials-form"
          onSubmit={handleSubmit}
          aria-busy={isConnecting}
        >
          <div className="form-field">
            <label className="field-label" htmlFor="api-url">
              apiUrl
            </label>
            <input
              id="api-url"
              type="url"
              placeholder="https://3100.api.green-api.com"
              value={credentials.apiUrl}
              onChange={(event) => updateField('apiUrl', event.target.value)}
              autoComplete="url"
              aria-describedby="api-url-hint"
            />
            <small className="field-hint" id="api-url-hint">
              Адрес из карточки MAX-инстанса
            </small>
          </div>

          <div className="form-field">
            <label className="field-label" htmlFor="instance-id">
              idInstance
            </label>
            <input
              id="instance-id"
              inputMode="numeric"
              placeholder="3100000000"
              value={credentials.idInstance}
              onChange={(event) =>
                updateField('idInstance', event.target.value.replace(/\D/g, ''))
              }
              autoComplete="off"
            />
          </div>

          <div className="form-field">
            <label className="field-label" htmlFor="instance-token">
              apiTokenInstance
            </label>
            <div className="input-with-action">
              <input
                id="instance-token"
                type={showToken ? 'text' : 'password'}
                placeholder="Введите токен инстанса"
                value={credentials.apiTokenInstance}
                onChange={(event) =>
                  updateField('apiTokenInstance', event.target.value)
                }
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowToken((visible) => !visible)}
                aria-label={showToken ? 'Скрыть токен' : 'Показать токен'}
              >
                {showToken ? 'Скрыть' : 'Показать'}
              </button>
            </div>
          </div>

          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          <button
            className="primary-button"
            type="submit"
            disabled={isConnecting}
          >
            {isConnecting ? 'Подключаемся…' : 'Продолжить'}
          </button>
        </form>

        <div className="privacy-note" role="note">
          <span className="privacy-note__icon">✓</span>
          Токен не сохраняется и используется только для запросов GREEN-API
        </div>
      </section>
    </main>
  )
}
