import http from 'node:http'
import type { AnyHandler } from 'msw'
import { InMemoryHandlersController } from 'msw/experimental'
import { resolveRequest } from './utils/resolve-request.js'
import { toFetchRequest } from './utils/to-fetch-request.js'
import { sendFetchResponse } from './utils/send-fetch-response.js'
import { createWebSocketMiddleware } from './utils/websocket-middleware.js'

/**
 * Create a standalone HTTP server that resolves all incoming
 * requests (and WebSocket connections) against the given handlers.
 * Requests that match no handler receive a 404 response.
 *
 * @example
 * const server = createServer(...handlers)
 * server.listen(9090)
 */
export function createServer(...handlers: Array<AnyHandler>): http.Server {
  const controller = new InMemoryHandlersController(handlers)
  const webSocketMiddleware = createWebSocketMiddleware(controller)

  const server = http.createServer(async (incoming, outgoing) => {
    const request = toFetchRequest(incoming, {
      origin: getOrigin(incoming),
    })

    try {
      const response = await resolveRequest(request, controller)

      if (!response) {
        sendFetchResponse(
          Response.json({ error: 'Mock not found' }, { status: 404 }),
          outgoing,
        )
        return
      }

      sendFetchResponse(response, outgoing)
    } catch (error) {
      outgoing.statusCode = 500
      outgoing.end(error instanceof Error ? error.message : String(error))
    }
  })

  if (webSocketMiddleware) {
    server.on('upgrade', (incoming, socket, head) => {
      const origin = getOrigin(incoming)

      if (webSocketMiddleware.test(incoming, origin)) {
        webSocketMiddleware.upgrade(incoming, socket, head, origin)
        return
      }

      socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n')
    })
  }

  return server
}

function getOrigin(incoming: http.IncomingMessage): string {
  return `http://${incoming.headers.host}`
}
