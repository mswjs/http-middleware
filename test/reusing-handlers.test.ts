/**
 * @jest-environment jsdom
 */
import 'whatwg-fetch'
import { createServer, ServerApi } from '@open-draft/test-server'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { createMiddleware } from '../src'

interface UserResponse {
  firstName: string
}

const handlers = [
  rest.get<any, UserResponse>('/user', (req, res, ctx) => {
    return res(ctx.json({ firstName: 'John' }))
  }),
]

let httpServer: ServerApi
const server = setupServer(...handlers)

beforeAll(async () => {
  httpServer = await createServer((app) => {
    app.use(createMiddleware(...handlers))
  })

  server.listen()
})

afterAll(async () => {
  server.close()
  await httpServer.close()
})

it('returns the mocked response from the middleware', async () => {
  const res = await fetch(httpServer.http.makeUrl('/user'))
  const json = await res.json()

  expect(json).toEqual<UserResponse>({ firstName: 'John' })
})

it('returns the mocked response from JSDOM', async () => {
  const res = await fetch('/user')
  const json = await res.json()

  expect(json).toEqual<UserResponse>({ firstName: 'John' })
})
