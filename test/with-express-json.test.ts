/**
 * @jest-environment node
 */
import { HttpServer } from '@open-draft/test-server/http'
import { HttpResponse, http } from 'msw'
import { createMiddleware } from '../src'

const httpServer = new HttpServer((app) => {
  app.use(
    createMiddleware(
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
    ),
  )
})

beforeAll(async () => {
  await httpServer.listen()
})

afterAll(async () => {
  await httpServer.close()
})

it('supports "application/json" requests', async () => {
  const response = await fetch(httpServer.http.url('/user'), {
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
