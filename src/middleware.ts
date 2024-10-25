import crypto from 'node:crypto'
import { Readable } from 'node:stream'
import { handleRequest } from 'msw'
import { Emitter } from 'strict-event-emitter'

import type { ReadableStream as NodeReadableStream } from 'node:stream/web'
import type { RequestHandler as ExpressMiddleware } from 'express'
import type { LifeCycleEventsMap, RequestHandler } from 'msw'

const emitter = new Emitter<LifeCycleEventsMap>()

export function createMiddleware(
  ...handlers: Array<RequestHandler>
): ExpressMiddleware {
  return async (req, res, next) => {
    const method = req.method || 'GET'
    const serverOrigin = `${req.protocol}://${req.get('host')}`
    const canRequestHaveBody = method !== 'HEAD' && method !== 'GET'

    const fetchRequest = new Request(
      // Treat all relative URLs as the ones coming from the server.
      new URL(req.url, serverOrigin),
      {
        method,
        headers: new Headers(req.headers as HeadersInit),
        credentials: 'omit',
        // @ts-ignore Internal Undici property.
        duplex: canRequestHaveBody ? 'half' : undefined,
        body: canRequestHaveBody
          ? req.readable
            ? (Readable.toWeb(req) as ReadableStream)
            : req.header('content-type')?.includes('json')
              ? JSON.stringify(req.body)
              : req.body
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

          res.statusCode = status
          res.statusMessage = statusText

          headers.forEach((value, name) => {
            /**
             * @note Use `.appendHeader()` to support multi-value
             * response headers, like "Set-Cookie".
             */
            res.appendHeader(name, value)
          })

          if (mockedResponse.body) {
            const stream = Readable.fromWeb(
              mockedResponse.body as NodeReadableStream,
            )
            stream.pipe(res)
          } else {
            res.end()
          }
        },
        onPassthroughResponse() {
          next()
        },
      },
    ).catch(next)
  }
}
