import webpush from 'web-push'
import { prisma } from '../lib/db'

// Initialize VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com'

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
}

/**
 * Sends a push notification to all user's subscriptions
 */
export async function sendPushNotification(
  userId: string,
  resultId: string,
  severity: number,
  title: string,
  repository: string,
  url: string
) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('VAPID keys not configured, skipping push notification')
    return
  }

  // Get user's push subscriptions
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  })

  if (subscriptions.length === 0) {
    console.log(`No push subscriptions for user ${userId}`)
    return
  }

  // Check throttling (max 1 notification per monitor per 15 minutes)
  // This would be better with Redis, but for MVP we'll use a simple check
  const recentNotifications = await prisma.notification.findMany({
    where: {
      userId,
      resultId,
      type: 'web_push',
      status: 'sent',
      sentAt: {
        gte: new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
      },
    },
  })

  if (recentNotifications.length > 0) {
    console.log(`Notification throttled for user ${userId}, result ${resultId}`)
    return
  }

  const payload = JSON.stringify({
    title: 'New Shield-related content detected',
    body: `[Severity ${severity}] ${title} in ${repository}`,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: {
      url,
      resultId,
      severity: severity.toString(),
    },
    tag: `shield-monitor-${resultId}`,
    requireInteraction: false,
  })

  // Send to all subscriptions
  for (const subscription of subscriptions) {
    try {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dhKey,
          auth: subscription.authKey,
        },
      }

      await webpush.sendNotification(pushSubscription, payload)

      // Log successful notification
      await prisma.notification.create({
        data: {
          userId,
          resultId,
          type: 'web_push',
          status: 'sent',
          sentAt: new Date(),
        },
      })

      console.log(`Push notification sent to user ${userId}`)
    } catch (error: any) {
      console.error(`Failed to send push notification:`, error)

      // Handle invalid subscription
      if (error.statusCode === 410 || error.statusCode === 404) {
        await prisma.pushSubscription.delete({
          where: { id: subscription.id },
        })
        console.log(`Removed invalid subscription ${subscription.id}`)
      }

      // Log failed notification
      await prisma.notification.create({
        data: {
          userId,
          resultId,
          type: 'web_push',
          status: 'failed',
          errorMessage: error.message,
        },
      })
    }
  }
}
