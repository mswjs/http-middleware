<p align="center">
  <img src="media/serve-logo.svg" width="100" alt="The Serve library logo" />
</p>

<h1 align="center"><code>@msw/serve</code></h1>

Spawn a standalone HTTP server from your [Mock Service Worker](https://github.com/mswjs/msw) handlers, or apply them as middleware to an existing [Express](https://expressjs.com), [Hono](https://hono.dev), or [Fastify](https://fastify.dev) servers.

## When to use this?

You should always prefer Mock Service Worker for API mocking because it can meet most of your requirements without having to spawn and maintain an actual HTTP server. Please refer to the [Getting started](https://mswjs.io/docs/quick-start) tutorial to integrate next-generation API mocking into your application.

There are, however, use cases when this extension can be applicable:

- If you wish to `curl` your mock definitions locally;
- When prototyping a Node.js backend implementation;
- When integrating API mocking in a complex application architecture (i.e. for dockerized applications).

## Documentation

Read the [documentation](https://mswjs.io/ecosystem/serve).

## Mentions

- [David Idol](https://github.com/idolize), original implementation.
