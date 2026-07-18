import type { MutableRefObject, RefObject } from 'react'
import { ChevronRight } from 'lucide-react'
import { SearchInput } from '@/components/ui/SearchInput'
import type { AgencyListItem } from '@/types/api'

type ParentTreeOption = {
  parent: AgencyListItem
  branches: AgencyListItem[]
}

type AgencySelectorTreeListProps = {
  searchInputRef?: RefObject<HTMLInputElement>
  optionRefs: MutableRefObject<Record<string, HTMLButtonElement | null>>
  searchText: string
  onSearchTextChange: (value: string) => void
  maxHeight: number
  parentTreeOptions: ParentTreeOption[]
  filteredStandaloneAgencies: AgencyListItem[]
  activeOptionKey: string | null
  selectedAgencyId: string
  includeBranches: boolean
  onActiveOptionChange: (key: string) => void
  onToggleParent: (parentId: string) => void
  isParentExpanded: (parentId: string) => boolean
  isTreeSelectionActive: (
    agencyId: string,
    selection: 'consolidated' | 'parent-only' | 'branch',
  ) => boolean
  onSelect: (agencyId: string, options?: { includeBranches?: boolean }) => void
}

export function AgencySelectorTreeList({
  searchInputRef,
  optionRefs,
  searchText,
  onSearchTextChange,
  maxHeight,
  parentTreeOptions,
  filteredStandaloneAgencies,
  activeOptionKey,
  selectedAgencyId,
  includeBranches,
  onActiveOptionChange,
  onToggleParent,
  isParentExpanded,
  isTreeSelectionActive,
  onSelect,
}: AgencySelectorTreeListProps) {
  return (
    <>
      <SearchInput
        ref={searchInputRef}
        placeholder="Search by agency, code, or parent agency"
        value={searchText}
        onChange={onSearchTextChange}
      />
      <div className="mt-3 space-y-3 overflow-y-auto pr-1" style={{ maxHeight }}>
        {parentTreeOptions.length > 0 ? (
          <div>
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Parent Agencies
            </p>
            <div className="space-y-2">
              {parentTreeOptions.map(({ parent, branches }) => {
                const expanded = searchText.trim() ? true : isParentExpanded(parent.id)

                return (
                  <div
                    key={parent.id}
                    className="rounded-[20px] border border-white/10 bg-white/[0.03] px-3 py-3"
                  >
                    <div className="flex items-start gap-2">
                      {branches.length > 0 ? (
                        <button
                          className="mt-0.5 rounded-full p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            onToggleParent(parent.id)
                          }}
                          aria-label={expanded ? 'Collapse parent family' : 'Expand parent family'}
                        >
                          <ChevronRight className={`h-4 w-4 transition ${expanded ? 'rotate-90' : ''}`} />
                        </button>
                      ) : (
                        <span className="mt-0.5 h-6 w-6 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{parent.name}</p>
                        <p className="mt-1 text-xs text-slate-300">
                          {parent.code} · Parent · {parent.city}
                        </p>
                        {expanded ? (
                          <div className="mt-3 space-y-2 border-l border-white/10 pl-3">
                            {[
                              {
                                key: `${parent.id}-consolidated`,
                                label: 'Consolidated Report',
                                meta: 'Parent + Branches — Consolidated',
                                includeBranches: true,
                              },
                              {
                                key: `${parent.id}-parent-only`,
                                label: 'Parent Only',
                                meta: 'Selected parent agency only',
                                includeBranches: false,
                              },
                            ].map((option) => (
                              <button
                                key={option.key}
                                ref={(node) => {
                                  optionRefs.current[option.key] = node
                                }}
                                className={`block w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                                  activeOptionKey === option.key ||
                                  isTreeSelectionActive(
                                    parent.id,
                                    option.includeBranches ? 'consolidated' : 'parent-only',
                                  )
                                    ? 'border-cyan-300/40 bg-cyan-400/10 text-white'
                                    : 'border-transparent bg-white/[0.02] text-slate-100 hover:border-cyan-300/20 hover:bg-white/[0.05]'
                                }`}
                                type="button"
                                aria-selected={
                                  activeOptionKey === option.key ||
                                  isTreeSelectionActive(
                                    parent.id,
                                    option.includeBranches ? 'consolidated' : 'parent-only',
                                  )
                                }
                                onMouseEnter={() => onActiveOptionChange(option.key)}
                                onClick={() => onSelect(parent.id, { includeBranches: option.includeBranches })}
                              >
                                <span className="block">{option.label}</span>
                                <span className="mt-1 block text-xs text-slate-300">{option.meta}</span>
                              </button>
                            ))}
                            {branches.map((branch) => {
                              const optionKey = `${branch.id}-branch`

                              return (
                                <button
                                  key={branch.id}
                                  ref={(node) => {
                                    optionRefs.current[optionKey] = node
                                  }}
                                  className={`block w-full rounded-xl border px-3 py-2 text-left text-sm transition ${
                                    activeOptionKey === optionKey || isTreeSelectionActive(branch.id, 'branch')
                                      ? 'border-cyan-300/40 bg-cyan-400/10 text-white'
                                      : 'border-transparent bg-white/[0.02] text-slate-100 hover:border-cyan-300/20 hover:bg-white/[0.05]'
                                  }`}
                                  type="button"
                                  aria-selected={
                                    activeOptionKey === optionKey || isTreeSelectionActive(branch.id, 'branch')
                                  }
                                  onMouseEnter={() => onActiveOptionChange(optionKey)}
                                  onClick={() => onSelect(branch.id)}
                                >
                                  <span className="block truncate text-white">{branch.name}</span>
                                  <span className="mt-1 block text-xs text-slate-300">
                                    {branch.code} · Branch · {branch.city} · Branch of {parent.name}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {filteredStandaloneAgencies.length > 0 ? (
          <div>
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Standalone Agencies
            </p>
            <div className="space-y-2">
              {filteredStandaloneAgencies.map((agency) => {
                const optionKey = `${agency.id}-standalone`

                return (
                  <button
                    key={agency.id}
                    ref={(node) => {
                      optionRefs.current[optionKey] = node
                    }}
                    className={`w-full rounded-[20px] border px-3 py-3 text-left text-sm transition ${
                      activeOptionKey === optionKey || (selectedAgencyId === agency.id && !includeBranches)
                        ? 'border-cyan-300/40 bg-cyan-400/10 text-white'
                        : 'border-white/10 bg-white/[0.03] text-slate-100 hover:border-cyan-300/30 hover:bg-white/[0.06]'
                    }`}
                    type="button"
                    aria-selected={activeOptionKey === optionKey || (selectedAgencyId === agency.id && !includeBranches)}
                    onMouseEnter={() => onActiveOptionChange(optionKey)}
                    onClick={() => onSelect(agency.id)}
                  >
                    <span className="block font-semibold">{agency.name}</span>
                    <span className="mt-1 block text-xs text-slate-300">
                      {agency.code} · Standalone · {agency.city}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        {parentTreeOptions.length === 0 && filteredStandaloneAgencies.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-4 text-sm text-slate-300">
            No agencies match this search.
          </p>
        ) : null}
      </div>
    </>
  )
}
