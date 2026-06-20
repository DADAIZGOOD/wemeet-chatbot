import { useEffect, useMemo, useRef, useState } from 'react'
import plusIcon from '../../../assets/plus.svg'
import searchIcon from '../../../assets/search.svg'
import type { ChatSession } from '../types'

type SidebarProps = {
  activeSessionId: number | null
  isLoadingSessions?: boolean
  onNewChat: () => void
  onSelectSession: (session: ChatSession) => void
  sessions: ChatSession[]
}

export default function Sidebar({
  activeSessionId,
  isLoadingSessions = false,
  onNewChat,
  onSelectSession,
  sessions,
}: SidebarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const filteredSessions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    if (!normalizedQuery) {
      return sessions
    }

    return sessions.filter((session) =>
      session.title.toLowerCase().includes(normalizedQuery),
    )
  }, [searchQuery, sessions])

  const closeSearch = () => {
    setIsSearchOpen(false)
    setSearchQuery('')
  }

  useEffect(() => {
    if (!isSearchOpen) {
      return
    }

    searchInputRef.current?.focus()

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        searchRef.current?.contains(event.target)
      ) {
        return
      }

      closeSearch()
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isSearchOpen])

  return (
    <aside className="flex h-[252px] max-h-[252px] w-full shrink-0 flex-col overflow-hidden border-b border-primary-light-2 bg-primary-light px-6 py-7 md:h-full md:max-h-none md:w-[330px] md:border-b-0 md:border-r md:px-7 md:py-10">
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-[21px] font-extrabold text-primary-white"
          aria-label="AI Assistant"
        >
          AI
        </div>
        <div className="min-w-0">
          <strong className="block truncate text-[17px] font-bold leading-5">
            AI Assistant
          </strong>
          <p className="mt-1 truncate text-[15px] font-medium leading-5">
            한국순환자원유통지원센터
          </p>
        </div>
      </div>

      <button
        className="mt-8 flex h-11 w-full items-center justify-center gap-2 rounded-[11px] bg-primary px-5 text-[15px] font-semibold text-primary-white transition hover:bg-primary-dark"
        onClick={onNewChat}
        type="button"
      >
        <img
          className="h-5 w-5 brightness-0 invert"
          src={plusIcon}
          alt=""
          aria-hidden="true"
        />
        새 대화
      </button>

      <div
        className="mt-7 flex min-h-11 items-center border-b border-primary-light-2 pb-3"
        ref={searchRef}
      >
        {isSearchOpen ? (
          <input
            className="h-9 w-full rounded-[10px] border border-primary-light-2 bg-primary-white px-3 text-[14px] font-medium text-primary-dark outline-none placeholder:text-primary-dark/40 focus:border-primary"
            aria-label="대화 내역 검색"
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                closeSearch()
              }
            }}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="대화 제목 검색"
            ref={searchInputRef}
            type="search"
            value={searchQuery}
          />
        ) : (
          <div className="flex w-full items-center justify-between">
            <h2 className="text-[16px] font-semibold">대화 내역</h2>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-primary-light-2"
              onClick={() => setIsSearchOpen(true)}
              type="button"
              aria-label="대화 검색"
            >
              <img
                className="h-5 w-5"
                src={searchIcon}
                alt=""
                aria-hidden="true"
              />
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
        {isLoadingSessions ? (
          <p className="px-2 py-3 text-[14px] font-medium text-primary-dark/60">
            대화 내역을 불러오는 중..
          </p>
        ) : filteredSessions.length ? (
          <div className="grid gap-2">
            {filteredSessions.map((session) => {
              const isActive = activeSessionId === session.id

              return (
                <button
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full rounded-[10px] px-3 py-2.5 text-left text-[14px] font-semibold leading-5 transition ${
                    isActive
                      ? 'bg-primary text-primary-white'
                      : 'text-primary-dark hover:bg-primary-light-2'
                  }`}
                  key={session.id}
                  onClick={() => onSelectSession(session)}
                  type="button"
                >
                  <span className="block truncate">{session.title}</span>
                </button>
              )
            })}
          </div>
        ) : (
          <p className="px-2 py-3 text-[14px] font-medium text-primary-dark/60">
            {searchQuery.trim()
              ? '검색 결과가 없습니다.'
              : '아직 대화 내역이 없습니다.'}
          </p>
        )}
      </div>
    </aside>
  )
}
