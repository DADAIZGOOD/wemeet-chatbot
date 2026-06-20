import { useCallback, useEffect, useMemo, useState } from 'react'
import { getMessageAttachments } from './attachments'
import ChatComposer from './components/ChatComposer'
import FilePreviewPanel from './components/FilePreviewPanel'
import MessageList from './components/MessageList'
import Sidebar from './components/Sidebar'
import WelcomePanel from './components/WelcomePanel'
import type { ChatAttachment, ChatMessage, ChatSession } from './types'

const createMessageId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

class ChatApiError extends Error {
  userMessage: string

  constructor(message: string, userMessage: string) {
    super(message)
    this.name = 'ChatApiError'
    this.userMessage = userMessage
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const readArrayByKeys = (value: unknown, keys: string[]): unknown[] => {
  if (Array.isArray(value)) {
    return value
  }

  if (!isRecord(value)) {
    return []
  }

  for (const key of keys) {
    const item = value[key]

    if (Array.isArray(item)) {
      return item
    }
  }

  return []
}

const readNumberByKeys = (
  value: unknown,
  keys: string[],
): number | null => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const nestedValue = readNumberByKeys(item, keys)

      if (nestedValue !== null) {
        return nestedValue
      }
    }

    return null
  }

  if (!isRecord(value)) {
    return null
  }

  for (const key of keys) {
    const item = value[key]

    if (typeof item === 'number') {
      return item
    }

    if (typeof item === 'string') {
      const numericValue = Number(item)

      if (Number.isInteger(numericValue)) {
        return numericValue
      }
    }
  }

  for (const key of ['data', 'result', 'chat', 'assistant']) {
    const nestedValue = readNumberByKeys(value[key], keys)

    if (nestedValue !== null) {
      return nestedValue
    }
  }

  return null
}

const findStringByKeys = (
  value: unknown,
  keys: string[],
  allowStringValue = false,
): string | null => {
  if (typeof value === 'string') {
    return allowStringValue ? value.trim() || null : null
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const nestedValue = findStringByKeys(item, keys, allowStringValue)

      if (nestedValue) {
        return nestedValue
      }
    }

    return null
  }

  if (!isRecord(value)) {
    return null
  }

  for (const key of keys) {
    const item = value[key]

    if (typeof item === 'string' && item.trim()) {
      return item
    }

    const nestedValue = findStringByKeys(item, keys, allowStringValue)

    if (nestedValue) {
      return nestedValue
    }
  }

  for (const key of ['data', 'result', 'chat', 'assistant']) {
    const nestedValue = findStringByKeys(value[key], keys, allowStringValue)

    if (nestedValue) {
      return nestedValue
    }
  }

  return null
}

const parseChatEventStream = (responseText: string) => {
  let answer = ''
  let sessionId: number | null = null
  let error: string | null = null
  const statuses: string[] = []

  for (const line of responseText.split('\n')) {
    if (!line.startsWith('data:')) {
      continue
    }

    const eventText = line.replace(/^data:\s*/, '').trim()

    if (!eventText || eventText === '[DONE]') {
      continue
    }

    try {
      const eventData: unknown = JSON.parse(eventText)

      if (!isRecord(eventData)) {
        continue
      }

      if (eventData.type === 'text' && typeof eventData.chunk === 'string') {
        answer += normalizeAnswerText(eventData.chunk)
      }

      if (
        eventData.type === 'session_info' &&
        typeof eventData.sessionId === 'number'
      ) {
        sessionId = eventData.sessionId
      }

      if (eventData.type === 'status' && typeof eventData.message === 'string') {
        statuses.push(eventData.message)
      }

      if (eventData.type === 'error') {
        error =
          findStringByKeys(eventData, ['message', 'error', 'detail'], true) ??
          'AI 응답 생성 중 오류가 발생했습니다.'
      }
    } catch {
      logChatApi('failed to parse event stream line', eventText)
    }
  }

  return {
    answer: answer.trim(),
    error,
    sessionId,
    statuses,
  }
}

const readChatResponse = async (response: Response): Promise<unknown> => {
  const responseText = await response.text()

  if (!responseText) {
    return {}
  }

  if (responseText.includes('data:')) {
    return parseChatEventStream(responseText)
  }

  try {
    return JSON.parse(responseText)
  } catch {
    return responseText
  }
}

const logChatApi = (message: string, details?: unknown) => {
  if (!import.meta.env.DEV) {
    return
  }

  if (details === undefined) {
    console.log(`[chat-api] ${message}`)
    return
  }

  console.log(`[chat-api] ${message}`, details)
}

const decodeSerializedString = (value: string) =>
  value
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\')

