import { Check, ChevronDown } from 'lucide-react'
import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { PortalSurface } from '@/components/ui/PortalSurface'
import { SearchInput } from '@/components/ui/SearchInput'
import { cn } from '@/lib/utils'

type SearchableSelectOption = {
  id: string
  label: string
  description?: string | null
}

type SearchableSelectProps = {
  label: string
  placeholder: string
  value: SearchableSelectOption | null
  searchValue: string
  searchPlaceholder: string
  onSearchChange: (value: string) => void
  onSelect: (option: SearchableSelectOption | null) => void
  options: SearchableSelectOption[]
  emptyMessage: string
  disabled?: boolean
  loading?: boolean
  allowClear?: boolean
  footer?: ReactNode
}

type MenuPosition = {
  top: number
  left: number
  width: number
  maxHeight: number
}

function getMenuPosition(trigger: HTMLButtonElement): MenuPosition {
  const rect = trigger.getBoundingClientRect()
  const viewportPadding = 16
  const availableBelow = window.innerHeight - rect.bottom - viewportPadding
  const availableAbove = rect.top - viewportPadding
  const preferredHeight = 320
  const renderAbove = availableBelow < 220 && availableAbove > availableBelow
  const maxHeight = Math.max(180, Math.min(preferredHeight, renderAbove ? availableAbove : availableBelow))

  return {
    top: renderAbove ? Math.max(viewportPadding, rect.top - maxHeight - 8) : rect.bottom + 8,
    left: Math.min(rect.left, window.innerWidth - rect.width - viewportPadding),
    width: rect.width,
    maxHeight,
  }
}

export function SearchableSelect({
  label,
  placeholder,
  value,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  onSelect,
  options,
  emptyMessage,
  disabled,
  loading,
  allowClear,
  footer,
}: SearchableSelectProps) {
  const labelId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null)

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current || typeof window === 'undefined') {
      return
    }

    const updatePosition = () => {
      if (triggerRef.current) {
        setMenuPosition(getMenuPosition(triggerRef.current))
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      searchInputRef.current?.focus()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null

      if (
        target &&
        (triggerRef.current?.contains(target) || menuRef.current?.contains(target))
      ) {
        return
      }

      setIsOpen(false)
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape as unknown as EventListener)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape as unknown as EventListener)
    }
  }, [isOpen])

  function toggleOpen() {
    if (disabled) {
      return
    }

    setIsOpen((current) => !current)
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) {
      return
    }

    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setIsOpen(true)
    }
  }

  const menu = isOpen && menuPosition
    ? (
        <PortalSurface>
          <div
            ref={menuRef}
            className="fixed z-[220] overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(7,15,27,0.98)] p-3 shadow-panel backdrop-blur"
            style={{
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
            }}
            role="dialog"
            aria-labelledby={labelId}
          >
            <div className="space-y-3">
              <SearchInput
                ref={searchInputRef}
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={onSearchChange}
              />
              <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: menuPosition.maxHeight - 92 }}>
                {allowClear ? (
                  <button
                    className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-left text-sm text-slate-200 transition hover:bg-white/[0.08]"
                    type="button"
                    onClick={() => {
                      onSelect(null)
                      setIsOpen(false)
                    }}
                  >
                    <span>Clear selection</span>
                    {!value ? <Check className="h-4 w-4 text-cyan-200" /> : null}
                  </button>
                ) : null}
                {loading ? (
                  <p className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm text-slate-300">
                    Loading options...
                  </p>
                ) : options.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-3 text-sm text-slate-400">
                    {emptyMessage}
                  </p>
                ) : (
                  options.map((option) => {
                    const isSelected = option.id === value?.id

                    return (
                      <button
                        key={option.id}
                        className={cn(
                          'flex w-full items-start justify-between gap-3 rounded-2xl border px-3 py-2.5 text-left transition',
                          isSelected
                            ? 'border-cyan-300/30 bg-cyan-400/10 text-white'
                            : 'border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]',
                        )}
                        type="button"
                        onClick={() => {
                          onSelect(option)
                          setIsOpen(false)
                        }}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{option.label}</span>
                          {option.description ? (
                            <span className="mt-1 block text-xs text-slate-400">{option.description}</span>
                          ) : null}
                        </span>
                        {isSelected ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" /> : null}
                      </button>
                    )
                  })
                )}
              </div>
              {footer ? <div className="border-t border-white/10 pt-3">{footer}</div> : null}
            </div>
          </div>
        </PortalSurface>
      )
    : null

  return (
    <div className="block">
      <span id={labelId} className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
        {label}
      </span>
      <button
        ref={triggerRef}
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-2xl border border-white/10 bg-[rgba(7,15,27,0.55)] px-4 text-left text-sm outline-none transition focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20',
          disabled
            ? 'cursor-not-allowed text-slate-500 opacity-70'
            : 'text-white hover:border-white/20 hover:bg-[rgba(9,20,36,0.7)]',
        )}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-labelledby={labelId}
        disabled={disabled}
        onClick={toggleOpen}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className={value ? 'text-white' : 'text-slate-500'}>{value?.label ?? placeholder}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition', isOpen ? 'rotate-180' : '')} />
      </button>
      {menu}
    </div>
  )
}
