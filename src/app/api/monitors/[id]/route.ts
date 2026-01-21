import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateMonitorSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  queryType: z.enum(['keyword', 'collection', 'standard']).optional(),
  queryConfig: z.record(z.any()).optional(),
  searchSurfaces: z.array(z.enum(['code', 'repo', 'issues', 'prs'])).optional(),
  intervalMinutes: z.enum(['5', '15', '60', '360']).transform(Number).optional(),
  enabled: z.boolean().optional(),
  notificationThreshold: z.number().min(1).max(5).optional(),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)
    if (user instanceof NextResponse) return user

    const monitor = await prisma.monitor.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
      include: {
        runs: {
          take: 10,
          orderBy: { startedAt: 'desc' },
        },
      },
    })

    if (!monitor) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })
    }

    return NextResponse.json(monitor)
  } catch (error) {
    console.error('Get monitor error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)
    if (user instanceof NextResponse) return user

    const body = await request.json()
    const data = updateMonitorSchema.parse(body)

    // Check ownership
    const existing = await prisma.monitor.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })
    }

    const updateData: any = { ...data }
    if (data.intervalMinutes !== undefined) {
      updateData.intervalMinutes = data.intervalMinutes
    }

    // Recalculate next run if interval or enabled changed
    if (data.intervalMinutes !== undefined || data.enabled !== undefined) {
      const enabled = data.enabled !== undefined ? data.enabled : existing.enabled
      const interval = data.intervalMinutes !== undefined ? data.intervalMinutes : existing.intervalMinutes

      if (enabled) {
        updateData.nextRunAt = new Date()
        updateData.nextRunAt.setMinutes(updateData.nextRunAt.getMinutes() + interval)
        updateData.status = 'active'
      } else {
        updateData.nextRunAt = null
        updateData.status = 'paused'
      }
    }

    const monitor = await prisma.monitor.update({
      where: { id: params.id },
      data: updateData,
    })

    // TODO: Update BullMQ job

    return NextResponse.json(monitor)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Update monitor error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)
    if (user instanceof NextResponse) return user

    const monitor = await prisma.monitor.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    })

    if (!monitor) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })
    }

    // TODO: Remove BullMQ job

    await prisma.monitor.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Monitor deleted' })
  } catch (error) {
    console.error('Delete monitor error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
