export type HealthResponseDto = {
  status: 'ok'
  service: 'travel-agency-api'
  timestamp: string
  environment: 'development' | 'test' | 'production'
}
