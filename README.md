# `@mswjs/http-middleware`

Run your [Mock Service Worker](https://github.com/mswjs/msw) mocks in a separate node server.

## When and why this may be helpful

msw itself provides an easy and convenient way (via a service worker) to run your mocks without any extra server process. This works great for 99% of cases when you want to test your web app in the browser.

However, there are a few possible cases where you *may* want to run your mocks via a separate server process (instead of via a service worker). For example: if you need to `curl` your mocks directly, when using [Cypress](https://www.cypress.io/) (and it's methods like `cy.intercept` which not always work seamlessly with service workers) for E2E testing, etc.

This library acts as an extension of msw for these cases - allowing you to re-use your same mock definitions in a totally different Node.js runtime environment.

## Getting started

```bash
npm install @mswjs/http-middleware
```

## API

### `createMiddleware(handlers: RequestHandler[])`

Creates a new Express middleware you can add to an existing Express server that will respond to any request that you have mocked in your mock handlers.

```ts
import { createMiddleware } from '@mswjs/http-middleware'
import handlers from './mocks'

const app = express()
// configure your server..

const mswMiddleware = createMiddleware(handlers)
app.use(mswMiddleware)
```

See [examples/custom-server.ts](examples/custom-server.ts) for more.

### `createServer(handlers: RequestHandler[])`

Creates a new Express middleware you can add to an existing Express server that will respond to any request that you have mocked in your mock handlers.

```ts
import { createServer } from '@mswjs/http-middleware'
import handlers from './mocks'

const server = createServer(handlers)
server.listen(9090, () => console.log('Mock server ready at http://localhost:9090'))
```

See [examples/basic-server.ts](examples/basic-server.ts) for more.
