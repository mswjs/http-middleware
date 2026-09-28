/**
 * Open a WebSocket connection and resolve once it is open.
 */
export function connectWebSocket(
  url: URL,
  protocols?: Array<string>,
): Promise<WebSocket> {
  const socket = new WebSocket(toWebSocketUrl(url), protocols)

  return new Promise((resolve, reject) => {
    socket.addEventListener('open', () => resolve(socket), { once: true })
    socket.addEventListener(
      'error',
      () => reject(new Error(`Failed to connect to ${url.href}`)),
      { once: true },
    )
  })
}

export function waitForMessage(socket: WebSocket): Promise<string> {
  return new Promise((resolve) => {
    socket.addEventListener(
      'message',
      (event) => {
        resolve(String(event.data))
      },
      { once: true },
    )
  })
}

export function waitForClose(
  socket: WebSocket,
): Promise<{ code: number; reason: string }> {
  return new Promise((resolve) => {
    socket.addEventListener(
      'close',
      (event) => {
        resolve({ code: event.code, reason: event.reason })
      },
      { once: true },
    )
  })
}

export function toWebSocketUrl(url: URL): URL {
  const webSocketUrl = new URL(url)
  webSocketUrl.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return webSocketUrl
}
