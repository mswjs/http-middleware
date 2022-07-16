import { StrictEventEmitter } from 'strict-event-emitter'
import { Headers } from 'headers-polyfill'
import { RequestHandler as ExpressMiddleware } from 'express'
import { RequestHandler, handleRequest, MockedRequest } from 'msw'
import { encodeBuffer } from '@mswjs/interceptors'

const emitter = new StrictEventEmitter()

export function createMiddleware(
  ...handlers: RequestHandler[]
): ExpressMiddleware {
  return async (req, res, next) => {
    const serverOrigin = `${req.protocol}://${req.get('host')}`

    const mockedRequest = new MockedRequest(
      // Treat all relative URLs as the ones coming from the server.
      new URL(req.url, serverOrigin),
      {
        method: req.method,
        headers: new Headers(req.headers as HeadersInit),
        credentials: 'omit',
        body: encodeBuffer(req.body),
      },
    )

    await handleRequest(
      mockedRequest,
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
        onMockedResponseSent(mockedResponse) {
          const { status, statusText, headers, body } = mockedResponse

          res.statusCode = status
          res.statusMessage = statusText

          headers.forEach((value, name) => {
            res.setHeader(name, value)
          })

          res.send(body)
        },
        onPassthroughResponse() {
          next()
        },
      },
    )
  }
}
