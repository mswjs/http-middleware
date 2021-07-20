import express from 'express'
import path from 'path'
import { createMiddleware } from '../src'
import handlers from './mocks'

const app = express()
app.use(express.static(path.join(__dirname, '/public')))
app.use(express.json())

const mswMiddleware = createMiddleware(handlers)
app.use(mswMiddleware)

app.use((_req, res) => {
  res.status(404).send({ error: 'Mock not found' })
})

app.listen(9090, () => console.log('Ready at http://localhost:9090'))
