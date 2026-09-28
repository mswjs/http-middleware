import { handleRequest } from 'msw'
import { Emitter } from 'strict-event-emitter'
import type { LifeCycleEventsMap, RequestHandler } from 'msw'

const emitter = new Emitter<LifeCycleEventsMap>()

/**
 * Resolve the given Fetch API request against the request handlers.
 * Resolves with `undefined` if no handler produced a mocked response.
 */
export function resolveRequest(
  request: Request,
  handlers: Array<RequestHandler>,
): Promise<Response | undefined> {
  return handleRequest(
    request,
    crypto.randomUUID(),
    handlers,
    {
      onUnhandledRequest: () => null,
    },
    emitter,
    {
      resolutionContext: {
        /**
         * @note Resolve relative request handler URLs against
         * the server's origin (no relative URLs in Node.js).
         */
        baseUrl: new URL(request.url).origin,
      },
    },
  )
}
