import path from 'node:path'
import express from 'express'
import { createMiddleware } from '@msw/serve/express'
import { handlers } from './mocks/index.ts'

const app = express()

app.use(express.static(path.join(import.meta.dirname, 'public')))
app.use(express.json())

// Apply the middleware to handle incoming requests
// and resolve them against the matching request handlers.
app.use(createMiddleware(...handlers))

app.use((_req, res) => {
  res.status(404).send({ error: 'Mock not found' })
})

app.listen(9090, () => {
  console.log('Ready at http://localhost:9090')
})
