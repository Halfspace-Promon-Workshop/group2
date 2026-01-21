import { RateLimiterRedis } from 'rate-limiter-flexible'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

// Rate limiters
export const authRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl_auth',
  points: 5, // 5 requests
  duration: 60, // per 60 seconds
})

export const apiRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl_api',
  points: 100, // 100 requests
  duration: 60, // per 60 seconds
})

export const searchRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'rl_search',
  points: 10, // 10 requests
  duration: 60, // per 60 seconds
})

export async function checkRateLimit(
  limiter: RateLimiterRedis,
  key: string
): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
  try {
    const result = await limiter.consume(key)
    return {
      allowed: true,
      remaining: result.remainingPoints,
      resetTime: new Date(Date.now() + result.msBeforeNext),
    }
  } catch (error: any) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: new Date(Date.now() + error.msBeforeNext),
    }
  }
}
