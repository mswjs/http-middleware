import express from 'express'
import { HttpResponse, http } from 'msw'
import { createMiddleware } from '../../src/express'
import { createTestServer } from '../utils'

const handlers = [
  http.post<never, { firstName: string }>('/user', async ({ request }) => {
    const { firstName } = await request.json()

    return HttpResponse.json(
      { firstName },
      {
        headers: {
          'x-my-header': 'value',
        },
      },
    )
  }),
]

it('supports "application/json" requests (no body parser)', async () => {
  const app = express()
  app.use(createMiddleware(...handlers))

  await using server = await createTestServer(app)

  const response = await fetch(server.url('/user'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ firstName: 'John' }),
  })

  expect(response.status).toBe(200)
  expect(response.headers.get('x-my-header')).toBe('value')
  await expect(response.json()).resolves.toEqual({ firstName: 'John' })
})

it('supports "application/json" requests (json body parser)', async () => {
  const app = express()
  app.use(express.json())
  app.use(createMiddleware(...handlers))

  await using server = await createTestServer(app)

  const response = await fetch(server.url('/user'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ firstName: 'John' }),
  })

  expect(response.status).toBe(200)
  expect(response.headers.get('x-my-header')).toBe('value')
  await expect(response.json()).resolves.toEqual({ firstName: 'John' })
})
