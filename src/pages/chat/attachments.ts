import type { ChatAttachment, ChatMessage } from './types'

type ParsedAttachment = Omit<ChatAttachment, 'id'>

const cleanAttachmentTitle = (title: string) =>
  title
    .replace(/^[*\-\d.\s]+/, '')
    .replace(/^\[(.*)\]$/, '$1')
    .trim() || '첨부양식'

const createAttachmentId = (
  scopeId: string,
  lineIndex: number,
  attachmentIndex: number,
) => `${scopeId}-attachment-${lineIndex}-${attachmentIndex}`

const safelyDecodePathSegment = (segment: string) => {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

const encodePathname = (pathname: string) =>
  pathname
    .split('/')
    .map((segment) => encodeURIComponent(safelyDecodePathSegment(segment)))
    .join('/')

export const getAttachmentPreviewUrl = (url: string) => {
  const trimmedUrl = url.trim()

  try {
    const parsedUrl = new URL(trimmedUrl)
    parsedUrl.pathname = encodePathname(parsedUrl.pathname)
    return parsedUrl.toString()
  } catch {
    return encodeURI(trimmedUrl)
  }
}

const findUrlEnd = (line: string, urlStart: number) => {
  let depth = 0

  for (let index = urlStart + 1; index < line.length; index += 1) {
    const character = line[index]

    if (character === '(') {
      depth += 1
      continue
    }

    if (character !== ')') {
      continue
    }

    if (depth > 0) {
      depth -= 1
      continue
    }

    return index
  }

  return -1
}

const readAttachmentTitle = (
  line: string,
  cursor: number,
  urlStart: number,
) => {
  const bracketStart = line.lastIndexOf('[', urlStart)

  if (bracketStart >= cursor && line[urlStart - 1] === ']') {
    return cleanAttachmentTitle(line.slice(bracketStart + 1, urlStart - 1))
  }

  return cleanAttachmentTitle(line.slice(cursor, urlStart))
}

const parseAttachmentLine = (line: string): ParsedAttachment[] => {
  const attachments: ParsedAttachment[] = []
  let cursor = 0

  while (cursor < line.length) {
    const urlStart = line.indexOf('(http', cursor)

    if (urlStart < 0) {
      break
    }

    const urlEnd = findUrlEnd(line, urlStart)

    if (urlEnd <= urlStart) {
      break
    }

    const title = readAttachmentTitle(line, cursor, urlStart)
    const url = line.slice(urlStart + 1, urlEnd).trim()

    if (url.startsWith('http')) {
      attachments.push({
        title,
        url,
      })
    }

    cursor = urlEnd + 1
  }

  return attachments
}

export const parseAssistantContent = (
  content: string,
  scopeId = 'assistant',
) => {
  const attachments: ChatAttachment[] = []
  const textLines: string[] = []
  let isAttachmentSection = false

  for (const [lineIndex, line] of content.split('\n').entries()) {
    const trimmedLine = line.trim()

    if (trimmedLine === '[첨부양식]') {
      isAttachmentSection = true
      continue
    }

    const lineAttachments = parseAttachmentLine(trimmedLine)
    const validAttachments = lineAttachments.filter(
      (attachment) =>
        isAttachmentSection || attachment.url.toLowerCase().includes('.pdf'),
    )

    if (validAttachments.length) {
      attachments.push(
        ...validAttachments.map((attachment, attachmentIndex) => ({
          ...attachment,
          id: createAttachmentId(
            scopeId,
            lineIndex,
            attachments.length + attachmentIndex,
          ),
        })),
      )
      continue
    }

    if (isAttachmentSection && !trimmedLine) {
      continue
    }

    textLines.push(line)
  }

  return {
    attachments,
    text: textLines.join('\n').trim(),
  }
}

export const getMessageAttachments = (messages: ChatMessage[]) =>
  messages.flatMap((message) =>
    message.role === 'assistant'
      ? parseAssistantContent(message.content, message.id).attachments
      : [],
  )
