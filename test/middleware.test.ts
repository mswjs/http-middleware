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
      http.post('/proxy', async ({ request }) => {
        return HttpResponse.json(await request.json())
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

  app.use((req, res) => {
    res.status(404).json({
      readable: req.readable,
      readableDidRead: req.readableDidRead,
      readableEnded: req.readableEnded,
    })
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

  expect.soft(response.headers.get('x-my-header')).toEqual('value')
  await expect.soft(response.json()).resolves.toEqual({ firstName: 'John' })
})

it('returns the mocked 204 with empty body', async () => {
  const response = await fetch(httpServer.http.url('/users'), {
    method: 'POST',
  })

  expect.soft(response.status).toEqual(204)
  expect.soft(response.ok).toBeTruthy()
  expect.soft(response.bodyUsed).toBeFalsy()
})

it('allows reading request body in the resolver', async () => {
  const response = await fetch(httpServer.http.url('/proxy'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ hello: 'world' }),
  })

  expect.soft(response.status).toEqual(200)
  await expect.soft(response.json()).resolves.toEqual({ hello: 'world' })
})

it('returns the original response given no matching request handler', async () => {
  const response = await fetch(httpServer.http.url('/book'))
  await expect(response.text()).resolves.toBe('book')
})

it('forwards promise rejections to error middleware', async () => {
  const response = await fetch(httpServer.http.url('/error'))

  expect.soft(response.status).toEqual(500)
  expect.soft(response.ok).toBeFalsy()
})

it('does not lock the request stream for other middleware', async () => {
  const response = await fetch(httpServer.http.url('/intentionally-unknown'), {
    method: 'POST',
    headers: { 'content-type': 'text/plain' },
    body: 'hello world',
  })

  await expect(response.json()).resolves.toEqual({
    readable: true,
    readableDidRead: false,
    readableEnded: false,
  })
})
