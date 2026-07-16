import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { LoginForm } from '@/features/auth/components/LoginForm'

describe('LoginForm', () => {
  it('shows validation feedback when fields are empty', () => {
    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <LoginForm onSuccess={() => undefined} />
      </QueryClientProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: /Enter dashboard/i }))

    expect(screen.getByText(/Email and password are required/i)).toBeInTheDocument()
  })
})
