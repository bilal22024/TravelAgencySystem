import { createServer } from 'node:http'
import { env } from './config/env.js'
import { prisma } from './lib/prisma.js'
import { createApp } from './app/create-app.js'

const app = createApp()
const server = createServer(app)

server.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`)
})

async function shutdown(signal: string) {
  console.log(`Received ${signal}. Closing server gracefully.`)
  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}

process.on('SIGINT', () => {
  void shutdown('SIGINT')
})

process.on('SIGTERM', () => {
  void shutdown('SIGTERM')
})
