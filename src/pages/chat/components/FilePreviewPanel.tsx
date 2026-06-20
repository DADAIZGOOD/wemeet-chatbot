import downloadIcon from '../../../assets/download.svg'
import { getAttachmentPreviewUrl } from '../attachments'
import type { ChatAttachment } from '../types'

type FilePreviewPanelProps = {
  attachment: ChatAttachment | null
  onClose: () => void
}

export default function FilePreviewPanel({
  attachment,
  onClose,
}: FilePreviewPanelProps) {
  if (!attachment) {
    return null
  }

  const previewUrl = getAttachmentPreviewUrl(attachment.url)

  return (
    <aside className="fixed inset-y-0 right-0 z-20 flex h-dvh w-[min(420px,calc(100vw-24px))] shrink-0 flex-col overflow-hidden border-l border-primary-light-2 bg-primary-white shadow-[-12px_0_32px_rgba(10,38,68,0.12)] lg:relative lg:z-auto lg:h-full lg:w-[380px] lg:shadow-none xl:w-[420px]">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-primary-light-2 px-5 py-4">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold leading-5 text-primary/80">
            첨부양식 미리보기
          </p>
          <h2 className="mt-1 truncate text-[16px] font-bold leading-6 text-primary-dark">
            {attachment.title}
          </h2>
        </div>

        <button
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[20px] font-semibold leading-none transition hover:bg-primary-light"
          type="button"
          aria-label="미리보기 닫기"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 p-5">
        <iframe
          className="min-h-0 flex-1 rounded-[10px] border border-primary-light-2 bg-primary-white"
          src={`${previewUrl}#toolbar=0&navpanes=0`}
          title={`${attachment.title} 미리보기`}
        />

        <a
          className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-[10px] bg-primary px-4 text-[14px] font-semibold text-primary-white transition hover:bg-primary-dark"
          href={previewUrl}
          rel="noreferrer"
          target="_blank"
        >
          <img
            className="h-5 w-5 brightness-0 invert"
            src={downloadIcon}
            alt=""
            aria-hidden="true"
          />
          새 탭에서 열기
        </a>
      </div>
    </aside>
  )
}
