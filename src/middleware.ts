import { Readable } from 'node:stream'
import crypto from 'node:crypto'
import { ReadableStream } from 'node:stream/web'
import { handleRequest } from 'msw'
import { Emitter } from 'strict-event-emitter'

import type { RequestHandler as ExpressMiddleware } from 'express'
import type { LifeCycleEventsMap, RequestHandler } from 'msw'

const emitter = new Emitter<LifeCycleEventsMap>()

export function createMiddleware(
  ...handlers: Array<RequestHandler>
): ExpressMiddleware {
  return async (req, res, next) => {
    const serverOrigin = `${req.protocol}://${req.get('host')}`
    const method = req.method || 'GET'

    // Ensure the request body input passed to the MockedRequest
    // is always the raw body from express req.
    // "express.raw({ type: '*/*' })" must be used to get "req.body".

    const mockedRequest = new Request(
      // Treat all relative URLs as the ones coming from the server.
      new URL(req.url, serverOrigin),
      {
        method: req.method,
        headers: new Headers(req.headers as HeadersInit),
        credentials: 'omit',
        // Request with GET/HEAD method cannot have body.
        body: ['GET', 'HEAD'].includes(method) ? undefined : req.body,
      },
    )

    await handleRequest(
      mockedRequest,
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
        onMockedResponse: async (mockedResponse) => {
          const { status, statusText, headers } = mockedResponse

          res.statusCode = status
          res.statusMessage = statusText

          headers.forEach((value, name) => {
            res.setHeader(name, value)
          })

          if (mockedResponse.body) {
            const stream = Readable.fromWeb(
              mockedResponse.body as ReadableStream,
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
    )
  }
}
