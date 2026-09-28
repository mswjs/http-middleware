import { Readable } from 'node:stream'
import type { IncomingMessage } from 'node:http'

interface FetchRequestOptions {
  origin: string
  body?: BodyInit
}

export function toFetchRequest(
  incoming: IncomingMessage,
  options: FetchRequestOptions,
): Request {
  const method = incoming.method || 'GET'
  const canRequestHaveBody = method !== 'HEAD' && method !== 'GET'

  return new Request(
    // Treat all relative URLs as the ones coming from the server.
    new URL(incoming.url || '/', options.origin),
    {
      method,
      headers: toHeaders(incoming),
      credentials: 'omit',
      // @ts-expect-error Node.js-specific option required for stream bodies.
      duplex: canRequestHaveBody ? 'half' : undefined,
      body: canRequestHaveBody
        ? getRequestBody(incoming, options.body)
        : undefined,
    },
  )
}

function toHeaders(incoming: IncomingMessage): Headers {
  const headers = new Headers()

  for (const [name, values] of Object.entries(incoming.headersDistinct)) {
    for (const value of values || []) {
      headers.append(name, value)
    }
  }

  return headers
}

function getRequestBody(
  incoming: IncomingMessage,
  parsedBody?: BodyInit,
): BodyInit | undefined {
  if (incoming.readable) {
    return Readable.toWeb(incoming) as ReadableStream
  }

  return parsedBody
}
