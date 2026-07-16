import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import swaggerUi from 'swagger-ui-express'
import { env } from '../config/env.js'
import { openApiDocument } from '../docs/openapi.js'
import { errorHandler } from '../middlewares/error-handler.js'
import { notFoundHandler } from '../middlewares/not-found-handler.js'
import { apiRouter } from '../routes/index.js'

function isAllowedCorsOrigin(origin: string) {
  if (origin === env.CLIENT_URL) {
    return true
  }

  if (env.NODE_ENV === 'development') {
    return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)
  }

  return false
}

export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  app.set('trust proxy', env.TRUST_PROXY)
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow non-browser requests and the configured frontend origin.
        if (!origin || isAllowedCorsOrigin(origin)) {
          callback(null, true)
          return
        }

        callback(new Error('Not allowed by CORS'))
      },
      credentials: true,
    }),
  )
  app.use(helmet())
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'))
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  app.get('/api/openapi.json', (_request, response) => {
    return response.status(200).json(openApiDocument)
  })
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument))
  app.use('/api', apiRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
