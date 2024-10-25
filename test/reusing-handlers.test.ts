import { HttpServer } from '@open-draft/test-server/http'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { createMiddleware } from '../src'

interface UserResponse {
  firstName: string
}

const handlers = [
  http.get('http://localhost/user', () => {
    return HttpResponse.json({ firstName: 'John' }, {})
  }),
]

const httpServer = new HttpServer((app) => {
  app.use(createMiddleware(...handlers))
})

const server = setupServer(...handlers)

beforeAll(async () => {
  await httpServer.listen()
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
  const res = await fetch(httpServer.http.url('http://localhost/user'))
  const json = await res.json()

  expect(json).toEqual<UserResponse>({ firstName: 'John' })
})

it('returns the mocked response from JSDOM', async () => {
  const res = await fetch('http://localhost/user')
  const json = await res.json()

  expect(json).toEqual<UserResponse>({ firstName: 'John' })
  expect(console.warn).not.toHaveBeenCalled()
})
