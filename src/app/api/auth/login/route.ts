import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { createMagicLinkToken } from '@/lib/auth'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = loginSchema.parse(body)

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          emailVerified: false,
        },
      })
    }

    // Generate magic link token
    const token = createMagicLinkToken(email)

    // In production, send email with magic link
    // For MVP, we'll return the token (in production, email it)
    const magicLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/verify?token=${token}`

    // TODO: Send email with magic link
    // For now, log it (remove in production)
    console.log(`Magic link for ${email}: ${magicLink}`)

    return NextResponse.json({
      message: 'Magic link sent to your email',
      // Always return magic link in development (check if not production)
      magicLink: process.env.NODE_ENV !== 'production' ? magicLink : undefined,
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
