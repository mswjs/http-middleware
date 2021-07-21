import express from 'express'
import { RequestHandler } from 'msw'
import { createMiddleware } from './middleware'

export function createServer(...handlers: RequestHandler[]) {
  const app = express()

  app.use(express.json())
  app.use(createMiddleware(...handlers))
  app.use((_req, res) => {
    res.status(404).json({
      error: 'Mock not found',
    })
  })

  return app
}
