import { Headers, flattenHeadersList, headersToList } from 'headers-utils'
import { RequestHandler, MockedRequest } from 'msw'
import { RequestHandler as ExpressMiddleware } from 'express'
import { getResponse } from './mswGetResponse'

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve()
    }, ms)
  })

export function createMiddleware(handlers: RequestHandler[]) {
  const mswMiddleware: ExpressMiddleware = async (req, res, next) => {
    const headers = new Headers()
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      headers.set(req.rawHeaders[i], req.rawHeaders[i + 1])
    }
    const mockedReq: MockedRequest = {
      id: Math.random().toString(36).substr(2, 9),
      url: new URL(req.originalUrl, req.protocol + '://' + req.get('host')),
      method: req.method.toUpperCase(),
      headers,
      cookies: req.cookies, // Only works if cookie-parser middleware is present
      mode: 'same-origin',
      keepalive: false,
      cache: 'default',
      destination: '',
      integrity: '',
      credentials: 'same-origin',
      redirect: 'follow',
      referrer: req.header('referer') || '',
      referrerPolicy: '',
      body: req.body,
      bodyUsed: !!req.body,
    }
    const { handler, response } = await getResponse(mockedReq, handlers)
    if (handler && response) {
      // MSW Matched Request
      res.status(response.status)
      flattenHeadersList(headersToList(response.headers)).forEach(
        ([key, value]) => {
          res.setHeader(key, value)
        },
      )
      if (response.delay) {
        await delay(response.delay)
      }
      res.send(response.body)
    } else {
      // No MSW match - move along
      next()
    }
  }
  return mswMiddleware
}
