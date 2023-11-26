# `@mswjs/http-middleware`

Spawn an [Express](https://expressjs.com) server from your [Mock Service Worker](https://github.com/mswjs/msw) request handlers or apply them to an existing server using a middleware.

## When to use this?

You should always prefer Mock Service Worker for API mocking because it can meet most of your requirements without having to spawn and maintain an actual HTTP server. Please refer to the [Getting started](https://mswjs.io/docs/getting-started) tutorial to integrate next-generation API mocking into your application.

There are, however, use cases when this extension can be applicable:

- If you wish to `curl` your mock definitions locally;
- When prototyping a Node.js backend implementation;
- When integrating API mocking in a complex application architecture (i.e. for dockerized applications).

## Getting started

### Install

```sh
$ npm install @mswjs/http-middleware
```

### Declare request handlers

```js
// src/mocks/handlers.js
import { http, graphql, HttpResponse } from 'msw'

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

### Integration

#### Option 1: Standalone server

```js
import { createServer } from '@mswjs/http-middleware'
import { handlers } from './handlers'

const httpServer = createServer(...handlers)

httpServer.listen(9090)
```

#### Option 2: Middleware

```js
import { createMiddleware } from '@mswjs/http-middleware'
import app from './app'
import { handlers } from './handlers'

app.use(createMiddleware(...handlers))
```

## API

### `createServer(...handlers: RequestHandler[])`

Establishes a standalone Express server that uses the given request handlers to process all incoming requests.

```ts
import { http, HttpResponse } from 'msw'
import { createServer } from '@mswjs/http-middleware'

const httpServer = createServer(
  http.get('/user', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
)

httpServer.listen(9090)
```

Making a `GET http://localhost:9090/user` request returns the following response:

```sh
200 OK
Content-Type: application/json

{
  "firstName": "John"
}
```

### `createMiddleware(...handlers: RequestHandler[])`

Creates an Express middleware function that uses the given request handlers to process all incoming requests.

```ts
import { http, HttpResponse } from 'msw'
import { createMiddleware } from '@mswjs/http-middleware'

const app = express()

app.use(
  createMiddleware(
    http.get('/user', () => {
      return HttpResponse.json({ firstName: 'John' })
    }),
  ),
)

app.use(9090)
```

## Mentions

- [David Idol](https://github.com/idolize), original implementation.
