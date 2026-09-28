import express from 'express'
import { HttpResponse, http } from 'msw'
import { createMiddleware } from '../../src/express'
import { createTestServer } from '../utils'

const handlers = [
  http.post('/user', async ({ request }) => {
    const form = await request.formData()
    const field1 = form.get('field1')
    const field2 = form.get('field2')

    if (typeof field1 !== 'string' || typeof field2 !== 'string') {
      return HttpResponse.error()
    }

    return HttpResponse.json(
      { field1, field2 },
      {
        headers: {
          'x-my-header': 'value',
        },
      },
    )
  }),
]

function createForm(): FormData {
  const form = new FormData()
  form.append('field1', 'value1')
  form.append('field2', 'value2')
  return form
}

it('supports "multipart/form-data" requests (no body parser)', async () => {
  const app = express()
  app.use(createMiddleware(...handlers))

  await using server = await createTestServer(app)

  const response = await fetch(server.url('/user'), {
    method: 'POST',
    body: createForm(),
  })

  expect(response.status).toBe(200)
  expect(response.headers.get('x-my-header')).toBe('value')
  await expect(response.json()).resolves.toEqual({
    field1: 'value1',
    field2: 'value2',
  })
})

it('supports "multipart/form-data" requests (raw body parser)', async () => {
  const app = express()
  app.use(express.raw({ type: '*/*' }))
  app.use(createMiddleware(...handlers))

  await using server = await createTestServer(app)

  const response = await fetch(server.url('/user'), {
    method: 'POST',
    body: createForm(),
  })

  expect(response.status).toBe(200)
  expect(response.headers.get('x-my-header')).toBe('value')
  await expect(response.json()).resolves.toEqual({
    field1: 'value1',
    field2: 'value2',
  })
})
