import express from 'express'
import { HttpHandler } from 'msw'
import { createMiddleware } from './middleware'

export function createServer(...handlers: Array<HttpHandler>): express.Express {
  const app = express()

  app.use(express.raw({ type: '*/*' }))
  app.use(createMiddleware(...handlers))
  app.use((_req, res) => {
    res.status(404).json({
      error: 'Mock not found',
    })
  })

  return app
}
