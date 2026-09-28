import type {
  Request as ExpressRequest,
  RequestHandler as ExpressMiddleware,
} from 'express'
import type { RequestHandler } from 'msw'
import { resolveRequest } from './utils/resolve-request.js'
import { toFetchRequest } from './utils/to-fetch-request.js'
import { sendFetchResponse } from './utils/send-fetch-response.js'

/**
 * Create an Express middleware that resolves incoming
 * requests against the given request handlers.
 *
 * @example
 * app.use(createMiddleware(...handlers))
 */
export function createMiddleware(
  ...handlers: Array<RequestHandler>
): ExpressMiddleware {
  return async (req, res, next) => {
    const request = toFetchRequest(req, {
      origin: `${req.protocol}://${req.get('host')}`,
      body: getParsedBody(req),
    })

    try {
      const response = await resolveRequest(request, handlers)

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
