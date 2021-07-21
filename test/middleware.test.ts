/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { ServerApi, createServer } from '@open-draft/test-server'
import { RequestHandler, rest } from 'msw'
import { createMiddleware } from '../src'

let server: ServerApi

const handlers: RequestHandler[] = [
  rest.get('/user', (_req, res, ctx) => {
    return res(ctx.set('x-my-header', 'value'), ctx.json({ firstName: 'John' }))
  }),
]

beforeAll(async () => {
  server = await createServer((app) => {
    // Apply the HTTP middleware to this Express server
    // so that any matching request is resolved from the mocks.
    app.use(createMiddleware(...handlers))

    app.get('/book', (req, res) => {
      return res.status(200).send('book')
    })
  })
})

afterAll(async () => {
  await server.close()
})

it('returns the mocked response when requesting the middleware', async () => {
  const res = await fetch(server.http.makeUrl('/user'))
  const json = await res.json()

  expect(res.headers.get('x-my-header')).toEqual('value')
  expect(json).toEqual({ firstName: 'John' })
})

it('returns the original response given no matching request handler', async () => {
  const res = await fetch(server.http.makeUrl('/book'))
  const text = await res.text()

  expect(text).toEqual('book')
})
