import { Readable } from 'node:stream'
import type { ServerResponse } from 'node:http'
import type { ReadableStream as NodeReadableStream } from 'node:stream/web'

export function sendFetchResponse(
  response: Response,
  outgoing: ServerResponse,
): void {
  outgoing.statusCode = response.status
  outgoing.statusMessage = response.statusText

  response.headers.forEach((value, name) => {
    /**
     * @note Use `.appendHeader()` to support multi-value
     * response headers, like "Set-Cookie".
     */
    outgoing.appendHeader(name, value)
  })

  if (response.body) {
    Readable.fromWeb(response.body as NodeReadableStream).pipe(outgoing)
    return
  }

  outgoing.end()
}
