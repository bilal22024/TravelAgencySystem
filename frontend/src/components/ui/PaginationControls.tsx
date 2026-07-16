type PaginationControlsProps = {
  page: number
  totalPages: number
  total: number
  onPrevious: () => void
  onNext: () => void
}

export function PaginationControls({
  page,
  totalPages,
  total,
  onPrevious,
  onNext,
}: PaginationControlsProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-300">
        Page {page} of {totalPages} • {total} total records
      </p>
      <div className="flex items-center gap-3">
        <button
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          onClick={onPrevious}
          disabled={page <= 1}
        >
          Previous
        </button>
        <button
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          onClick={onNext}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  )
}
