import { EventEmitter } from 'events'
import { Headers } from 'headers-utils'
import { RequestHandler as ExpressMiddleware } from 'express'
import { RequestHandler, handleRequest, parseIsomorphicRequest } from 'msw'

const emitter = new EventEmitter()

export function createMiddleware(
  ...handlers: RequestHandler[]
): ExpressMiddleware {
  return async (req, res, next) => {
    const serverOrigin = `${req.protocol}://${req.get('host')}`
    const mockedRequest = parseIsomorphicRequest({
      id: '',
      method: req.method,
      // Treat all relative URLs as the ones coming from the server.
      url: new URL(req.url, serverOrigin),
      headers: new Headers(req.headers as HeadersInit),
      body: req.body,
    })

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
        onBypassResponse() {
          next()
        },
      },
    )
  }
}
