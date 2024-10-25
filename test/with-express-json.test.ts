import express from 'express'
import { HttpResponse, http } from 'msw'
import { createMiddleware } from '../src'
import { createTestHttpServer } from './utils'

it('supports "application/json" requests (no body parser)', async () => {
  await using server = await createTestHttpServer((app) => {
    app.use(
      createMiddleware(
        http.post<never, { firstName: string }>(
          '/user',
          async ({ request }) => {
            const { firstName } = await request.json()

            return HttpResponse.json(
              { firstName },
              {
                headers: {
                  'x-my-header': 'value',
                },
              },
            )
          },
        ),
      ),
    )
  })

  const response = await fetch(server.http.url('/user'), {
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
  await using server = await createTestHttpServer((app) => {
    app.use(express.json())
    app.use(
      createMiddleware(
        http.post<never, { firstName: string }>(
          '/user',
          async ({ request }) => {
            const { firstName } = await request.json()

            return HttpResponse.json(
              { firstName },
              {
                headers: {
                  'x-my-header': 'value',
                },
              },
            )
          },
        ),
      ),
    )
  })

  const response = await fetch(server.http.url('/user'), {
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
