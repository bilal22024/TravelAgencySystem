import { render, screen } from '@testing-library/react'
import { LineChartCard } from '@/components/charts/LineChartCard'

describe('LineChartCard', () => {
  it('renders chart copy and labels', () => {
    render(
      <LineChartCard
        title="Monthly revenue"
        description="Revenue trend"
        data={[
          { label: 'Jan', value: 100 },
          { label: 'Feb', value: 200 },
        ]}
      />,
    )

    expect(screen.getByText(/Monthly revenue/i)).toBeInTheDocument()
    expect(screen.getByText(/Revenue trend/i)).toBeInTheDocument()
    expect(screen.getByText('Jan')).toBeInTheDocument()
    expect(screen.getByText('Feb')).toBeInTheDocument()
  })
})
