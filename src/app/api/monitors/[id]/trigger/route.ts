import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { monitorQueue } from '@/lib/queue'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)
    if (user instanceof NextResponse) return user

    // Check ownership
    const monitor = await prisma.monitor.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    })

    if (!monitor) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })
    }

    if (!monitor.enabled) {
      return NextResponse.json({ error: 'Monitor is paused. Enable it first.' }, { status: 400 })
    }

    // Add job to queue for immediate execution
    const job = await monitorQueue.add(
      `monitor-${monitor.id}-manual`,
      { monitorId: monitor.id },
      {
        jobId: `monitor-${monitor.id}-manual-${Date.now()}`,
        priority: 1, // Higher priority for manual triggers
      }
    )

    return NextResponse.json({
      message: 'Monitor triggered successfully',
      jobId: job.id,
    })
  } catch (error: any) {
    console.error('Trigger monitor error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
