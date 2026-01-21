import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (user instanceof NextResponse) return user

    return NextResponse.json({
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
