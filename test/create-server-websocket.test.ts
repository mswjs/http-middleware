import type { AddressInfo } from 'node:net'
import { http, HttpResponse } from 'msw'
import { createServer } from '../src'
import { webSocketHandlers } from './websocket-handlers'
import { connectWebSocket, waitForMessage } from './websocket-utils'

const server = createServer(
  ...webSocketHandlers,
  http.get('/user', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
)

function url(pathname: string): URL {
  const address = server.address()

  if (address == null || typeof address === 'string') {
    throw new Error('Failed to get the test server address')
  }

  return new URL(
    pathname,
    `http://127.0.0.1:${(address satisfies AddressInfo).port}`,
  )
}

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
})

afterAll(async () => {
  server.closeAllConnections()

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
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
