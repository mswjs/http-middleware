import {
  HttpServer,
  type HttpServerMiddleware,
} from '@open-draft/test-server/lib/http'

interface DispoableHttpServer extends HttpServer {
  [Symbol.asyncDispose](): Promise<void>
}

export async function createTestHttpServer(
  middleware?: HttpServerMiddleware,
): Promise<DispoableHttpServer> {
  const server = new HttpServer(middleware)
  await server.listen()

  Object.defineProperty(server, Symbol.asyncDispose, {
    async value() {
      await server.close()
    },
  })

  return server as DispoableHttpServer
}
