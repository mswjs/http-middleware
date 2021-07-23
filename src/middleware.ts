import { EventEmitter } from 'events'
import { Headers } from 'headers-utils'
import { RequestHandler as ExpressMiddleware } from 'express'
import {
  RequestHandler,
  handleRequest,
  parseIsomorphicRequest,
  RestHandler,
} from 'msw'
import { Mask } from 'msw/lib/types/setupWorker/glossary'

const emitter = new EventEmitter()

export function createMiddleware(
  ...handlers: RequestHandler[]
): ExpressMiddleware {
  // This will get overwritten on a per-request basis
  let getServerRelativeMask = (mask: Mask) => mask

  /**
   * @note Prepend the server's origin to each relative request handler URL.
   *
   * Relative URL in request handlers are usually used in JSDOM where they are
   * rebased by MSW against the current "location" that JSDOM polyfills.
   * In Node.js, relative request URLs is no-op as there's nothing to be relative to.
   */
  const serverRelativeHandlers = handlers.map((handler) => {
    if ('mask' in handler.info) {
      return new Proxy(handler as RestHandler, {
        get(target: RestHandler, prop: keyof RestHandler) {
          if (prop === 'info') {
            const { info } = target
            return {
              ...info,
              get mask() {
                return getServerRelativeMask(info.mask)
              },
            }
          }
          return target[prop]
        },
      })
    }
    return handler
  })

  return async (req, res, next) => {
    const serverOrigin = `${req.protocol}://${req.get('host')}`
    const mockedRequest = parseIsomorphicRequest({
      id: '',
      method: req.method,
      url: new URL(req.url, serverOrigin),
      headers: new Headers(req.headers as HeadersInit),
      body: req.body,
    })

    getServerRelativeMask = (mask) => {
      if (mask instanceof RegExp) {
        // TODO merge the regex somehow? maybe it doesn't matter?
        return mask
      }
      return mask.startsWith('/')
        ? new URL(mask, serverOrigin).toString()
        : mask
    }

    await handleRequest(
      mockedRequest,
      serverRelativeHandlers,
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
