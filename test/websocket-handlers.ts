import { ws } from 'msw'
import { graphql } from 'msw/graphql'

const chat = ws.link('/chat')
const api = graphql.link('/graphql')

/**
 * Handlers shared by the WebSocket tests of every server framework.
 */
export const webSocketHandlers = [
  chat.addEventListener('connection', ({ client }) => {
    client.addEventListener('message', (event) => {
      client.send(`echo:${event.data}`)
    })
  }),

  api.subscription('OnGreeting', ({ subscription }) => {
    subscription.publish({ data: { greeting: 'hello' } })
  }),
]
