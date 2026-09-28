import express from 'express'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { createMiddleware } from '../../src/express'
import { createTestServer, type TestServer } from '../utils'

interface UserResponse {
  firstName: string
}

const handlers = [
  http.get('http://localhost/user', () => {
    return HttpResponse.json({ firstName: 'John' }, {})
  }),
]

const app = express()
app.use(createMiddleware(...handlers))

const server = setupServer(...handlers)
let httpServer: TestServer

beforeAll(async () => {
  httpServer = await createTestServer(app)
  server.listen()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.resetAllMocks()
  server.resetHandlers()
})

afterAll(async () => {
  vi.restoreAllMocks()
  server.close()
  await httpServer.close()
})

it('returns the mocked response from the middleware', async () => {
  const res = await fetch(httpServer.url('http://localhost/user'))
  const json = await res.json()

  expect(json).toEqual<UserResponse>({ firstName: 'John' })
})

it('returns the mocked response from JSDOM', async () => {
  const res = await fetch('http://localhost/user')
  const json = await res.json()

  expect(json).toEqual<UserResponse>({ firstName: 'John' })
  expect(console.warn).not.toHaveBeenCalled()
})
