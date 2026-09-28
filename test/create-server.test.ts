import type { AddressInfo } from 'node:net'
import { http, HttpResponse } from 'msw'
import { createServer } from '../src'

const server = createServer(
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

  http.post('/users', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/error', () => {
    throw new Error('Something went wrong.')
  }),
)

function url(pathname: string): URL {
  const address = server.address()

  if (address == null || typeof address === 'string') {
    throw new Error('Failed to get the test server address')
  }

  return new URL(
    pathname,
    `http://127.0.0.1:${(address satisfies AddressInfo).port}`,
  )
}

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
})

afterAll(async () => {
  server.closeAllConnections()

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
})

it('returns the mocked response for a matching request', async () => {
  const response = await fetch(url('/user'))

  expect(response.status).toBe(200)
  expect(response.headers.get('x-my-header')).toBe('value')
  await expect(response.json()).resolves.toEqual({ firstName: 'John' })
})

it('returns the mocked 204 with empty body', async () => {
  const response = await fetch(url('/users'), { method: 'POST' })

  expect(response.status).toBe(204)
  expect(response.bodyUsed).toBeFalsy()
})

it('returns 404 given no matching request handler', async () => {
  const response = await fetch(url('/unknown'))

  expect(response.status).toBe(404)
  await expect(response.json()).resolves.toEqual({ error: 'Mock not found' })
})

it('returns 500 when a request handler throws', async () => {
  const response = await fetch(url('/error'))

  expect(response.status).toBe(500)
})
