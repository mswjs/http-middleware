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
        const form = await request.formData()
        const field1 = form.get('field1')
        const field2 = form.get('field2')

        if (!field1 || typeof field1 !== 'string') return HttpResponse.error()
        if (!field2 || typeof field2 !== 'string') return HttpResponse.error()

        return HttpResponse.json(
          { field1, field2 },
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

it('supports "multipart/form-data" requests', async () => {
  const form = new FormData()
  form.append('field1', 'value1')
  form.append('field2', 'value2')

  const res = await fetch(httpServer.http.url('/user'), {
    method: 'POST',
    body: form,
  })

  expect(res.status).toBe(200)
  expect(res.headers.get('x-my-header')).toBe('value')
  expect(await res.json()).toEqual({ field1: 'value1', field2: 'value2' })
})
