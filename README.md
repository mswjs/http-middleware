# `@msw/serve`

Spawn a standalone HTTP server from your [Mock Service Worker](https://github.com/mswjs/msw) handlers, or apply them as middleware to an existing [Express](https://expressjs.com), [Hono](https://hono.dev), or [Fastify](https://fastify.dev) server.

## When to use this?

You should always prefer Mock Service Worker for API mocking because it can meet most of your requirements without having to spawn and maintain an actual HTTP server. Please refer to the [Getting started](https://mswjs.io/docs/getting-started) tutorial to integrate next-generation API mocking into your application.

There are, however, use cases when this extension can be applicable:

- If you wish to `curl` your mock definitions locally;
- When prototyping a Node.js backend implementation;
- When integrating API mocking in a complex application architecture (i.e. for dockerized applications).

## Getting started

### Install

```sh
$ npm i @msw/serve
```

### Describe the network

Next, describe the network you want using MSW handlers.

```js
// src/mocks/handlers.js
import { http, HttpResponse } from 'msw/http'
import { graphql } from 'msw/graphql'

export const handlers = [
  http.post('/user', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
  graphql.query('GetUser', () => {
    return HttpResponse.json({
      data: {
        user: {
          firstName: 'John',
        },
      },
    })
  }),
]
```

> Learn more about writing [request handlers](https://mswjs.io/docs/concepts/request-handler).

### Usage

#### Standalone server

```js
import { createServer } from '@msw/serve'
import { handlers } from './handlers'

const server = createServer(...handlers)

server.listen(9090)
```

#### Middleware

This package exposes a middleware for each supported server framework via a dedicated export path:

| Framework                        | Import path                      |
| -------------------------------- | -------------------------------- |
| [Express](https://expressjs.com) | `@msw/serve/express` |
| [Hono](https://hono.dev)         | `@msw/serve/hono`    |
| [Fastify](https://fastify.dev)   | `@msw/serve/fastify` |

The framework itself is an optional peer dependency. Install the one you use.

#### Express

```js
import express from 'express'
import { createMiddleware } from '@msw/serve/express'
import { handlers } from './handlers'

const app = express()

app.use(createMiddleware(...handlers))
app.listen(9090)
```

#### Hono

```js
import { Hono } from 'hono'
import { createMiddleware } from '@msw/serve/hono'
import { handlers } from './handlers'

const app = new Hono()

app.use(createMiddleware(...handlers))
```

#### Fastify

```js
import fastify from 'fastify'
import { createMiddleware } from '@msw/serve/fastify'
import { handlers } from './handlers'

const app = fastify()

app.addHook('onRequest', createMiddleware(...handlers))
await app.listen({ port: 9090 })
```

### WebSocket handlers

Every entry point also accepts [WebSocket handlers](https://mswjs.io/docs/websocket) (`ws.link()`) and GraphQL subscription handlers (`graphql.link().subscription()`). When any are present, the middleware upgrades matching WebSocket connections using the [`ws`](https://github.com/websockets/ws) package and routes them through your handlers. Nothing else to configure.

```js
import { ws } from 'msw'
import { createMiddleware } from '@msw/serve/express'

const chat = ws.link('/chat')

app.use(
  createMiddleware(
    chat.addEventListener('connection', ({ client }) => {
      client.addEventListener('message', (event) => {
        client.send(`Hello, ${event.data}!`)
      })
    }),
  ),
)
```

- Upgrade requests whose URL matches no WebSocket handler are passed through to the rest of your application.
- The middleware _is_ the server, so `server.connect()` (forwarding to the original server) is not supported and throws.
- Hono: WebSocket support requires running on Node.js via `@hono/node-server`.

## API

### `createMiddleware(...handlers: RequestHandler[])`

Available from every export path. Creates a framework-specific middleware that resolves incoming requests against the given request handlers. Requests that match no handler are passed through to the rest of your application.

```ts
import { http, HttpResponse } from 'msw'
import { createMiddleware } from '@msw/serve/express'

app.use(
  createMiddleware(
    http.get('/user', () => {
      return HttpResponse.json({ firstName: 'John' })
    }),
  ),
)
```

Making a `GET /user` request returns the following response:

```sh
200 OK
Content-Type: application/json

{
  "firstName": "John"
}
```

- Express: `app.use(createMiddleware(...handlers))`
- Hono: `app.use(createMiddleware(...handlers))`
- Fastify: `app.addHook('onRequest', createMiddleware(...handlers))`

### `createServer(...handlers: RequestHandler[])`

Available from the package root. Creates a standalone Node.js [`http.Server`](https://nodejs.org/api/http.html#class-httpserver) that resolves all incoming requests against the given request handlers and responds with `404` to everything else. No server framework required.

```ts
import { http, HttpResponse } from 'msw'
import { createServer } from '@msw/serve'

const server = createServer(
  http.get('/user', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
)

server.listen(9090)
```

## Mentions

- [David Idol](https://github.com/idolize), original implementation.
