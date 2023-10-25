/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import express from 'express'
import { HttpServer } from '@open-draft/test-server/http'
import { HttpResponse, http } from 'msw'
import { createMiddleware } from '../src'

const httpServer = new HttpServer((app) => {
  // Apply a request body JSON middleware.
  app.use(express.json())

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

  app.use((_req, res) => {
    res.status(404).json({
      error: 'Mock not found',
    })
  })

  return app
})

beforeAll(async () => {
  await httpServer.listen()
})

afterAll(async () => {
  await httpServer.close()
})

it('supports usage alongside with the "express.json()" middleware', async () => {
  const res = await fetch(httpServer.http.url('/user'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ firstName: 'John' }),
  })

  expect(res.status).toBe(200)
  expect(res.headers.get('x-my-header')).toBe('value')
  expect(await res.json()).toEqual({ firstName: 'John' })
})
