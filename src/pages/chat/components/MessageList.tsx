import { useEffect, useRef } from 'react'
import logoIcon from '../../../assets/logo.svg'
import { getAttachmentPreviewUrl, parseAssistantContent } from '../attachments'
import type { ChatAttachment, ChatMessage } from '../types'

type MessageListProps = {
  messages: ChatMessage[]
  onSelectAttachment: (attachment: ChatAttachment) => void
  selectedAttachmentId?: string
}

function AttachmentCard({
  attachment,
  isSelected,
  onSelect,
}: {
  attachment: ChatAttachment
  isSelected: boolean
  onSelect: () => void
}) {
  const previewUrl = getAttachmentPreviewUrl(attachment.url)

  return (
    <div
      className={`flex min-h-[64px] w-full items-center gap-3 rounded-[12px] border bg-primary-white px-4 py-3 shadow-[0_6px_18px_rgba(10,38,68,0.06)] ${
        isSelected ? 'border-primary' : 'border-primary-light-2'
      }`}
    >
      <button
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        onClick={onSelect}
        type="button"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[9px] bg-primary-light text-[14px] font-extrabold text-primary">
          PDF
        </span>
        <span className="min-w-0">
          <strong className="block truncate text-[14px] font-bold leading-5 text-primary-dark">
            {attachment.title}
          </strong>
          <span className="mt-0.5 block text-[13px] font-semibold leading-5 text-primary-dark/60">
            미리보기
          </span>
        </span>
      </button>

      <a
        className="flex h-9 shrink-0 items-center rounded-[8px] bg-primary px-3 text-[13px] font-bold text-primary-white transition hover:bg-primary-dark"
        href={previewUrl}
        rel="noreferrer"
        target="_blank"
      >
        열기
      </a>
    </div>
  )
}

export default function MessageList({
  messages,
  onSelectAttachment,
  selectedAttachmentId,
}: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages])

  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto px-6 py-6 md:px-10 lg:px-14"
      ref={listRef}
    >
      <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-5">
        {messages.map((message) => {
          const parsedContent =
            message.role === 'assistant'
              ? parseAssistantContent(message.content, message.id)
              : null

          return message.role === 'user' ? (
            <div className="flex justify-end" key={message.id}>
              <article className="max-w-[78%] whitespace-pre-wrap rounded-[16px] bg-primary px-4 py-3 text-[15px] font-medium leading-6 text-primary-white">
                {message.content}
              </article>
            </div>
          ) : (
            <div className="flex items-start gap-3" key={message.id}>
              <img
                className="h-9 w-9 shrink-0 rounded-full"
                src={logoIcon}
                alt="AI Assistant"
              />
              <div className="flex min-w-0 max-w-[620px] flex-col items-start gap-3">
                {parsedContent?.text ? (
                  <article
                    className={`inline-block max-w-[620px] whitespace-pre-wrap rounded-[16px] px-4 py-3 text-[15px] font-medium leading-6 ${
                      message.isError
                        ? 'border border-red-200 bg-red-50 text-red-700'
                        : 'bg-primary-light text-primary-dark'
                    }`}
                  >
                    {parsedContent.text}
                  </article>
                ) : null}

                {parsedContent?.attachments.length ? (
                  <div className="grid w-full max-w-[310px] gap-3">
                    {parsedContent.attachments.map((attachment) => (
                      <AttachmentCard
                        attachment={attachment}
                        isSelected={selectedAttachmentId === attachment.id}
                        key={attachment.id}
                        onSelect={() => onSelectAttachment(attachment)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
