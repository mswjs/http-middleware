/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import express from 'express'
import { HttpResponse, http } from 'msw'
import { createMiddleware } from '../src'

import httpModule from 'http'
import { AddressInfo } from 'net'

const app = express()

app.use(express.raw({ type: '*/*' }))

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

const httpServer = httpModule.createServer(app)

beforeAll(() => {
  httpServer.listen({ port: 0 })
})

afterAll(async () => {
  httpServer.close()
})

it('supports usage with json payload', async () => {
  const { port } = httpServer.address() as AddressInfo
  const res = await fetch(`http://localhost:${port}/user`, {
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
