import { HttpServer } from '@open-draft/test-server/http'
import { http, HttpResponse } from 'msw'
import { createMiddleware } from '../src'

const httpServer = new HttpServer((app) => {
  // Apply the HTTP middleware to this Express server
  // so that any matching request is resolved from the mocks.
  app.use(
    createMiddleware(
      http.post('/users', () => {
        return new HttpResponse(null, { status: 204 })
      }),

      http.get('/error', () => {
        throw new Error('Something went wrong.')
      }),

      http.get('/user', () => {
        return HttpResponse.json(
          { firstName: 'John' },
          {
            headers: {
              'x-my-header': 'value',
            },
          },
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

afterEach(() => {
  vi.resetAllMocks()
})

it('returns the mocked response when requesting the middleware', async () => {
  const response = await fetch(httpServer.http.url('/user'))

  expect(response.headers.get('x-my-header')).toEqual('value')
  await expect(response.json()).resolves.toEqual({ firstName: 'John' })
})

it('returns the mocked 204 with empty body', async () => {
  const response = await fetch(httpServer.http.url('/users'), {
    method: 'POST',
  })

  expect(response.status).toEqual(204)
  expect(response.ok).toBeTruthy()
  expect(response.bodyUsed).toBeFalsy()
})

it('returns the original response given no matching request handler', async () => {
  const response = await fetch(httpServer.http.url('/book'))
  await expect(response.text()).resolves.toBe('book')
})

it('forwards promise rejections to error middleware', async () => {
  const response = await fetch(httpServer.http.url('/error'))

  expect(response.status).toEqual(500)
  expect(response.ok).toBeFalsy()
})
