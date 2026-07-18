import { forwardRef, memo } from 'react'
import { cn } from '@/lib/utils'

type SearchInputProps = {
  placeholder: string
  value: string
  onChange: (value: string) => void
  className?: string
}

const SearchInputComponent = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInputComponent(
  { placeholder, value, onChange, className },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20',
        className,
      )}
      type="search"
      inputMode="search"
      autoComplete="off"
      spellCheck={false}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
})

export const SearchInput = memo(SearchInputComponent)
