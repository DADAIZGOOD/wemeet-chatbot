type ChatHeaderProps = {
  title: string
}

export default function ChatHeader({ title }: ChatHeaderProps) {
  return (
    <header className="shrink-0 px-6 pt-8 md:px-6 md:pt-11">
      <h1 className="truncate text-[24px] font-extrabold leading-8 md:text-[26px]">
        {title}
      </h1>
      <div className="mt-3 h-px w-full bg-primary-light-2" />
    </header>
  )
}
