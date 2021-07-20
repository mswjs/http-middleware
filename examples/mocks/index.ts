import { rest } from 'msw'

interface LoginBody {
  username: string
}
interface LoginResponse {
  username: string
  firstName: string
}

// Currently there is a limitation with msw when running outside of the browser
// that requires all "rest" mocks to also specify the origin or they will fail to match.
// Note this is not an issue with "graphql" mocks.
const origin = 'http://localhost:9090'

const loginMock = rest.post<LoginBody, LoginResponse>(
  `${origin}/login`,
  (req, res, ctx) => {
    const { username } = req.body
    return res(
      ctx.json({
        username,
        firstName: 'John',
      }),
    )
  },
)

const logoutMock = rest.post(`${origin}/logout`, (_req, res, ctx) => {
  return res(ctx.json({ message: 'logged out' }))
})

const handlers = [loginMock, logoutMock]
export default handlers
