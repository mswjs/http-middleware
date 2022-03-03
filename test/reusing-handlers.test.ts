/**
 * @jest-environment jsdom
 */
import 'whatwg-fetch'
import { createServer, ServerApi } from '@open-draft/test-server'
import { PathParams, rest } from 'msw'
import { setupServer } from 'msw/node'
import { createMiddleware } from '../src'

interface UserResponse {
  firstName: string
}

const handlers = [
  rest.get<any, PathParams, UserResponse>('/user', (req, res, ctx) => {
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
  jest.spyOn(global.console, 'warn').mockImplementation()
})

afterEach(() => {
  jest.resetAllMocks()
})

afterAll(async () => {
  jest.restoreAllMocks()
  server.close()
  await httpServer.close()
})

it('returns the mocked response from the middleware', async () => {
  const res = await fetch(httpServer.http.makeUrl('/user'))
  const json = await res.json()

  expect(json).toEqual<UserResponse>({ firstName: 'John' })
  expect(console.warn).toHaveBeenCalledTimes(2)

  // MSW should still prints warnings because matching in a JSDOM context
  // wasn't successful. This isn't a typical use case, as you won't be
  // combining a running test with an HTTP server and a middleware.
  const warnings = (console.warn as jest.Mock).mock.calls.map((args) => args[0])
  expect(warnings).toEqual(
    expect.arrayContaining([
      expect.stringMatching(
        new RegExp(`GET ${httpServer.http.makeUrl('/user')}`),
      ),
      expect.stringMatching(
        new RegExp(`GET ${httpServer.http.makeUrl('/user')}`),
      ),
    ]),
  )
})

it('returns the mocked response from JSDOM', async () => {
  const res = await fetch('/user')
  const json = await res.json()

  expect(json).toEqual<UserResponse>({ firstName: 'John' })
  expect(console.warn).not.toHaveBeenCalled()
})
