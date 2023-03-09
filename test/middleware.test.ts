/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { HttpServer } from '@open-draft/test-server/http'
import { rest } from 'msw'
import { createMiddleware } from '../src'

const httpServer = new HttpServer((app) => {
  // Apply the HTTP middleware to this Express server
  // so that any matching request is resolved from the mocks.
  app.use(
    createMiddleware(
      rest.get('/user', (_req, res, ctx) => {
        return res(
          ctx.set('x-my-header', 'value'),
          ctx.json({ firstName: 'John' }),
        )
      }),
    ),
  )

  app.get('/book', (req, res) => {
    return res.status(200).send('book')
  })
})

beforeAll(async () => {
  await httpServer.listen()
})

afterAll(async () => {
  await httpServer.close()
})

it('returns the mocked response when requesting the middleware', async () => {
  const res = await fetch(httpServer.http.url('/user'))
  const json = await res.json()

  expect(res.headers.get('x-my-header')).toEqual('value')
  expect(json).toEqual({ firstName: 'John' })
})

it('returns the original response given no matching request handler', async () => {
  const res = await fetch(httpServer.http.url('/book'))
  const text = await res.text()

  expect(text).toEqual('book')
})
