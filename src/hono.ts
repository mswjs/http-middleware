import { IncomingMessage, ServerResponse } from 'node:http'
import type { MiddlewareHandler } from 'hono'
import type { AnyHandler } from 'msw'
import { InMemoryHandlersController } from 'msw/experimental'
import { resolveRequest } from './utils/resolve-request.js'
import { createWebSocketMiddleware } from './utils/websocket-middleware.js'

/**
 * Create a Hono middleware that resolves incoming
 * requests (and WebSocket connections) against the given handlers.
 *
 * @note WebSocket connections are supported when running
 * on Node.js via `@hono/node-server`.
 *
 * @example
 * app.use(createMiddleware(...handlers))
 */
export function createMiddleware(
  ...handlers: Array<AnyHandler>
): MiddlewareHandler {
  const handlersController = new InMemoryHandlersController(handlers)
  const webSocketMiddleware = createWebSocketMiddleware(handlersController)

  return async (context, next) => {
    const bindings = getNodeBindings(context.env)

    if (webSocketMiddleware && bindings) {
      const origin = new URL(context.req.url).origin

      if (webSocketMiddleware.test(bindings.incoming, origin)) {
        webSocketMiddleware.upgrade(
          bindings.incoming,
          bindings.incoming.socket,
          Buffer.alloc(0),
          origin,
        )
        return createAlreadySentResponse()
      }
    }

    const response = await resolveRequest(context.req.raw, handlersController)

    if (response) {
      return response
    }

    await next()
  }
}

interface NodeBindings {
  incoming: IncomingMessage
  outgoing: ServerResponse
}

/**
 * Get the Node.js request/response pair that `@hono/node-server`
 * exposes on the context environment, if any.
 */
function getNodeBindings(env: unknown): NodeBindings | undefined {
  if (
    typeof env === 'object' &&
    env !== null &&
    'incoming' in env &&
    env.incoming instanceof IncomingMessage &&
    'outgoing' in env &&
    env.outgoing instanceof ServerResponse
  ) {
    return {
      incoming: env.incoming,
      outgoing: env.outgoing,
    }
  }

  return undefined
}

/**
 * Tell `@hono/node-server` that the response has already been
 * written to the socket (the WebSocket handshake did that).
 *
 * @see `RESPONSE_ALREADY_SENT` in `@hono/node-server/utils/response`
 *
 * @note `@hono/node-server` replaces the global `Response` with its own
 * subclass and takes a fast path for instances of it that skips the
 * "already sent" check, writing a second response over the handshake.
 * The marker must therefore be a native `Response`, found at the root
 * of the (possibly overridden) global class's prototype chain.
 */
function createAlreadySentResponse(): Response {
  const NativeResponse = getNativeResponseClass()

  return new NativeResponse(null, {
    headers: {
      'x-hono-already-sent': 'true',
    },
  })
}

function getNativeResponseClass(): typeof Response {
  let ResponseClass = Response

  while (Object.getPrototypeOf(ResponseClass) !== Function.prototype) {
    ResponseClass = Object.getPrototypeOf(ResponseClass)
  }

  return ResponseClass
}
