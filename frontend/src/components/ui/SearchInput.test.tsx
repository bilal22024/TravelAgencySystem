import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SearchInput } from '@/components/ui/SearchInput'
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch'

function SearchInputHarness() {
  const { searchText, debouncedSearchText, updateSearchText } = useDebouncedSearch(300)

  return (
    <div>
      <SearchInput
        placeholder="Search agencies"
        value={searchText}
        onChange={updateSearchText}
      />
      <p>Immediate: {searchText || 'empty'}</p>
      <p>Debounced: {debouncedSearchText || 'empty'}</p>
    </div>
  )
}

describe('SearchInput', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps focus while typing and updates the debounced value after 300ms', () => {
    render(<SearchInputHarness />)

    const input = screen.getByPlaceholderText(/Search agencies/i)
    input.focus()

    fireEvent.change(input, { target: { value: 'a' } })
    expect(input).toHaveFocus()

    fireEvent.change(input, { target: { value: 'al' } })
    expect(input).toHaveFocus()

    fireEvent.change(input, { target: { value: 'al noor' } })
    expect(input).toHaveFocus()
    expect(screen.getByText('Immediate: al noor')).toBeInTheDocument()
    expect(screen.getByText('Debounced: empty')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(300)
    })

    expect(screen.getByText('Debounced: al noor')).toBeInTheDocument()
  })
})
