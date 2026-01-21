import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { encryptToken } from '@/lib/encryption'
import { Octokit } from '@octokit/rest'
import { z } from 'zod'

const tokenSchema = z.object({
  token: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (user instanceof NextResponse) return user

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        githubTokenCreatedAt: true,
      },
    })

    return NextResponse.json({
      hasToken: !!dbUser?.githubTokenCreatedAt,
      createdAt: dbUser?.githubTokenCreatedAt,
    })
  } catch (error) {
    console.error('Get token error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (user instanceof NextResponse) return user

    const body = await request.json()
    const { token } = tokenSchema.parse(body)

    // Validate token by making a test API call
    try {
      const octokit = new Octokit({ auth: token })
      await octokit.rest.users.getAuthenticated()
    } catch (error: any) {
      return NextResponse.json({ error: 'Invalid GitHub token' }, { status: 400 })
    }

    // Encrypt and store token
    const { encrypted, iv } = encryptToken(token, user.id)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        encryptedGithubToken: encrypted,
        githubTokenIv: iv,
        githubTokenCreatedAt: new Date(),
      },
    })

    return NextResponse.json({ message: 'Token saved successfully' })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Save token error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
