import fastify, { type FastifyInstance } from 'fastify'
import { http, HttpResponse } from 'msw'
import { createMiddleware } from '../../src/fastify'
import { webSocketHandlers } from '../websocket-handlers'
import { connectWebSocket, waitForMessage } from '../websocket-utils'

let app: FastifyInstance

function url(pathname: string): URL {
  const address = app.server.address()

  if (address == null || typeof address === 'string') {
    throw new Error('Failed to get the test server address')
  }

  return new URL(pathname, `http://${address.address}:${address.port}`)
}

beforeAll(async () => {
  app = fastify()
  app.addHook(
    'onRequest',
    createMiddleware(
      ...webSocketHandlers,
      http.get('/user', () => {
        return HttpResponse.json({ firstName: 'John' })
      }),
    ),
  )
  await app.listen({ port: 0, host: '127.0.0.1' })
})

afterAll(async () => {
  await app.close()
})

it('routes WebSocket messages through the matching handler', async () => {
  const socket = await connectWebSocket(url('/chat'))

  socket.send('hello')
  await expect(waitForMessage(socket)).resolves.toBe('echo:hello')

  socket.close()
})

it('keeps resolving HTTP requests alongside WebSocket handlers', async () => {
  const response = await fetch(url('/user'))
  await expect(response.json()).resolves.toEqual({ firstName: 'John' })
})

it('rejects WebSocket connections given no matching handler', async () => {
  await expect(connectWebSocket(url('/unknown'))).rejects.toThrow(
    'Failed to connect',
  )
})

it('supports GraphQL subscriptions', async () => {
  const socket = await connectWebSocket(url('/graphql'), [
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
