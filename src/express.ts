import type {
  Request as ExpressRequest,
  RequestHandler as ExpressMiddleware,
} from 'express'
import type { AnyHandler } from 'msw'
import { InMemoryHandlersController } from 'msw/experimental'
import { resolveRequest } from './utils/resolve-request.js'
import { toFetchRequest } from './utils/to-fetch-request.js'
import { sendFetchResponse } from './utils/send-fetch-response.js'
import { createWebSocketMiddleware } from './utils/websocket-middleware.js'

/**
 * Create an Express middleware that resolves incoming
 * requests (and WebSocket connections) against the given handlers.
 *
 * @example
 * app.use(createMiddleware(...handlers))
 */
export function createMiddleware(
  ...handlers: Array<AnyHandler>
): ExpressMiddleware {
  const handlersController = new InMemoryHandlersController(handlers)
  const webSocketMiddleware = createWebSocketMiddleware(handlersController)

  return async (req, res, next) => {
    const origin = `${req.protocol}://${req.get('host')}`

    if (webSocketMiddleware?.test(req, origin)) {
      webSocketMiddleware.upgrade(req, req.socket, Buffer.alloc(0), origin)
      return
    }

    const request = toFetchRequest(req, {
      origin,
      body: getParsedBody(req),
    })

    try {
      const response = await resolveRequest(request, handlersController)

      if (!response) {
        next()
        return
      }

      sendFetchResponse(response, res)
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Get the request body parsed by a preceding body parser
 * (e.g. `express.json()`), if any.
 */
function getParsedBody(req: ExpressRequest): BodyInit | undefined {
  if (req.readable || req.body == null) {
    return undefined
  }

  if (req.get('content-type')?.includes('json')) {
    return JSON.stringify(req.body)
  }

  return req.body
}
