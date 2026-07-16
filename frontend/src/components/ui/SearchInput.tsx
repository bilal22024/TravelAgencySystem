import { memo } from 'react'
import { cn } from '@/lib/utils'

type SearchInputProps = {
  placeholder: string
  value: string
  onChange: (value: string) => void
  className?: string
}

function SearchInputComponent({ placeholder, value, onChange, className }: SearchInputProps) {
  return (
    <input
      className={cn(
        'w-full rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50',
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
}

export const SearchInput = memo(SearchInputComponent)
