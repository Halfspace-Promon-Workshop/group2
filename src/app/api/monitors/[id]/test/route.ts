import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { decryptToken } from '@/lib/encryption'
import { GitHubClient } from '@/lib/github'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)
    if (user instanceof NextResponse) return user

    const monitor = await prisma.monitor.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
      include: {
        user: true,
      },
    })

    if (!monitor) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })
    }

    if (!monitor.user.encryptedGithubToken || !monitor.user.githubTokenIv) {
      return NextResponse.json({ error: 'GitHub token not configured' }, { status: 400 })
    }

    const githubToken = decryptToken(
      monitor.user.encryptedGithubToken,
      monitor.user.githubTokenIv,
      monitor.user.id
    )

    const github = new GitHubClient(githubToken)

    // Build query
    let query = ''
    if (monitor.queryType === 'keyword') {
      query = (monitor.queryConfig as any).keyword as string
    } else if (monitor.queryType === 'collection') {
      const words = (monitor.queryConfig as any).words as string[]
      query = words.join(' OR ')
    } else if (monitor.queryType === 'standard') {
      query = '"Shield" (bypass OR workaround OR exploit OR poc)'
    }

    const searchSurfaces = monitor.searchSurfaces as string[]
    const results: any = {}

    for (const surface of searchSurfaces) {
      try {
        let surfaceResults: any[] = []
        if (surface === 'code') {
          surfaceResults = await github.searchCode(query)
        } else if (surface === 'repo') {
          surfaceResults = await github.searchRepositories(query)
        } else if (surface === 'issues') {
          surfaceResults = await github.searchIssues(query)
        } else if (surface === 'prs') {
          surfaceResults = await github.searchPullRequests(query)
        }
        results[surface] = {
          count: surfaceResults.length,
          samples: surfaceResults.slice(0, 5).map((r) => ({
            title: r.title,
            url: r.url,
            repository: r.repository,
          })),
        }
      } catch (error: any) {
        results[surface] = {
          error: error.message,
        }
      }
    }

    return NextResponse.json({
      query,
      searchSurfaces,
      results,
      rateLimit: github.getRateLimit(),
    })
  } catch (error: any) {
    console.error('Test monitor error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
