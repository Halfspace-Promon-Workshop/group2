import { Worker, Queue, QueueEvents } from 'bullmq'
import { prisma } from '../lib/db'
import { decryptToken } from '../lib/encryption'
import { GitHubClient } from '../lib/github'
import { calculateSeverity } from '../lib/severity'
import { sendPushNotification } from './notifications'
import { monitorQueue, notificationQueue, redisConnection } from '../lib/queue'

// Re-export for backward compatibility
export { monitorQueue, notificationQueue }

const worker = new Worker(
  'monitor-execution',
  async (job) => {
    const { monitorId } = job.data
    const isManualTrigger = job.id?.includes('manual') || false

    console.log(`Processing monitor ${monitorId}${isManualTrigger ? ' (manual trigger)' : ''}`)

    // Get monitor
    const monitor = await prisma.monitor.findUnique({
      where: { id: monitorId },
      include: {
        user: true,
      },
    })

    if (!monitor || !monitor.enabled) {
      console.log(`Monitor ${monitorId} not found or disabled`)
      return
    }

    // Create monitor run early so we always have a record to update
    let run
    try {
      run = await prisma.monitorRun.create({
        data: {
          monitorId: monitor.id,
          status: 'running',
        },
      })
    } catch (error: any) {
      console.error(`Monitor ${monitorId}: Failed to create run record:`, error)
      // Continue anyway - we'll handle errors later
    }

    try {
      // Get user's GitHub token
      if (!monitor.user.encryptedGithubToken || !monitor.user.githubTokenIv) {
        const errorMsg = `Monitor ${monitorId}: User ${monitor.user.email} has no GitHub token configured. Please add a GitHub token in Settings.`
        console.error(errorMsg)
        
        // Update run if it exists
        if (run) {
          try {
            await prisma.monitorRun.update({
              where: { id: run.id },
              data: {
                status: 'failed',
                completedAt: new Date(),
                errorMessage: 'GitHub token not configured',
              },
            })
          } catch (updateError: any) {
            console.error(`Monitor ${monitorId}: Failed to update run:`, updateError)
          }
        }
        
        // Update monitor status
        await prisma.monitor.update({
          where: { id: monitorId },
          data: {
            status: 'error',
            errorMessage: 'GitHub token not configured. Please add a token in Settings.',
          },
        })
        
        throw new Error(errorMsg)
      }

      const githubToken = decryptToken(
        monitor.user.encryptedGithubToken,
        monitor.user.githubTokenIv,
        monitor.user.id
      )

      // Create GitHub client
      const github = new GitHubClient(githubToken)
      
      // Clear any previous rate limit errors if enough time has passed
      // (Rate limits reset every hour, so if error is older than 1 hour, clear it)
      if (monitor.status === 'error' && monitor.errorMessage?.includes('Rate limit')) {
        const errorAge = monitor.updatedAt ? Date.now() - monitor.updatedAt.getTime() : 0
        // If error is older than 70 minutes (rate limits reset hourly), clear it
        if (errorAge > 70 * 60 * 1000) {
          console.log(`Monitor ${monitorId}: Clearing old rate limit error`)
          await prisma.monitor.update({
            where: { id: monitorId },
            data: {
              status: 'active',
              errorMessage: null,
            },
          })
        }
      }
      
      // Build query
      let query = ''
      if (monitor.queryType === 'keyword') {
        query = (monitor.queryConfig as any).keyword as string
      } else if (monitor.queryType === 'collection') {
        const words = (monitor.queryConfig as any).words as string[]
        query = words.join(' OR ')
      } else if (monitor.queryType === 'standard') {
        query = '"Shield" (bypass OR workaround OR exploit OR poc)'
      }

      const searchSurfaces = monitor.searchSurfaces as string[]
      const lastRunAt = monitor.lastRunAt
      
      // For manual triggers, don't use date filter to ensure we find newly created repositories
      // For scheduled runs, only use createdAfter filter if last run was recent (within 90 days)
      // For first run or old runs, don't filter by date to get all results
      let createdAfter: Date | undefined
      if (isManualTrigger) {
        console.log(`Monitor ${monitorId}: Manual trigger - no date filter to find all results including new repositories`)
        createdAfter = undefined
      } else {
        createdAfter = lastRunAt && (Date.now() - lastRunAt.getTime()) < 90 * 24 * 60 * 60 * 1000 ? lastRunAt : undefined
      }
      
      if (createdAfter) {
        console.log(`Monitor ${monitorId}: Filtering results created after ${createdAfter.toISOString()}`)
      } else {
        console.log(`Monitor ${monitorId}: No date filter - searching all results`)
      }

      // Search each surface
      const allResults: any[] = []
      console.log(`Monitor ${monitorId}: Searching with query: "${query}"`)
      console.log(`Monitor ${monitorId}: Search surfaces: ${searchSurfaces.join(', ')}`)
      
      for (const surface of searchSurfaces) {
        try {
          let results: any[] = []
          console.log(`Monitor ${monitorId}: Searching ${surface}...`)
          
          if (surface === 'code') {
            results = await github.searchCode(query, createdAfter)
          } else if (surface === 'repo') {
            results = await github.searchRepositories(query, createdAfter)
          } else if (surface === 'issues') {
            results = await github.searchIssues(query, createdAfter)
          } else if (surface === 'prs') {
            results = await github.searchPullRequests(query, createdAfter)
          }

          console.log(`Monitor ${monitorId}: Found ${results.length} results in ${surface}`)
          allResults.push(...results)
        } catch (error: any) {
          if (error.message === 'Rate limited') {
            const rateLimit = github.getRateLimit()
            try {
              await prisma.monitorRun.update({
                where: { id: run.id },
                data: {
                  status: 'rate_limited',
                  rateLimitRemaining: rateLimit.remaining,
                  rateLimitResetAt: rateLimit.resetAt,
                  errorMessage: 'Rate limited by GitHub API',
                },
              })
            } catch (updateError: any) {
              console.error(`Monitor ${monitorId}: Failed to update run for rate limit:`, updateError)
            }

            // Reschedule for after rate limit reset
            const resetTimeDate = new Date(rateLimit.resetAt)
            const resetTimeDelay = resetTimeDate.getTime() - Date.now() + 60000 // 1 minute buffer
            
            await monitorQueue.add(
              `monitor-${monitorId}`,
              { monitorId },
              {
                delay: resetTimeDelay,
              }
            )

            const waitMinutes = Math.ceil((resetTimeDate.getTime() - Date.now()) / 60000)
            
            await prisma.monitor.update({
              where: { id: monitorId },
              data: {
                status: 'error',
                errorMessage: `Rate limited. ${rateLimit.remaining} requests remaining. Resets in ~${waitMinutes} minutes (${resetTimeDate.toLocaleTimeString()})`,
                nextRunAt: resetTimeDate,
              },
            })

            console.log(`Monitor ${monitorId}: Rate limited. Will retry after ${resetTimeDate.toISOString()}`)
            return
          }
          throw error
        }
      }

      // Process results
      let newCount = 0
      for (const result of allResults) {
        // Generate dedupe key
        const dedupeKey = GitHubClient.generateDedupeKey(
          result.entityType,
          result.repository,
          result.entityId,
          result.sha
        )

        // Check if we've seen this before
        const existing = await prisma.resultDedupeKey.findUnique({
          where: {
            monitorId_dedupeKey: {
              monitorId: monitor.id,
              dedupeKey,
            },
          },
        })

        if (existing) {
          continue // Skip duplicates
        }

        // Calculate severity
        const severityResult = calculateSeverity(result)

        // Create result
        try {
          const dbResult = await prisma.result.create({
            data: {
              monitorId: monitor.id,
              monitorRunId: run.id,
              entityType: result.entityType,
              entityId: result.entityId,
              title: result.title,
              url: result.url,
              repository: result.repository,
              repositoryUrl: result.repositoryUrl,
              path: result.path,
              sha: result.sha,
              excerpt: result.excerpt,
              matchedTerms: result.matchedTerms,
              severity: severityResult.severity,
              severityExplanation: severityResult.explanation,
              status: 'new',
              tags: [],
            },
          })

          // Create dedupe key
          await prisma.resultDedupeKey.create({
            data: {
              monitorId: monitor.id,
              dedupeKey,
            },
          })

          newCount++

          // Send notification if severity meets threshold
          if (severityResult.severity >= monitor.notificationThreshold) {
            await notificationQueue.add('send-push', {
              userId: monitor.userId,
              resultId: dbResult.id,
              severity: severityResult.severity,
              title: result.title,
              repository: result.repository,
              url: result.url,
            })
          }
        } catch (error: any) {
          // Handle unique constraint violation (race condition)
          if (error.code === 'P2002') {
            console.log(`Duplicate result skipped: ${result.url}`)
            continue
          }
          throw error
        }
      }

      // Update run
      if (run) {
        try {
          const rateLimit = github.getRateLimit()
          await prisma.monitorRun.update({
            where: { id: run.id },
            data: {
              status: 'completed',
              completedAt: new Date(),
              resultsFound: allResults.length,
              resultsNew: newCount,
              rateLimitRemaining: rateLimit.remaining,
              rateLimitResetAt: rateLimit.resetAt,
            },
          })
        } catch (updateError: any) {
          console.error(`Monitor ${monitorId}: Failed to update run on completion:`, updateError)
        }
      }

      // Update monitor
      const nextRunAt = new Date()
      nextRunAt.setMinutes(nextRunAt.getMinutes() + monitor.intervalMinutes)

      // Clear any previous errors on successful completion
      await prisma.monitor.update({
        where: { id: monitorId },
        data: {
          lastRunAt: new Date(),
          nextRunAt,
          status: 'active',
          errorMessage: null, // Clear any previous errors including rate limit errors
        },
      })

      // Schedule next run
      await scheduleMonitor(monitorId, monitor.intervalMinutes)

      console.log(`Monitor ${monitorId} completed: ${newCount} new results`)
    } catch (error: any) {
      console.error(`Monitor ${monitorId} failed:`, error)

      // Only update run if it was created
      if (run) {
        try {
          await prisma.monitorRun.update({
            where: { id: run.id },
            data: {
              status: 'failed',
              completedAt: new Date(),
              errorMessage: error.message,
            },
          })
        } catch (updateError: any) {
          console.error(`Monitor ${monitorId}: Failed to update run record:`, updateError)
          // Try to create a new run record for tracking
          try {
            await prisma.monitorRun.create({
              data: {
                monitorId: monitor.id,
                status: 'failed',
                completedAt: new Date(),
                errorMessage: error.message,
              },
            })
          } catch (createError: any) {
            console.error(`Monitor ${monitorId}: Failed to create run record for error:`, createError)
          }
        }
      }

      // Update monitor status
      try {
        await prisma.monitor.update({
          where: { id: monitorId },
          data: {
            status: 'error',
            errorMessage: error.message,
          },
        })
      } catch (updateError: any) {
        console.error(`Monitor ${monitorId}: Failed to update monitor status:`, updateError)
      }

      throw error
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
)

// Notification worker
const notificationWorker = new Worker(
  'notifications',
  async (job) => {
    const { userId, resultId, severity, title, repository, url } = job.data
    await sendPushNotification(userId, resultId, severity, title, repository, url)
  },
  {
    connection: redisConnection,
    concurrency: 10,
  }
)

/**
 * Schedules a monitor to run at its next interval
 */
export async function scheduleMonitor(monitorId: string, intervalMinutes: number) {
  const cronExpression = getCronExpression(intervalMinutes)
  
  // Remove existing repeatable job if any
  const existingJobs = await monitorQueue.getRepeatableJobs()
  const existingJob = existingJobs.find((job) => job.id === `monitor-${monitorId}`)
  if (existingJob) {
    await monitorQueue.removeRepeatableByKey(existingJob.key)
  }

  // Add new repeatable job
  await monitorQueue.add(
    `monitor-${monitorId}`,
    { monitorId },
    {
      repeat: {
        pattern: cronExpression,
      },
      jobId: `monitor-${monitorId}`,
    }
  )
}

function getCronExpression(intervalMinutes: number): string {
  switch (intervalMinutes) {
    case 5:
      return '*/5 * * * *'
    case 15:
      return '*/15 * * * *'
    case 60:
      return '0 * * * *'
    case 360:
      return '0 */6 * * *'
    default:
      return '0 * * * *' // Default to hourly
  }
}

/**
 * Initializes all enabled monitors on startup
 */
export async function initializeMonitors() {
  console.log('Initializing monitors...')

  const monitors = await prisma.monitor.findMany({
    where: {
      enabled: true,
      status: 'active',
    },
  })

  for (const monitor of monitors) {
    // Schedule immediate run if next run is in the past or null
    if (!monitor.nextRunAt || monitor.nextRunAt < new Date()) {
      await monitorQueue.add(`monitor-${monitor.id}`, { monitorId: monitor.id }, { jobId: `monitor-${monitor.id}-immediate` })
    }

    // Schedule recurring job
    await scheduleMonitor(monitor.id, monitor.intervalMinutes)
  }

  console.log(`Initialized ${monitors.length} monitors`)
}

// Start workers
console.log('Starting workers...')

worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`)
})

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id || 'unknown'} failed:`, err)
})

notificationWorker.on('completed', (job) => {
  console.log(`Notification job ${job.id} completed`)
})

notificationWorker.on('failed', (job, err) => {
  console.error(`Notification job ${job?.id || 'unknown'} failed:`, err)
})

// Initialize monitors on startup
initializeMonitors().catch(console.error)

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down workers...')
  await worker.close()
  await notificationWorker.close()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('Shutting down workers...')
  await worker.close()
  await notificationWorker.close()
  process.exit(0)
})
