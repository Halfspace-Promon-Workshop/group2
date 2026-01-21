import { Queue } from 'bullmq'

// Parse Redis URL for BullMQ connection
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const url = new URL(redisUrl)
export const redisConnection = {
  host: url.hostname,
  port: parseInt(url.port || '6379', 10),
}

export const monitorQueue = new Queue('monitor-execution', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000, // 1 minute
    },
    removeOnComplete: {
      age: 86400, // 24 hours
    },
    removeOnFail: {
      age: 604800, // 7 days
    },
  },
})

export const notificationQueue = new Queue('notifications', {
  connection: redisConnection,
})
