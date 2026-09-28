import fastify, { type FastifyInstance } from 'fastify'
import { http, HttpResponse, passthrough } from 'msw'
import { createMiddleware } from '../../src/fastify'

async function createApp(): Promise<FastifyInstance> {
  const app = fastify()

  // Apply the HTTP middleware to this Fastify server
  // so that any matching request is resolved from the mocks.
  app.addHook(
    'onRequest',
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

  app.get('/book', () => {
    return 'book'
  })

  app.get('/passthrough', () => {
    return 'original'
  })

  await app.listen({ port: 0, host: '127.0.0.1' })

  return app
}

let app: FastifyInstance

function url(pathname: string): URL {
  const address = app.server.address()

  if (address == null || typeof address === 'string') {
    throw new Error('Failed to get the test server address')
  }

  return new URL(pathname, `http://${address.address}:${address.port}`)
}

beforeAll(async () => {
  app = await createApp()
})

afterAll(async () => {
  await app.close()
})

it('returns the mocked response when requesting the middleware', async () => {
  const response = await fetch(url('/user'))

  expect(response.headers.get('x-my-header')).toEqual('value')
  await expect(response.json()).resolves.toEqual({ firstName: 'John' })
})

it('returns the mocked 204 with empty body', async () => {
  const response = await fetch(url('/users'), {
    method: 'POST',
  })

  expect(response.status).toEqual(204)
  expect(response.ok).toBeTruthy()
  expect(response.bodyUsed).toBeFalsy()
})

it('returns the original response given no matching request handler', async () => {
  const response = await fetch(url('/book'))
  await expect(response.text()).resolves.toBe('book')
})

it('returns the original response given a passthrough handler', async () => {
  const response = await fetch(url('/passthrough'))

  expect(response.status).toBe(200)
  await expect(response.text()).resolves.toBe('original')
})

it('forwards handler errors to the error handler', async () => {
  const response = await fetch(url('/error'))

  expect(response.status).toEqual(500)
  expect(response.ok).toBeFalsy()
})

it('supports sending multiple cookies in the response', async () => {
  const response = await fetch(url('/cookies'))
  expect(response.headers.get('set-cookie')).toEqual('a=1, b=2')
})
