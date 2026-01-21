import { prisma } from './db'

export interface AuditLogData {
  userId?: string
  action: string
  resourceType?: string
  resourceId?: string
  details?: any
  ipAddress?: string
}

/**
 * Creates an audit log entry
 */
export async function createAuditLog(data: AuditLogData) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        details: data.details || {},
        ipAddress: data.ipAddress,
      },
    })
  } catch (error) {
    // Don't fail the request if audit logging fails
    console.error('Failed to create audit log:', error)
  }
}

/**
 * Gets client IP address from request
 */
export function getClientIp(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  return undefined
}
