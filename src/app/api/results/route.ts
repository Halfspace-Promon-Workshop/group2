import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware'
import { prisma } from '@/lib/db'

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

    const [results, total] = await Promise.all([
      prisma.result.findMany({
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
        skip,
        take: limit,
      }),
      prisma.result.count({ where }),
    ])

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
