import ChatComposer from './ChatComposer'
import backArrowIcon from '../../../assets/backarrow.svg'
import foodIcon from '../../../assets/food.svg'
import giftIcon from '../../../assets/gift.svg'
import peopleListIcon from '../../../assets/peopleList.svg'

type WelcomePanelProps = {
  disabled?: boolean
  onSendMessage: (message: string) => void
}

const suggestions = [
  {
    label: '복리후생 혜택',
    question: '복리후생비 지급 기준이 뭐야?',
    icon: giftIcon,
    className: 'border-[#F1C27D] bg-[#FFF3DC] hover:border-[#D99135]',
    iconClassName: 'bg-[#FFDDA3]',
  },
  {
    label: '동호회 신청 양식',
    question: '동호회 신청 양식이 뭐야?',
    icon: foodIcon,
    className: 'border-[#9FD8A8] bg-[#EAF8ED] hover:border-[#4EAD5B]',
    iconClassName: 'bg-[#C8EFD0]',
  },
  {
    label: '휴가 신청',
    question: '휴가 신청하고 싶은데 써야 할 게 있어?',
    icon: peopleListIcon,
    className: 'border-[#B8C6F0] bg-[#EEF2FF] hover:border-[#6B82D6]',
    iconClassName: 'bg-[#D8E0FF]',
  },
]

export default function WelcomePanel({
  disabled = false,
  onSendMessage,
}: WelcomePanelProps) {
  return (
    <div className="grid min-h-0 w-full flex-1 grid-rows-[1fr_auto_1fr] justify-items-center px-6 py-12">
      <h1 className="mb-6 self-end text-center text-[30px] font-extrabold leading-10 text-primary-dark md:text-[36px]">
        무엇을 도와드릴까요?
      </h1>

      <div className="grid w-full max-w-[720px] gap-4 md:grid-cols-3">
        {suggestions.map((suggestion) => (
          <button
            className={`flex min-h-[72px] items-center gap-3 rounded-[10px] border px-4 py-3 text-left text-[15px] font-semibold leading-5 text-primary-dark transition disabled:cursor-not-allowed disabled:opacity-60 ${suggestion.className}`}
            disabled={disabled}
            key={suggestion.label}
            onClick={() => onSendMessage(suggestion.question)}
            type="button"
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] ${suggestion.iconClassName}`}
              aria-hidden="true"
            >
              <img className="h-5 w-5" src={suggestion.icon} alt="" />
            </span>
            <span className="min-w-0 flex-1">{suggestion.label}</span>
            <img
              className="h-4 w-4 shrink-0 rotate-180"
              src={backArrowIcon}
              alt=""
              aria-hidden="true"
            />
          </button>
        ))}
      </div>

      <ChatComposer
        className="mt-6 w-full max-w-[720px]"
        disabled={disabled}
        onSubmit={onSendMessage}
      />
    </div>
  )
}
