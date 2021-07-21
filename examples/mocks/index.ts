import { rest } from 'msw'

interface LoginBody {
  username: string
}

interface LoginResponse {
  username: string
  firstName: string
}

export const handlers = [
  rest.post<LoginBody, LoginResponse>('/login', (req, res, ctx) => {
    const { username } = req.body
    return res(
      ctx.json({
        username,
        firstName: 'John',
      }),
    )
  }),
  rest.post('/logout', (_req, res, ctx) => {
    return res(ctx.json({ message: 'logged out' }))
  }),
]
