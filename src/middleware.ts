import crypto from 'node:crypto'
import { Readable } from 'node:stream'
import type { ReadableStream as NodeReadableStream } from 'node:stream/web'
import type { RequestHandler as ExpressMiddleware } from 'express'
import {
  handleRequest,
  type LifeCycleEventsMap,
  type RequestHandler,
} from 'msw'
import { Emitter } from 'strict-event-emitter'

const emitter = new Emitter<LifeCycleEventsMap>()

export function createMiddleware(
  ...handlers: Array<RequestHandler>
): ExpressMiddleware {
  return async (request, response, next) => {
    const method = request.method || 'GET'
    const serverOrigin = `${request.protocol}://${request.get('host')}`
    const canRequestHaveBody = method !== 'HEAD' && method !== 'GET'

    const fetchRequest = new Request(
      // Treat all relative URLs as the ones coming from the server.
      new URL(request.url, serverOrigin),
      {
        method,
        headers: new Headers(request.headers as HeadersInit),
        credentials: 'omit',
        // @ts-ignore Internal Undici property.
        duplex: canRequestHaveBody ? 'half' : undefined,
        body: canRequestHaveBody
          ? request.readable
            ? (Readable.toWeb(request) as ReadableStream)
            : request.header('content-type')?.includes('json')
              ? JSON.stringify(request.body)
              : request.body
          : undefined,
      },
    )

    await handleRequest(
      fetchRequest,
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
          baseUrl: serverOrigin,
        },
        async onMockedResponse(mockedResponse) {
          const { status, statusText, headers } = mockedResponse

          response.statusCode = status
          response.statusMessage = statusText

          headers.forEach((value, name) => {
            /**
             * @note Use `.appendHeader()` to support multi-value
             * response headers, like "Set-Cookie".
             */
            response.appendHeader(name, value)
          })

          if (mockedResponse.body) {
            const stream = Readable.fromWeb(
              mockedResponse.body as NodeReadableStream,
            )
            stream.pipe(response)
          } else {
            response.end()
          }
        },
        onPassthroughResponse() {
          next()
        },
      },
    ).catch(next)
  }
}
