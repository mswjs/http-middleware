/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import express from 'express'
import { HttpServer } from '@open-draft/test-server/http'
import { rest } from 'msw'
import { createMiddleware } from '../src'

const httpServer = new HttpServer((app) => {
  app.use(
    createMiddleware(
      rest.post('/user', async (req, res, ctx) => {
        const { firstName } = await req.json()
        return res(ctx.set('x-my-header', 'value'), ctx.json({ firstName }))
      }),
    ),
  )

  // Apply a request body JSON middleware.
  app.use(express.json())
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
