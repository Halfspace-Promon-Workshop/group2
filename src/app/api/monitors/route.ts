import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { sanitizeMonitorName } from '@/lib/sanitize'
import { createAuditLog, getClientIp } from '@/lib/audit'
import { apiRateLimiter, checkRateLimit } from '@/lib/rate-limit'

const createMonitorSchema = z.object({
  name: z.string().min(1).max(255),
  queryType: z.enum(['keyword', 'collection', 'standard']),
  queryConfig: z.record(z.any()),
  searchSurfaces: z.array(z.enum(['code', 'repo', 'issues', 'prs'])),
  intervalMinutes: z.enum(['5', '15', '60', '360']).transform(Number),
  enabled: z.boolean().optional().default(true),
  notificationThreshold: z.number().min(1).max(5).optional().default(3),
})

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (user instanceof NextResponse) return user

    const monitors = await prisma.monitor.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(monitors)
  } catch (error) {
    console.error('Get monitors error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (user instanceof NextResponse) return user

    // Rate limiting
    const ip = getClientIp(request) || 'unknown'
    const rateLimit = await checkRateLimit(apiRateLimiter, `user:${user.id}`)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetTime.toISOString(),
          },
        }
      )
    }

    const body = await request.json()
    const data = createMonitorSchema.parse(body)
    
    // Sanitize name
    data.name = sanitizeMonitorName(data.name)

    // Build query based on type
    let query = ''
    if (data.queryType === 'keyword') {
      query = data.queryConfig.keyword as string
    } else if (data.queryType === 'collection') {
      const words = data.queryConfig.words as string[]
      query = words.join(' OR ')
    } else if (data.queryType === 'standard') {
      // Standard search: "Shield" (bypass OR workaround OR exploit OR poc)
      query = '"Shield" (bypass OR workaround OR exploit OR poc)'
    }

    // Calculate next run time
    const nextRunAt = new Date()
    nextRunAt.setMinutes(nextRunAt.getMinutes() + data.intervalMinutes)

    const monitor = await prisma.monitor.create({
      data: {
        userId: user.id,
        name: data.name,
        queryType: data.queryType,
        queryConfig: data.queryConfig,
        searchSurfaces: data.searchSurfaces,
        intervalMinutes: data.intervalMinutes,
        enabled: data.enabled,
        notificationThreshold: data.notificationThreshold,
        nextRunAt: data.enabled ? nextRunAt : null,
        status: data.enabled ? 'active' : 'paused',
      },
    })

    // TODO: Schedule BullMQ job for this monitor

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: 'monitor_created',
      resourceType: 'monitor',
      resourceId: monitor.id,
      ipAddress: ip,
    })

    return NextResponse.json(monitor, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Create monitor error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
