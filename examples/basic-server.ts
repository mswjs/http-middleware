import { createServer } from '@msw/serve'
import { handlers } from './mocks/index.ts'

const server = createServer(...handlers)

server.listen(9090, () => {
  console.log('Mock server ready at http://localhost:9090')
})
