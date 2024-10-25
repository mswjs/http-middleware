/**
 * @jest-environment node
 */
import { HttpServer } from '@open-draft/test-server/http'
import { http, HttpResponse } from 'msw'
import { createMiddleware } from '../src'

const httpServer = new HttpServer((app) => {
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
})

beforeAll(async () => {
  await httpServer.listen()
})

afterAll(async () => {
  await httpServer.close()
})

it('supports sending multiple cookies in the response', async () => {
  const response = await fetch(httpServer.http.url('/user'))
  expect(response.headers.get('set-cookie')).toEqual('a=1, b=2')
})
