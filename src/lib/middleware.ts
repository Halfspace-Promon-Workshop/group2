import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from './auth'

export async function requireAuth(request: NextRequest) {
  const token = request.cookies.get('session')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await getCurrentUser(token)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return user
}

export function getUserId(request: NextRequest): string | null {
  const token = request.cookies.get('session')?.value
  if (!token) return null

  // We'll verify in the route handler
  return null
}
