import { Readable } from 'node:stream'
import type { ReadableStream as NodeReadableStream } from 'node:stream/web'
import type { onRequestAsyncHookHandler } from 'fastify'
import type { RequestHandler } from 'msw'
import { resolveRequest } from './utils/resolve-request.js'
import { toFetchRequest } from './utils/to-fetch-request.js'

/**
 * Create a Fastify `onRequest` hook that resolves incoming
 * requests against the given request handlers.
 *
 * @example
 * app.addHook('onRequest', createMiddleware(...handlers))
 */
export function createMiddleware(
  ...handlers: Array<RequestHandler>
): onRequestAsyncHookHandler {
  return async (request, reply) => {
    const fetchRequest = toFetchRequest(request.raw, {
      origin: `${request.protocol}://${request.host}`,
    })

    const response = await resolveRequest(fetchRequest, handlers)

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
