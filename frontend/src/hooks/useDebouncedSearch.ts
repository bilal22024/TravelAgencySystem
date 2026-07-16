import { useCallback, useState } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

export function useDebouncedSearch(delay = 300) {
  const [searchText, setSearchText] = useState('')
  const debouncedSearchText = useDebouncedValue(searchText, delay)

  const updateSearchText = useCallback((value: string) => {
    setSearchText(value)
  }, [])

  const clearSearchText = useCallback(() => {
    setSearchText('')
  }, [])

  return {
    searchText,
    debouncedSearchText,
    updateSearchText,
    clearSearchText,
  }
}
