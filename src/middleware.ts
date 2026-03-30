import { NextRequest, NextResponse } from 'next/server'

export const config = {
  matcher: ['/((?!_next/).*)'],
}

const isPublicWebMode = process.env.NEXT_PUBLIC_WEB_MODE

const VALID_USERS: [string, string][] = [
  ['innerith', 'Manzana_4'], 
  
]

export default function middleware(req: NextRequest) {
  if (isPublicWebMode === 'true') return NextResponse.next()

  const basicAuth = req.headers.get('authorization')

  if (basicAuth) {
    try {
      const authValue = basicAuth.split(' ')[1]
      const [user, pwd] = atob(authValue).split(':')
      const isValid = VALID_USERS.some(([u, p]) => u === user && p === pwd)
      if (isValid) {
        return NextResponse.next()
      }
    } catch (e) {
      console.error('Error parsing auth header:', e)
    }
  }

  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  })
}
