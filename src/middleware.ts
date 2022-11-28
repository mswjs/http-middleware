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

    // Ensure the request body input passed to the MockedRequest
    // is always a string. Custom middleware like "express.json()"
    // may coerce "req.body" to be an Object.
    const requestBody =
      typeof req.body === 'string' ? req.body : JSON.stringify(req.body)

    const mockedRequest = new MockedRequest(
      // Treat all relative URLs as the ones coming from the server.
      new URL(req.url, serverOrigin),
      {
        method: req.method,
        headers: new Headers(req.headers as HeadersInit),
        credentials: 'omit',
        body: encodeBuffer(requestBody),
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
        onMockedResponse(mockedResponse) {
          const { status, statusText, headers, body, delay } = mockedResponse

          res.statusCode = status
          res.statusMessage = statusText

          headers.forEach((value, name) => {
            res.setHeader(name, value)
          })

          setTimeout(() => {
            res.send(body)
          }, delay || 0)
        },
        onPassthroughResponse() {
          next()
        },
      },
    )
  }
}
