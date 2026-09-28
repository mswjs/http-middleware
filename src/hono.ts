import type { MiddlewareHandler } from 'hono'
import type { RequestHandler } from 'msw'
import { resolveRequest } from './utils/resolve-request.js'

/**
 * Create a Hono middleware that resolves incoming
 * requests against the given request handlers.
 *
 * @example
 * app.use(createMiddleware(...handlers))
 */
export function createMiddleware(
  ...handlers: Array<RequestHandler>
): MiddlewareHandler {
  return async (context, next) => {
    const response = await resolveRequest(context.req.raw, handlers)

    if (response) {
      return response
    }

    await next()
  }
}
