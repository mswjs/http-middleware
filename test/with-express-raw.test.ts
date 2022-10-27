/**
 * @jest-environment node
 */
import { Server } from 'http'
import { AddressInfo } from 'net'
import { promisify } from 'util'
import fetch from 'node-fetch'
import express, { Express } from 'express'
import { RequestHandler, rest } from 'msw'
import { createMiddleware } from '../src'
import { ServerApi } from '@open-draft/test-server'

// we don't need SSL for this test
let server: Omit<ServerApi, 'https'>

const handlers: RequestHandler[] = [
  rest.post('/user', async (req, res, ctx) => {
    const { firstName } = await req.json()
    return res(ctx.set('x-my-header', 'value'), ctx.json({ firstName }))
  }),
]

beforeAll(async () => {
  server = await createServer((app) => {
    app
      .use(express.raw({ type: () => true }))
      .use(createMiddleware(...handlers))
  })
})

afterAll(async () => {
  await server.close()
})

it('supports usage alongside with the "express.raw()" middleware', async () => {
  const res = await fetch(server.http.makeUrl('/user'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ firstName: 'John' }),
  })

  expect(res.status).toBe(200)
  expect(res.headers.get('x-my-header')).toBe('value')
  expect(await res.json()).toEqual({ firstName: 'John' })
})

/**
 * The test server created by @open-draft/test-server automatically
 * applies the `bodyParser.json()` middleware. There is no way to disable it.
 *
 * This test specifically requires that we not use json-parsing middleware.
 *
 * This mock provides similar functionality/API to @open-draft/test-server,
 * but without applying `bodyParser.json()`
 */
async function createServer(middleware?: (app: Express) => void) {
  const app = express()
  if (middleware) {
    middleware(app)
  }

  const httpListener = await new Promise<Server>((resolve, reject) => {
    try {
      const listener: Server = app.listen(
        // use any port available on localhost
        { host: '127.0.0.1', port: undefined },
        () => resolve(listener),
      )
    } catch (error) {
      reject(error)
    }
  })

  return {
    http: createTestServer(httpListener),
    close: promisify(
      httpListener.close.bind(httpListener),
    ) as () => Promise<void>,
  }
}

function createTestServer(
  httpListener: Server,
  protocol = 'http:',
): ServerApi['http'] {
  // determine the dynamically selected port
  const { port, address: host } = httpListener.address() as AddressInfo
  const address = { protocol, host, port }
  const serverUrl = new URL(`${protocol}//${host}:${port}`).href

  return {
    getAddress: () => address,
    makeUrl: (path = '/') => new URL(path, serverUrl).href,
  }
}
