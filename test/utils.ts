import http from 'node:http'
import type { RequestListener } from 'node:http'

export interface TestServer extends AsyncDisposable {
  url(pathname?: string): URL
  close(): Promise<void>
}

/**
 * Spawn a disposable HTTP server for the given request listener
 * (e.g. an Express app) on a random port.
 */
export async function createTestServer(
  listener: RequestListener,
): Promise<TestServer> {
  const server = http.createServer(listener)

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })

  const address = server.address()

  if (address == null || typeof address === 'string') {
    throw new Error('Failed to get the test server address')
  }

  const baseUrl = new URL(`http://${address.address}:${address.port}`)

  const close = async () => {
    server.closeAllConnections()

    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }

        resolve()
      })
    })
  }

  return {
    url(pathname = '/') {
      return new URL(pathname, baseUrl)
    },
    close,
    async [Symbol.asyncDispose]() {
      await close()
    },
  }
}
