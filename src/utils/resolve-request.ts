import { getResponse, isPassthroughResponse } from 'msw'
import type { HandlersController } from 'msw/experimental'

/**
 * Resolve the given Fetch API request against the request handlers.
 * Resolves with `undefined` if no handler produced a mocked response
 * or if the matching handler explicitly asked to pass the request through.
 */
export async function resolveRequest(
  request: Request,
  controller: HandlersController,
): Promise<Response | undefined> {
  const response = await getResponse(
    controller.getHandlersByKind('request'),
    request,
    {
      /**
       * @note Resolve relative request handler URLs against
       * the server's origin (no relative URLs in Node.js).
       */
      baseUrl: new URL(request.url).origin,
    },
  )

  if (response == null || isPassthroughResponse(response)) {
    return undefined
  }

  return response
}
