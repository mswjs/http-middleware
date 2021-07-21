import express from 'express'
import path from 'path'
import { createMiddleware } from '../src'
import { handlers } from './mocks'

const app = express()

app.use(express.static(path.join(__dirname, '/public')))
app.use(express.json())

// Apply the middleware to handle incoming requests
// and resolve them against the matching request handlers.
app.use(createMiddleware(...handlers))

app.use((_req, res) => {
  res.status(404).send({ error: 'Mock not found' })
})

app.listen(9090, () => console.log('Ready at http://localhost:9090'))
