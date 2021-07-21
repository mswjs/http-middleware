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
      url: new URL(req.url, serverOrigin),
      headers: new Headers(req.headers as HeadersInit),
      body: req.body,
    })

    /**
     * @note Prepend the server's origin to each relative request handler URL.
     *
     * Relative URL in request handlers are usually used in JSDOM where they are
     * rebased by MSW against the current "location" that JSDOM polyfills.
     * In Node.js, relative request URLs is no-op as there's nothing to be relative to.
     *
     * @fixme Mutating handlers is not okay.
     */
    handlers.forEach((handler) => {
      if ('mask' in handler.info) {
        const mask = handler.info.mask as string

        handler.info.mask = mask.startsWith('/')
          ? new URL(handler.info.mask, serverOrigin).toString()
          : mask
      }
    })

    await handleRequest(
      mockedRequest,
      handlers,
      {
        onUnhandledRequest: () => null,
      },
      emitter,
      {
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
