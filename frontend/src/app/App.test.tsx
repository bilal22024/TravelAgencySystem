import { render, screen } from '@testing-library/react'
import App from '@/App'
import { queryClient } from '@/lib/query-client'

describe('App', () => {
  beforeEach(() => {
    window.localStorage.clear()
    queryClient.clear()
  })

  it('renders the login page for unauthenticated visitors', () => {
    window.history.pushState({}, '', '/login')
    render(<App />)

    expect(screen.getByRole('heading', { name: /Enter the admin dashboard/i })).toBeInTheDocument()
    expect(screen.getByText(/Secure sign in/i)).toBeInTheDocument()
  })

  it('redirects protected routes to login when there is no session', () => {
    window.history.pushState({}, '', '/agencies')
    render(<App />)

    expect(screen.getByRole('heading', { name: /Enter the admin dashboard/i })).toBeInTheDocument()
  })
})
