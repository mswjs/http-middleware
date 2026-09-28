import type { RequestHandler } from 'msw'
import { getResponse } from 'msw/utils/get-response'
import { isPassthroughResponse } from 'msw/utils/passthrough'

export async function resolveRequest(
  request: Request,
  handlers: Array<RequestHandler>,
): Promise<Response | undefined> {
  const response = await getResponse(handlers, request, {
    /**
     * @note Resolve relative request handler URLs against
     * the server's origin (no relative URLs in Node.js).
     */
    baseUrl: new URL(request.url).origin,
  })

  if (response == null || isPassthroughResponse(response)) {
    return undefined
  }

  return response
}
