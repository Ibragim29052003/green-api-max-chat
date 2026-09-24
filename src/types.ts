export interface Credentials {
  apiUrl: string
  idInstance: string
  apiTokenInstance: string
}

export interface ChatContact {
  chatId: string
  phone: string
  name: string
}

export interface ChatMessage {
  id: string
  direction: 'incoming' | 'outgoing'
  text: string
  timestamp: number
  status?: 'sent' | 'failed'
}

export interface IncomingNotificationBody {
  typeWebhook?: string
  timestamp?: number
  idMessage?: string
  senderData?: {
    chatId?: string
    chatName?: string
    senderName?: string
    senderPhoneNumber?: number
  }
  messageData?: {
    typeMessage?: string
    textMessageData?: {
      textMessage?: string
    }
  }
}

export interface IncomingNotification {
  receiptId: number
  body: IncomingNotificationBody
}
