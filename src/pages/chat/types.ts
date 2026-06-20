export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  isLoading?: boolean
  isError?: boolean
}

export type ChatSession = {
  id: number
  title: string
  createdAt?: string
}

export type ChatAttachment = {
  id: string
  title: string
  url: string
}
