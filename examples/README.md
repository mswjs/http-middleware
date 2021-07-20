# Usage examples

Collection of usage examples of [Mock Service Worker](https://github.com/mswjs/msw) HTTP middleware library.

### Basic Server Example

Sets up a basic Express server that only handles mocked API requests.

How to run:

```bash
# From the root directory
yarn example:basic
```

Then you can POST to `/login` or `/logout` using curl or Postman.

### Custom Middleware Example

Adds the mocks middleware to an existing Express server that also serves static files.

How to run:

```bash
# From the root directory
yarn example:custom
```

Then you can open your browser to [http://localhost:9090](http://localhost:9090) to try logging in or out.
