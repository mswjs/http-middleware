import express from 'express'
import { HttpHandler } from 'msw'
import { createMiddleware } from './middleware'

type ParserOptions = Parameters<typeof express.raw>[0]

export function createServer(
  parserOptions?: ParserOptions,
  ...handlers: Array<HttpHandler>
): express.Express {
  const app = express()

  app.use(express.raw({ type: '*/*', limit: '20mb', ...parserOptions }))
  app.use(createMiddleware(...handlers))
  app.use((_req, res) => {
    res.status(404).json({
      error: 'Mock not found',
    })
  })

  return app
}
