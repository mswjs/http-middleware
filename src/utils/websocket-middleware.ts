import { IncomingMessage } from 'node:http'
import { WebSocketServer } from 'ws'
import type { RawData, WebSocket as ServerWebSocket } from 'ws'
import type { Duplex } from 'node:stream'
import type { AnyHandler } from 'msw'
import type { HandlersController } from 'msw/experimental'

type WebSocketHandlerLike = Extract<AnyHandler, { kind: 'websocket' }>
type WebSocketConnection = Parameters<WebSocketHandlerLike['run']>[0]
type WebSocketClientHandle = WebSocketConnection['client']
type WebSocketServerHandle = WebSocketConnection['server']
type WebSocketData = Parameters<WebSocketClientHandle['send']>[0]

export interface WebSocketMiddleware {
  /**
   * Whether the incoming request is a WebSocket upgrade
   * request that matches any of the WebSocket handlers.
   */
  test(request: IncomingMessage, origin: string): boolean
  /**
   * Complete the WebSocket handshake and route
   * the connection through the WebSocket handlers.
   */
  upgrade(
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer,
    origin: string,
  ): void
}

/**
 * Create a middleware that routes WebSocket connections through
 * the WebSocket handlers of the given controller (including the
 * hidden ones, like the GraphQL subscription transport).
 * Returns `undefined` if there are no WebSocket handlers.
 */
export function createWebSocketMiddleware(
  controller: HandlersController,
): WebSocketMiddleware | undefined {
  const handlers = controller.getHandlersByKind('websocket')

  if (handlers.length === 0) {
    return undefined
  }

  const webSocketServer = new WebSocketServer({ noServer: true })

  return {
    test(request, origin) {
      if (request.headers.upgrade?.toLowerCase() !== 'websocket') {
        return false
      }

      const url = getWebSocketUrl(request, origin)

      return handlers.some((handler) => {
        return handler.test(url, { baseUrl: origin })
      })
    },
    upgrade(request, socket, head, origin) {
      webSocketServer.handleUpgrade(request, socket, head, (webSocket) => {
        handleConnection(webSocket, request, origin, handlers).catch(
          (error: unknown) => {
            console.error(error)
            webSocket.close(1011, 'Unhandled exception in a WebSocket handler')
          },
        )
      })
    },
  }
}

async function handleConnection(
  webSocket: ServerWebSocket,
  request: IncomingMessage,
  origin: string,
  handlers: Array<WebSocketHandlerLike>,
): Promise<void> {
  const connection: WebSocketConnection = {
    client: new WebSocketClient(webSocket, getWebSocketUrl(request, origin)),
    server: new UnsupportedWebSocketServer(),
    info: {
      protocols: getRequestedProtocols(request),
    },
  }

  let isHandled = false

  for (const handler of handlers) {
    const resolvedConnection = await handler.run(connection, {
      baseUrl: origin,
    })

    if (resolvedConnection) {
      isHandled = true
    }
  }

  if (!isHandled) {
    webSocket.close(1008, 'No matching WebSocket handler')
  }
}

function getWebSocketUrl(request: IncomingMessage, origin: string): URL {
  const url = new URL(request.url || '/', origin)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url
}

function getRequestedProtocols(
  request: IncomingMessage,
): Array<string> | undefined {
  const header = request.headers['sec-websocket-protocol']

  if (!header) {
    return undefined
  }

  return header.split(',').map((protocol) => {
    return protocol.trim()
  })
}

/**
 * The client side of an intercepted connection, as seen by the handlers.
 * Bridges the handler API to the actual `ws` socket of the connected client.
 */
class WebSocketClient implements WebSocketClientHandle {
  readonly id = crypto.randomUUID()
  readonly url: URL

  #socket: ServerWebSocket
  #events = new EventTarget()

  constructor(socket: ServerWebSocket, url: URL) {
    this.url = url
    this.#socket = socket

    socket.on('message', (data, isBinary) => {
      this.#events.dispatchEvent(
        new MessageEvent('message', {
          data: toWebSocketData(data, isBinary),
          cancelable: true,
        }),
      )
    })

    socket.on('close', (code, reason) => {
      this.#events.dispatchEvent(
        new CloseEvent('close', {
          code,
          reason: reason.toString(),
          wasClean: code === 1000,
        }),
      )
    })
  }

  send(data: WebSocketData): void {
    if (data instanceof Blob) {
      data.arrayBuffer().then((buffer) => {
        this.#socket.send(buffer)
      })
      return
    }

    this.#socket.send(data)
  }

  close(code?: number, reason?: string): void {
    this.#socket.close(code, reason)
  }

  /**
   * @note `EventTarget` dispatches plain `Event` instances while the
   * handle listeners are typed per event. The cast is the bridge.
   */
  addEventListener: WebSocketClientHandle['addEventListener'] = (
    type,
    listener,
    options,
  ) => {
    this.#events.addEventListener(type, listener as EventListener, options)
  }

  removeEventListener: WebSocketClientHandle['removeEventListener'] = (
    type,
    listener,
    options,
  ) => {
    this.#events.removeEventListener(type, listener as EventListener, options)
  }
}

/**
 * The "original server" side of an intercepted connection.
 * The middleware is the server, so there is nothing to connect to.
 */
class UnsupportedWebSocketServer implements WebSocketServerHandle {
  #events = new EventTarget()

  connect(): void {
    throw new Error(
      'Failed to call "server.connect()": there is no original WebSocket server to connect to in "@mswjs/http-middleware".',
    )
  }

  send(): void {
    throw new Error(
      'Failed to call "server.send()": there is no original WebSocket server in "@mswjs/http-middleware".',
    )
  }

  close(): void {
    throw new Error(
      'Failed to call "server.close()": there is no original WebSocket server in "@mswjs/http-middleware".',
    )
  }

  addEventListener: WebSocketServerHandle['addEventListener'] = (
    type,
    listener,
    options,
  ) => {
    this.#events.addEventListener(type, listener as EventListener, options)
  }

  removeEventListener: WebSocketServerHandle['removeEventListener'] = (
    type,
    listener,
    options,
  ) => {
    this.#events.removeEventListener(type, listener as EventListener, options)
  }
}

/**
 * @note Node.js 22 has no global `CloseEvent`.
 */
class CloseEvent extends Event {
  readonly code: number
  readonly reason: string
  readonly wasClean: boolean

  constructor(
    type: string,
    init: EventInit & { code: number; reason: string; wasClean: boolean },
  ) {
    super(type, init)
    this.code = init.code
    this.reason = init.reason
    this.wasClean = init.wasClean
  }
}

function toWebSocketData(data: RawData, isBinary: boolean): WebSocketData {
  const buffer = Array.isArray(data)
    ? Buffer.concat(data)
    : data instanceof ArrayBuffer
      ? Buffer.from(data)
      : data

  if (!isBinary) {
    return buffer.toString()
  }

  // Copy into a standalone `ArrayBuffer` (never a shared or pooled one).
  return Uint8Array.from(buffer).buffer
}
