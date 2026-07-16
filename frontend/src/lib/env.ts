import { z } from 'zod'

const frontendEnvironmentSchema = z.object({
  VITE_APP_NAME: z.string().min(1),
  VITE_API_BASE_URL: z.string().url(),
})

export function getFrontendEnvironment() {
  const parsedEnvironment = frontendEnvironmentSchema.parse(import.meta.env)

  return {
    appName: parsedEnvironment.VITE_APP_NAME,
    apiBaseUrl: parsedEnvironment.VITE_API_BASE_URL,
  }
}
