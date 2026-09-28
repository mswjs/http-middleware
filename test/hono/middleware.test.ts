import { Hono } from 'hono'
import { getRequestListener } from '@hono/node-server'
import { http, HttpResponse, passthrough } from 'msw'
import { createMiddleware } from '../../src/hono'
import { createTestServer, type TestServer } from '../utils'

const app = new Hono()

// Apply the HTTP middleware to this Hono app
// so that any matching request is resolved from the mocks.
app.use(
  createMiddleware(
    http.post('/users', () => {
      return new HttpResponse(null, { status: 204 })
    }),

    http.get('/error', () => {
      throw new Error('Something went wrong.')
    }),

    http.get('/passthrough', () => {
      return passthrough()
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

app.get('/book', (context) => {
  return context.text('book')
})

app.get('/passthrough', (context) => {
  return context.text('original')
})

let server: TestServer

beforeAll(async () => {
  server = await createTestServer(getRequestListener(app.fetch))
})

afterAll(async () => {
  await server.close()
})

it('returns the mocked response when requesting the middleware', async () => {
  const response = await fetch(server.url('/user'))

  expect(response.headers.get('x-my-header')).toEqual('value')
  await expect(response.json()).resolves.toEqual({ firstName: 'John' })
})

it('returns the mocked 204 with empty body', async () => {
  const response = await fetch(server.url('/users'), {
    method: 'POST',
  })

  expect(response.status).toEqual(204)
  expect(response.ok).toBeTruthy()
  expect(response.bodyUsed).toBeFalsy()
})

it('returns the original response given no matching request handler', async () => {
  const response = await fetch(server.url('/book'))
  await expect(response.text()).resolves.toBe('book')
})

it('returns the original response given a passthrough handler', async () => {
  const response = await fetch(server.url('/passthrough'))

  expect(response.status).toBe(200)
  await expect(response.text()).resolves.toBe('original')
})

it('forwards handler errors to the error handler', async () => {
  const consoleErrorSpy = vi
    .spyOn(console, 'error')
    .mockImplementation(() => {})

  const response = await fetch(server.url('/error'))

  expect(response.status).toEqual(500)
  expect(response.ok).toBeFalsy()
  expect(consoleErrorSpy).toHaveBeenCalledExactlyOnceWith(
    new Error('Something went wrong.'),
  )

  consoleErrorSpy.mockRestore()
})

it('supports sending multiple cookies in the response', async () => {
  const cookiesApp = new Hono()
  cookiesApp.use(
    createMiddleware(
      http.get('/cookies', () => {
        return HttpResponse.json(
          {},
          {
            headers: [
              ['Set-Cookie', 'a=1'],
              ['Set-Cookie', 'b=2'],
            ],
          },
        )
      }),
    ),
  )

  await using cookiesServer = await createTestServer(
    getRequestListener(cookiesApp.fetch),
  )

  const response = await fetch(cookiesServer.url('/cookies'))
  expect(response.headers.get('set-cookie')).toEqual('a=1, b=2')
})
