import { render, screen } from '@testing-library/react'
import { BarChartCard } from '@/components/charts/BarChartCard'

describe('BarChartCard', () => {
  it('renders the provided dataset', () => {
    render(
      <BarChartCard
        title="Agency-wise revenue"
        description="Top agencies"
        data={[
          { label: 'ATL', value: 1000, secondaryValue: 120 },
          { label: 'SKY', value: 750, secondaryValue: 80 },
        ]}
        valuePrefix="$"
      />,
    )

    expect(screen.getByText(/Agency-wise revenue/i)).toBeInTheDocument()
    expect(screen.getByText(/Top agencies/i)).toBeInTheDocument()
    expect(screen.getByText('ATL')).toBeInTheDocument()
    expect(screen.getByText('SKY')).toBeInTheDocument()
  })
})
