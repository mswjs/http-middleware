import http from 'node:http'
import type { RequestHandler } from 'msw'
import { resolveRequest } from './utils/resolve-request.js'
import { toFetchRequest } from './utils/to-fetch-request.js'
import { sendFetchResponse } from './utils/send-fetch-response.js'

/**
 * Create a standalone HTTP server that resolves all incoming
 * requests against the given request handlers. Requests that
 * match no handler receive a 404 response.
 *
 * @example
 * const server = createServer(...handlers)
 * server.listen(9090)
 */
export function createServer(...handlers: Array<RequestHandler>): http.Server {
  return http.createServer(async (incoming, outgoing) => {
    const request = toFetchRequest(incoming, {
      origin: `http://${incoming.headers.host}`,
    })

    try {
      const response = await resolveRequest(request, handlers)

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
}
