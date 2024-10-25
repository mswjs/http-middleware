import { http, HttpResponse } from 'msw'
import { createMiddleware } from '../src'
import { createTestHttpServer } from './utils'

it('supports sending multiple cookies in the response', async () => {
  await using server = await createTestHttpServer((app) => {
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

  const response = await fetch(server.http.url('/user'))
  expect(response.headers.get('set-cookie')).toEqual('a=1, b=2')
})
