import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateResultSchema = z.object({
  status: z.enum(['new', 'seen', 'triaged', 'false_positive']).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)
    if (user instanceof NextResponse) return user

    const result = await prisma.result.findFirst({
      where: {
        id: params.id,
        monitor: {
          userId: user.id,
        },
      },
      include: {
        monitor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!result) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Get result error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request)
    if (user instanceof NextResponse) return user

    const body = await request.json()
    const data = updateResultSchema.parse(body)

    // Check ownership
    const existing = await prisma.result.findFirst({
      where: {
        id: params.id,
        monitor: {
          userId: user.id,
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 })
    }

    const updateData: any = {}
    if (data.status !== undefined) {
      updateData.status = data.status
    }
    if (data.notes !== undefined) {
      updateData.notes = data.notes
    }
    if (data.tags !== undefined) {
      updateData.tags = data.tags
    }

    const result = await prisma.result.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(result)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Update result error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
