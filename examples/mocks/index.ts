import { http, HttpResponse } from 'msw'

interface LoginBody {
  username: string
}

interface LoginResponse {
  username: string
  firstName: string
}

export const handlers = [
  http.post<LoginBody, LoginResponse>('/login', async ({ request }) => {
    const user = await request.json()
    const { username } = user

    return HttpResponse.json({ username, firstName: 'John' })
  }),
  http.post('/logout', () => {
    return HttpResponse.json({ message: 'logged out' })
  }),
]
