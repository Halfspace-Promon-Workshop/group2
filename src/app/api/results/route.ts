import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { calculateSeverity } from '@/lib/severity'
import { GitHubSearchResult } from '@/lib/github'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (user instanceof NextResponse) return user

    const searchParams = request.nextUrl.searchParams
    const monitorId = searchParams.get('monitorId')
    const severity = searchParams.get('severity')
    const status = searchParams.get('status')
    const entityType = searchParams.get('entityType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const search = searchParams.get('search')?.trim()
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const skip = (page - 1) * limit

    const where: any = {
      monitor: {
        userId: user.id,
      },
    }

    if (monitorId) {
      where.monitorId = monitorId
    }
    if (severity) {
      where.severity = parseInt(severity, 10)
    }
    if (status) {
      where.status = status
    }
    if (entityType) {
      where.entityType = entityType
    }
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

    // Text search across title, repository, excerpt, path, and matched terms
    if (search && search.length > 0) {
      const searchLower = search.toLowerCase()
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { repository: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { path: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Fetch all matching results (we'll filter matched terms in memory)
    let allResults = await prisma.result.findMany({
      where,
      include: {
        monitor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // If search is provided, also filter by matched terms (JSON array)
    if (search && search.length > 0) {
      const searchLower = search.toLowerCase()
      allResults = allResults.filter((result) => {
        // Check if search term is in matched terms array
        const matchedTerms = result.matchedTerms as string[] | null
        if (matchedTerms && Array.isArray(matchedTerms)) {
          const inMatchedTerms = matchedTerms.some((term) =>
            term.toLowerCase().includes(searchLower)
          )
          if (inMatchedTerms) return true
        }
        // Already filtered by Prisma for other fields (title, repository, etc.)
        return true
      })
    }

    // Calculate total and apply pagination
    const total = allResults.length
    const results = allResults.slice(skip, skip + limit)

    return NextResponse.json({
      results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Get results error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (user instanceof NextResponse) return user

    // Delete all results for this user
    const deleted = await prisma.result.deleteMany({
      where: {
        monitor: {
          userId: user.id,
        },
      },
    })

    // Also clean up dedupe keys for this user's monitors
    // This is critical - without deleting dedupe keys, the monitor won't find results again
    const deletedDedupeKeys = await prisma.resultDedupeKey.deleteMany({
      where: {
        monitor: {
          userId: user.id,
        },
      },
    })

    console.log(`Deleted ${deleted.count} results and ${deletedDedupeKeys.count} dedupe keys for user ${user.id}`)

    return NextResponse.json({
      message: `Deleted ${deleted.count} result(s) and ${deletedDedupeKeys.count} dedupe key(s)`,
      count: deleted.count,
      dedupeKeysDeleted: deletedDedupeKeys.count,
    })
  } catch (error) {
    console.error('Delete results error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (user instanceof NextResponse) return user

    const body = await request.json()
    const action = body.action

    if (action === 'clear-dedupe-keys') {
      // Clear all dedupe keys for this user's monitors
      // This allows the monitor to find results again even if they were seen before
      const deleted = await prisma.resultDedupeKey.deleteMany({
        where: {
          monitor: {
            userId: user.id,
          },
        },
      })

      console.log(`Cleared ${deleted.count} dedupe keys for user ${user.id}`)

      return NextResponse.json({
        message: `Cleared ${deleted.count} dedupe key(s). The monitor will now find results again on the next run.`,
        count: deleted.count,
      })
    }

    if (action === 'recalculate-severity') {
      // Get all results for this user
      const results = await prisma.result.findMany({
        where: {
          monitor: {
            userId: user.id,
          },
        },
      })

      let updatedCount = 0
      for (const result of results) {
        // Convert database result to GitHubSearchResult format
        const githubResult: GitHubSearchResult = {
          entityType: result.entityType as 'code' | 'repo' | 'issue' | 'pr',
          entityId: result.entityId,
          title: result.title,
          url: result.url,
          repository: result.repository,
          repositoryUrl: result.repositoryUrl,
          path: result.path || undefined,
          sha: result.sha || undefined,
          excerpt: result.excerpt || undefined,
          matchedTerms: (result.matchedTerms as string[]) || [],
          createdAt: result.firstSeenAt,
          updatedAt: result.updatedAt,
          // These fields might not be available in stored results, but that's okay
          // The severity calculation will work without them
        }

        // Recalculate severity
        const severityResult = calculateSeverity(githubResult)

        // Update the result if severity changed
        if (severityResult.severity !== result.severity) {
          await prisma.result.update({
            where: { id: result.id },
            data: {
              severity: severityResult.severity,
              severityExplanation: severityResult.explanation,
            },
          })
          updatedCount++
        }
      }

      return NextResponse.json({
        message: `Recalculated severity for ${results.length} result(s). ${updatedCount} result(s) were updated.`,
        total: results.length,
        updated: updatedCount,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Recalculate severity error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
