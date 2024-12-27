import express from 'express'
import { RequestHandler } from 'msw'
import { createMiddleware } from './middleware'

export function createServer(
  ...handlers: Array<RequestHandler>
): express.Express {
  const app = express()

  app.use(createMiddleware(...handlers))
  app.use((_req, res) => {
    res.status(404).json({
      error: 'Mock not found',
    })
  })

  return app
}
