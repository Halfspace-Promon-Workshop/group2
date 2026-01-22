import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (user instanceof NextResponse) return user

    const body = await request.json()
    const { endpoint, keys } = subscribeSchema.parse(body)

    console.log(`[Subscribe] Saving push subscription for user ${user.id}, endpoint: ${endpoint.substring(0, 50)}...`)

    // Upsert subscription
    const subscription = await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId: user.id,
          endpoint,
        },
      },
      create: {
        userId: user.id,
        endpoint,
        p256dhKey: keys.p256dh,
        authKey: keys.auth,
      },
      update: {
        p256dhKey: keys.p256dh,
        authKey: keys.auth,
        updatedAt: new Date(),
      },
    })

    console.log(`[Subscribe] ✅ Subscription saved successfully: ${subscription.id}`)

    return NextResponse.json({ message: 'Subscription saved', subscriptionId: subscription.id })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      console.error('[Subscribe] Validation error:', error.errors)
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('[Subscribe] Error saving subscription:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request)
    if (user instanceof NextResponse) return user

    const searchParams = request.nextUrl.searchParams
    const endpoint = searchParams.get('endpoint')

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint required' }, { status: 400 })
    }

    await prisma.pushSubscription.deleteMany({
      where: {
        userId: user.id,
        endpoint,
      },
    })

    return NextResponse.json({ message: 'Subscription removed' })
  } catch (error) {
    console.error('Unsubscribe error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
