import { useState } from 'react'
import { getStateInstance, normalizeApiUrl } from './api/greenApi'
import { ChatScreen } from './components/ChatScreen'
import { CredentialsScreen } from './components/CredentialsScreen'
import type { Credentials } from './types'

const App = () => {
  const [credentials, setCredentials] = useState<Credentials | null>(null)

  const connect = async (nextCredentials: Credentials) => {
    if (!/^\d+$/.test(nextCredentials.idInstance.trim())) {
      throw new Error('idInstance должен содержать только цифры')
    }

    const normalizedCredentials = {
      ...nextCredentials,
      apiUrl: normalizeApiUrl(nextCredentials.apiUrl),
      idInstance: nextCredentials.idInstance.trim(),
      apiTokenInstance: nextCredentials.apiTokenInstance.trim(),
    }
    const state = await getStateInstance(normalizedCredentials)

    if (state !== 'authorized') {
      throw new Error(
        state === 'starting'
          ? 'Инстанс ещё запускается. Подождите немного и повторите попытку.'
          : `Инстанс не авторизован: ${state}`,
      )
    }

    setCredentials(normalizedCredentials)
  }

  return credentials ? (
    <ChatScreen
      credentials={credentials}
      onLogout={() => setCredentials(null)}
    />
  ) : (
    <CredentialsScreen onConnect={connect} />
  )
}

export default App
