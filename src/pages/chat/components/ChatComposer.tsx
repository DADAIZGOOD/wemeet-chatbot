import { useState, type FormEvent } from 'react'
import sendIcon from '../../../assets/send.svg'

type ChatComposerProps = {
  className?: string
  disabled?: boolean
  onSubmit?: (message: string) => void
  placeholder?: string
}

export default function ChatComposer({
  className = 'shrink-0 px-6 pb-5 md:px-10 lg:px-14',
  disabled = false,
  onSubmit,
  placeholder = '메시지를 입력하세요',
}: ChatComposerProps) {
  const [message, setMessage] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedMessage = message.trim()

    if (!trimmedMessage || disabled) {
      return
    }

    setMessage('')
    onSubmit?.(trimmedMessage)
  }

  return (
    <form className={className} onSubmit={handleSubmit}>
      <div className="mx-auto flex h-[54px] w-full max-w-[720px] items-center rounded-[16px] border border-primary-light-2 bg-primary-white px-3 shadow-[0_8px_24px_rgba(10,38,68,0.08)]">
        <input
          className="min-w-0 flex-1 bg-transparent px-3 text-[16px] text-primary-dark outline-none placeholder:text-primary-light-2"
          aria-label="메시지 입력"
          disabled={disabled}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={placeholder}
          type="text"
          value={message}
        />
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-primary-light-2"
          disabled={disabled || !message.trim()}
          type="submit"
          aria-label="메시지 전송"
        >
          <img
            className="h-6 w-6 brightness-0 invert"
            src={sendIcon}
            alt=""
            aria-hidden="true"
          />
        </button>
      </div>
    </form>
  )
}
