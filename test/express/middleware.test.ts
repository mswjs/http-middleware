import express from 'express'
import { http, HttpResponse, passthrough } from 'msw'
import { createMiddleware } from '../../src/express'
import { createTestServer, type TestServer } from '../utils'

const app = express()

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

app.get('/book', (_req, res) => {
  res.status(200).send('book')
})

app.get('/passthrough', (_req, res) => {
  res.status(200).send('original')
})

let server: TestServer

beforeAll(async () => {
  server = await createTestServer(app)
})

afterAll(async () => {
  await server.close()
})

afterEach(() => {
  vi.resetAllMocks()
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

it('forwards promise rejections to error middleware', async () => {
  const response = await fetch(server.url('/error'))

  expect(response.status).toEqual(500)
  expect(response.ok).toBeFalsy()
})
