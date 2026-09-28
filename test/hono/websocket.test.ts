import { Hono } from 'hono'
import { getRequestListener } from '@hono/node-server'
import { http, HttpResponse } from 'msw'
import { createMiddleware } from '../../src/hono'
import { createTestServer, type TestServer } from '../utils'
import { webSocketHandlers } from '../websocket-handlers'
import { connectWebSocket, waitForMessage } from '../websocket-utils'

const app = new Hono()

app.use(
  createMiddleware(
    ...webSocketHandlers,
    http.get('/user', () => {
      return HttpResponse.json({ firstName: 'John' })
    }),
  ),
)

let server: TestServer

beforeAll(async () => {
  server = await createTestServer(getRequestListener(app.fetch))
})

afterAll(async () => {
  await server.close()
})

it('routes WebSocket messages through the matching handler', async () => {
  const socket = await connectWebSocket(server.url('/chat'))

  socket.send('hello')
  await expect(waitForMessage(socket)).resolves.toBe('echo:hello')

  socket.close()
})

it('keeps resolving HTTP requests alongside WebSocket handlers', async () => {
  const response = await fetch(server.url('/user'))
  await expect(response.json()).resolves.toEqual({ firstName: 'John' })
})

it('rejects WebSocket connections given no matching handler', async () => {
  await expect(connectWebSocket(server.url('/unknown'))).rejects.toThrow(
    'Failed to connect',
  )
})

it('supports GraphQL subscriptions', async () => {
  const socket = await connectWebSocket(server.url('/graphql'), [
    'graphql-transport-ws',
  ])

  socket.send(JSON.stringify({ type: 'connection_init' }))
  await expect(waitForMessage(socket)).resolves.toBe(
    JSON.stringify({ type: 'connection_ack' }),
  )

  socket.send(
    JSON.stringify({
      type: 'subscribe',
      id: '1',
      payload: { query: 'subscription OnGreeting { greeting }' },
    }),
  )
  await expect(waitForMessage(socket).then(JSON.parse)).resolves.toEqual({
    type: 'next',
    id: '1',
    payload: { data: { greeting: 'hello' } },
  })

  socket.close()
})
