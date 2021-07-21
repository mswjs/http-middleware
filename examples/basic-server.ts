import { createServer } from '../src'
import { handlers } from './mocks'

const server = createServer(...handlers)

server.listen(9090, () =>
  console.log('Mock server ready at http://localhost:9090'),
)
