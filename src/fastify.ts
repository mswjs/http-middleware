import { Readable } from 'node:stream'
import type { ReadableStream as NodeReadableStream } from 'node:stream/web'
import type { onRequestAsyncHookHandler } from 'fastify'
import type { AnyHandler } from 'msw'
import { InMemoryHandlersController } from 'msw/experimental'
import { resolveRequest } from './utils/resolve-request.js'
import { toFetchRequest } from './utils/to-fetch-request.js'
import { createWebSocketMiddleware } from './utils/websocket-middleware.js'

/**
 * Create a Fastify `onRequest` hook that resolves incoming
 * requests (and WebSocket connections) against the given handlers.
 *
 * @example
 * app.addHook('onRequest', createMiddleware(...handlers))
 */
export function createMiddleware(
  ...handlers: Array<AnyHandler>
): onRequestAsyncHookHandler {
  const handlersController = new InMemoryHandlersController(handlers)
  const webSocketMiddleware = createWebSocketMiddleware(handlersController)

  return async (request, reply) => {
    const origin = `${request.protocol}://${request.host}`

    if (webSocketMiddleware?.test(request.raw, origin)) {
      reply.hijack()
      webSocketMiddleware.upgrade(
        request.raw,
        request.raw.socket,
        Buffer.alloc(0),
        origin,
      )
      return
    }

    const fetchRequest = toFetchRequest(request.raw, { origin })
    const response = await resolveRequest(fetchRequest, handlersController)

    if (!response) {
      return
    }

    reply.status(response.status)
    reply.headers(toReplyHeaders(response.headers))

    if (response.body) {
      return reply.send(Readable.fromWeb(response.body as NodeReadableStream))
    }

    return reply.send()
  }
}

function toReplyHeaders(
  headers: Headers,
): Record<string, string | Array<string>> {
  const replyHeaders: Record<string, string | Array<string>> = {}

  headers.forEach((value, name) => {
    replyHeaders[name] = value
  })

  const setCookie = headers.getSetCookie()

  if (setCookie.length > 0) {
    replyHeaders['set-cookie'] = setCookie
  }

  return replyHeaders
}
