/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { ServerApi, createServer } from '@open-draft/test-server'
import { RequestHandler, rest } from 'msw'
import { createMiddleware } from '../src'

let server: ServerApi

const handlers: RequestHandler[] = [
  rest.post('/user', async (req, res, ctx) => {
    const { firstName } = await req.json()
    return res(ctx.set('x-my-header', 'value'), ctx.json({ firstName }))
  }),
]

beforeAll(async () => {
  // createServer automatically applies bodyParser.json()
  server = await createServer((app) => {
    app.use(createMiddleware(...handlers))
  })
})

afterAll(async () => {
  await server.close()
})

it('supports usage alongside with the "express.json()" middleware', async () => {
  const res = await fetch(server.http.makeUrl('/user'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ firstName: 'John' }),
  })

  expect(res.status).toBe(200)
  expect(res.headers.get('x-my-header')).toBe('value')
  expect(await res.json()).toEqual({ firstName: 'John' })
})
