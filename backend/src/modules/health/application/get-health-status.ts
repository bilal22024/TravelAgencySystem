import type { HealthResponseDto } from '../dto/health-response.dto.js'

type EnvironmentName = HealthResponseDto['environment']

export function getHealthStatus(environment: EnvironmentName): HealthResponseDto {
  return {
    status: 'ok',
    service: 'travel-agency-api',
    timestamp: new Date().toISOString(),
    environment,
  }
}
