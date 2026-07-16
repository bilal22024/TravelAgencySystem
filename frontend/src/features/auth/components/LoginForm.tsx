import { type FormEvent, useState } from 'react'
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react'
import { useLoginMutation } from '@/features/auth/api'
import { getApiErrorMessage } from '@/lib/api-client'

type LoginFormProps = {
  onSuccess: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [validationMessage, setValidationMessage] = useState<string | null>(null)
  const loginMutation = useLoginMutation()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setValidationMessage(null)

    if (!email.trim() || !password.trim()) {
      setValidationMessage('Email and password are required.')
      return
    }

    loginMutation.mutate(
      {
        email: email.trim(),
        password: password.trim(),
      },
      {
        onSuccess: () => {
          onSuccess()
        },
      },
    )
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <label className="block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
          Email
        </span>
        <span className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition focus-within:border-cyan-300/50 focus-within:bg-white/10">
          <Mail className="h-4 w-4 text-cyan-200" />
          <input
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            type="email"
            name="email"
            autoComplete="email"
            placeholder="admin@travelagency.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </span>
      </label>

      <label className="block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
          Password
        </span>
        <span className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition focus-within:border-cyan-300/50 focus-within:bg-white/10">
          <LockKeyhole className="h-4 w-4 text-cyan-200" />
          <input
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </span>
      </label>

      {(validationMessage || loginMutation.isError) && (
        <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {validationMessage ?? getApiErrorMessage(loginMutation.error)}
        </div>
      )}

      <button
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
        type="submit"
        disabled={loginMutation.isPending}
      >
        {loginMutation.isPending ? 'Signing in...' : 'Enter dashboard'}
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  )
}