const extractSerializedTextPart = (value: string) => {
  const trimmedValue = value.trim()

  if (
    !trimmedValue.includes("'text'") &&
    !trimmedValue.includes('"text"')
  ) {
    return null
  }

  const textMatch =
    trimmedValue.match(/['"]text['"]\s*:\s*"((?:\\.|[^"\\])*)"/s) ??
    trimmedValue.match(/['"]text['"]\s*:\s*'((?:\\.|[^'\\])*)'/s)
  const textValue = textMatch?.[1]

  if (!textValue) {
    return null
  }

  return decodeSerializedString(textValue).trim() || null
}

const normalizeAnswerText = (value: string) =>
  extractSerializedTextPart(value) ?? value.trim()

const extractAnswer = (data: unknown) => {
  const answer = findStringByKeys(data, [
    'answer',
    'response',
    'reply',
    'message',
    'content',
    'text',
  ], true)

  return answer
    ? normalizeAnswerText(answer)
    : '답변을 불러왔지만 표시할 내용이 없습니다.'
}

const extractApiErrorMessage = (data: unknown) => {
  if (!isRecord(data)) {
    return null
  }

  for (const key of ['error', 'errorMessage', 'error_message', 'detail']) {
    const item = data[key]

    if (typeof item === 'string' && item.trim()) {
      return item
    }

    const nestedMessage = findStringByKeys(
      item,
      ['message', 'error', 'detail'],
      true,
    )

    if (nestedMessage) {
      return nestedMessage
    }
  }

  return null
}

const getRetryDelayText = (message: string) => {
  const retryMatch =
    message.match(/retry in ([\d.]+)s/i) ??
    message.match(/retryDelay['"]?: ['"]?(\d+)s/i)

  if (!retryMatch) {
    return null
  }

  const seconds = Math.ceil(Number(retryMatch[1]))

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null
  }

  if (seconds >= 60) {
    return `${Math.ceil(seconds / 60)}분 후`
  }

  return `${seconds}초 후`
}

const createChatApiUserMessage = (message: string) => {
  const normalizedMessage = message.toLowerCase()

  if (
    normalizedMessage.includes('resource_exhausted') ||
    normalizedMessage.includes('quota') ||
    normalizedMessage.includes('429')
  ) {
    const retryDelayText = getRetryDelayText(message) ?? '잠시 후'

    return `AI 모델 사용량이 초과되었습니다. ${retryDelayText} 다시 시도해 주세요.`
  }

  return '답변을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}

const getChatErrorMessage = (error: unknown) =>
  error instanceof ChatApiError
    ? error.userMessage
    : '답변을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'

const extractSessionId = (data: unknown) =>
  readNumberByKeys(data, [
    'session_id',
    'sessionId',
    'chat_session_id',
    'chatSessionId',
  ])

const parseSessions = (data: unknown): ChatSession[] =>
  readArrayByKeys(data, ['sessions', 'data', 'items'])
    .map((item) => {
      const id = readNumberByKeys(item, ['id', 'sessionId', 'session_id'])

      if (id === null) {
        return null
      }

      return {
        id,
        title:
          findStringByKeys(item, ['title', 'name', 'summary']) ??
          `대화 ${id}`,
        createdAt:
          findStringByKeys(item, ['createdAt', 'created_at', 'updatedAt']) ??
          undefined,
      }
    })
    .filter((session): session is ChatSession => session !== null)

const parseSessionMessages = (data: unknown): ChatMessage[] =>
  readArrayByKeys(data, ['messages', 'data', 'items']).map((item, index) => {
    const roleValue = findStringByKeys(item, ['role'])?.toLowerCase()
    const id =
      readNumberByKeys(item, ['id', 'messageId', 'message_id']) ?? index + 1
    const role =
      roleValue === 'ai' ||
      roleValue === 'assistant' ||
      roleValue === 'bot'
        ? 'assistant'
        : 'user'
    const content =
      findStringByKeys(
        item,
        ['content', 'message', 'text', 'answer', 'Question'],
        true,
      ) ?? ''

    return {
      id: `server-${id}`,
      role,
      content: role === 'assistant' ? normalizeAnswerText(content) : content,
    }
  })

const fetchJson = async (url: string) => {
  logChatApi(`request GET ${url}`)

  const response = await fetch(url)
  const data = await readChatResponse(response)

  logChatApi(`response GET ${url}`, {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    data,
  })

  if (!response.ok) {
    throw new Error(`GET ${url} failed with ${response.status}`)
  }

  return data
}

const postChatMessage = async (message: string, sessionId: number | null) => {
  const requestChat = async () => {
    const payload: {
      Question: string
      sessionId?: number
    } = {
      Question: message,
    }

    if (sessionId !== null) {
      payload.sessionId = sessionId
    }

    logChatApi('request POST /api/chat', payload)

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const data = await readChatResponse(response)

    logChatApi('response POST /api/chat', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      data,
    })

    return {
      data,
      payload,
      response,
    }
  }

  const response = await requestChat()
  const apiErrorMessage = extractApiErrorMessage(response.data)

  if (!response.response.ok || apiErrorMessage) {
    const errorMessage =
      apiErrorMessage ??
      findStringByKeys(response.data, ['message', 'detail'], true) ??
      `POST /api/chat failed with ${response.response.status}`

    logChatApi('failed POST /api/chat', {
      payload: response.payload,
      status: response.response.status,
      statusText: response.response.statusText,
      data: response.data,
      error: errorMessage,
    })

    throw new ChatApiError(errorMessage, createChatApiUserMessage(errorMessage))
  }

  return response.data
}

export default function ChatPage() {
  const [pageKey, setPageKey] = useState(0)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [selectedAttachment, setSelectedAttachment] =
    useState<ChatAttachment | null>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(false)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [isWaitingForAnswer, setIsWaitingForAnswer] = useState(false)
  const attachments = useMemo(() => getMessageAttachments(messages), [messages])
  const latestAttachment = attachments[attachments.length - 1] ?? null

  const refreshSessions = useCallback(async () => {
    setIsLoadingSessions(true)

    try {
      const data = await fetchJson('/api/sessions?userId=1')
      setSessions(parseSessions(data))
    } catch (error) {
      logChatApi('failed to load sessions', error)
    } finally {
      setIsLoadingSessions(false)
    }
  }, [])

  useEffect(() => {
    void refreshSessions()
  }, [refreshSessions])

  useEffect(() => {
    setSelectedAttachment(latestAttachment)
  }, [latestAttachment?.id])

  const handleNewChat = () => {
    setMessages([])
    setSelectedAttachment(null)
    setSessionId(null)
    setPageKey((currentKey) => currentKey + 1)
  }

  const handleSelectSession = async (session: ChatSession) => {
    if (isWaitingForAnswer) {
      return
    }

    setSessionId(session.id)
    setSelectedAttachment(null)
    setIsLoadingSession(true)
    setMessages([
      {
        id: `loading-session-${session.id}`,
        role: 'assistant',
        content: '대화 내역을 불러오는 중..',
        isLoading: true,
      },
    ])

    try {
      const data = await fetchJson(`/api/sessions/${session.id}/messages`)
      setMessages(parseSessionMessages(data))
    } catch (error) {
      logChatApi('failed to load session messages', error)
      setMessages([
        {
          id: `error-session-${session.id}`,
          role: 'assistant',
          content: '대화 내역을 불러오지 못했습니다.',
          isError: true,
        },
      ])
    } finally {
      setIsLoadingSession(false)
    }
  }

  const handleSendMessage = async (message: string) => {
    const trimmedMessage = message.trim()

    if (!trimmedMessage || isWaitingForAnswer) {
      return
    }

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: 'user',
      content: trimmedMessage,
    }
    const pendingMessage: ChatMessage = {
      id: createMessageId(),
      role: 'assistant',
      content: '답변을 생성 중..',
      isLoading: true,
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      userMessage,
      pendingMessage,
    ])
    setIsWaitingForAnswer(true)

    try {
      const data = await postChatMessage(trimmedMessage, sessionId)
      const nextSessionId = extractSessionId(data)

      if (nextSessionId) {
        setSessionId(nextSessionId)
      }

      setMessages((currentMessages) =>
        currentMessages.map((currentMessage) =>
          currentMessage.id === pendingMessage.id
            ? {
                ...currentMessage,
                content: extractAnswer(data),
                isLoading: false,
              }
            : currentMessage,
        ),
      )
      void refreshSessions()
    } catch (error) {
      logChatApi('send message failed', error)

      setMessages((currentMessages) =>
        currentMessages.map((currentMessage) =>
          currentMessage.id === pendingMessage.id
            ? {
                ...currentMessage,
                content: getChatErrorMessage(error),
                isLoading: false,
                isError: true,
              }
            : currentMessage,
        ),
      )
    } finally {
      setIsWaitingForAnswer(false)
    }
  }

  return (
    <main className="h-dvh overflow-hidden bg-primary-white text-primary-dark">
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-primary-white md:flex-row">
        <Sidebar
          activeSessionId={sessionId}
          isLoadingSessions={isLoadingSessions}
          onNewChat={handleNewChat}
          onSelectSession={handleSelectSession}
          sessions={sessions}
        />

        <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-primary-white">
          {messages.length === 0 ? (
            <WelcomePanel
              disabled={isWaitingForAnswer || isLoadingSession}
              key={pageKey}
              onSendMessage={handleSendMessage}
            />
          ) : (
            <>
              <MessageList
                messages={messages}
                onSelectAttachment={setSelectedAttachment}
                selectedAttachmentId={selectedAttachment?.id}
              />
              <ChatComposer
                disabled={isWaitingForAnswer || isLoadingSession}
                onSubmit={handleSendMessage}
              />
            </>
          )}
        </section>

        <FilePreviewPanel
          attachment={selectedAttachment}
          onClose={() => setSelectedAttachment(null)}
        />
      </div>
    </main>
  )
}
