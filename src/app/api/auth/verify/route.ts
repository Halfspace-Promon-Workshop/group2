import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyMagicLinkToken, createSessionToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(new URL('/auth/login?error=invalid_token', request.url))
    }

    const email = verifyMagicLinkToken(token)
    if (!email) {
      return NextResponse.redirect(new URL('/auth/login?error=invalid_token', request.url))
    }

    // Find user
    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user) {
      return NextResponse.redirect(new URL('/auth/login?error=user_not_found', request.url))
    }

    // Update email verified and last login
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        lastLoginAt: new Date(),
      },
    })

    // Create session token
    const sessionToken = createSessionToken({
      userId: user.id,
      email: user.email,
    })

    // Set cookie and redirect
    const baseUrl = new URL('/', request.url)
    const response = NextResponse.redirect(baseUrl)
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.redirect(new URL('/auth/login?error=server_error', request.url))
  }
}
