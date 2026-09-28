import express from 'express'
import { http, HttpResponse } from 'msw'
import { createMiddleware } from '../../src/express'
import { createTestServer } from '../utils'

it('supports sending multiple cookies in the response', async () => {
  const app = express()
  app.use(
    createMiddleware(
      http.get('/user', () => {
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

  await using server = await createTestServer(app)

  const response = await fetch(server.url('/user'))
  expect(response.headers.get('set-cookie')).toEqual('a=1, b=2')
})
