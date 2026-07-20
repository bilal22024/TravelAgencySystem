import { fireEvent, render, screen } from '@testing-library/react'
import type { AgencyListItem } from '@/types/api'
import { AgencySelectorTreeList } from '@/components/reports/AgencySelectorTreeList'
import { PortalSurface } from '@/components/ui/PortalSurface'

const mockAgencies: AgencyListItem[] = [
  {
    id: 'parent-1',
    parentAgencyId: null,
    name: 'Almuhajir Travel',
    code: 'ALM',
    agencyType: 'PARENT',
    category: null,
    openingBalance: 0,
    primaryContactPerson: null,
    contactEmail: null,
    contactPhone: null,
    addressLine1: null,
    addressLine2: null,
    city: 'Riyadh',
    cityRef: {
      id: 'city-riyadh',
      name: 'Riyadh',
    },
    state: null,
    country: 'Saudi Arabia',
    countryRef: {
      id: 'country-saudi-arabia',
      name: 'Saudi Arabia',
    },
    postalCode: null,
    notes: null,
    isActive: true,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    parentAgency: null,
    branchCount: 2,
  },
  {
    id: 'branch-1',
    parentAgencyId: 'parent-1',
    name: 'Ikhlas Travel',
    code: 'IKH',
    agencyType: 'BRANCH',
    category: null,
    openingBalance: 0,
    primaryContactPerson: null,
    contactEmail: null,
    contactPhone: null,
    addressLine1: null,
    addressLine2: null,
    city: 'Jeddah',
    cityRef: {
      id: 'city-jeddah',
      name: 'Jeddah',
    },
    state: null,
    country: 'Saudi Arabia',
    countryRef: {
      id: 'country-saudi-arabia',
      name: 'Saudi Arabia',
    },
    postalCode: null,
    notes: null,
    isActive: true,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    parentAgency: {
      id: 'parent-1',
      name: 'Almuhajir Travel',
      code: 'ALM',
      agencyType: 'PARENT',
    },
    branchCount: 0,
  },
  {
    id: 'branch-2',
    parentAgencyId: 'parent-1',
    name: 'Arab Quraishi Travel',
    code: 'AQT',
    agencyType: 'BRANCH',
    category: null,
    openingBalance: 0,
    primaryContactPerson: null,
    contactEmail: null,
    contactPhone: null,
    addressLine1: null,
    addressLine2: null,
    city: 'Makkah',
    cityRef: {
      id: 'city-makkah',
      name: 'Makkah',
    },
    state: null,
    country: 'Saudi Arabia',
    countryRef: {
      id: 'country-saudi-arabia',
      name: 'Saudi Arabia',
    },
    postalCode: null,
    notes: null,
    isActive: true,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    parentAgency: {
      id: 'parent-1',
      name: 'Almuhajir Travel',
      code: 'ALM',
      agencyType: 'PARENT',
    },
    branchCount: 0,
  },
]
describe('AgencyReportPage selector', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
  })

  it('renders the travel agency selector menu in a portal attached to document.body', () => {
    render(
      <PortalSurface>
        <div role="dialog" aria-label="Travel agency selector" style={{ position: 'fixed' }}>
          Selector content
        </div>
      </PortalSurface>,
    )

    const selectorDialog = screen.getByRole('dialog', { name: /travel agency selector/i })
    expect(document.body).toContainElement(selectorDialog)
    expect(selectorDialog).toHaveStyle({ position: 'fixed' })
  })

  it('selects a branch report from the hierarchy tree', () => {
    const handleSelect = vi.fn()
    const handleSearch = vi.fn()
    const handleToggleParent = vi.fn()
    const handleActiveOptionChange = vi.fn()
    const optionRefs = {
      current: {} as Record<string, HTMLButtonElement | null>,
    }

    render(
      <AgencySelectorTreeList
        optionRefs={optionRefs}
        searchText=""
        onSearchTextChange={handleSearch}
        maxHeight={320}
        parentTreeOptions={[
          {
            parent: mockAgencies[0],
            branches: [mockAgencies[1], mockAgencies[2]],
          },
        ]}
        filteredStandaloneAgencies={[]}
        activeOptionKey={null}
        selectedAgencyId="parent-1"
        includeBranches={true}
        onActiveOptionChange={handleActiveOptionChange}
        onToggleParent={handleToggleParent}
        isParentExpanded={() => true}
        isTreeSelectionActive={(agencyId, selection) =>
          agencyId === 'parent-1' && selection === 'consolidated'
        }
        onSelect={handleSelect}
      />,
    )

    expect(screen.getByText(/parent agencies/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /consolidated report/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )

    fireEvent.click(screen.getByRole('button', { name: /ikhlas travel/i }))

    expect(handleSelect).toHaveBeenCalledWith('branch-1')
    expect(screen.getAllByText(/branch of almuhajir travel/i)).toHaveLength(2)
  })
})
