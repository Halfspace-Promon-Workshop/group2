import jwt from 'jsonwebtoken'
import { prisma } from './db'

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production'

export interface SessionPayload {
  userId: string
  email: string
}

/**
 * Creates a JWT token for email magic link
 */
export function createMagicLinkToken(email: string): string {
  return jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' })
}

/**
 * Verifies a magic link token and returns the email
 */
export function verifyMagicLinkToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { email: string }
    return decoded.email
  } catch {
    return null
  }
}

/**
 * Creates a session token
 */
export function createSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

/**
 * Verifies a session token
 */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload
  } catch {
    return null
  }
}

/**
 * Gets the current user from the session token
 */
export async function getCurrentUser(token: string | null | undefined) {
  if (!token) return null

  const payload = verifySessionToken(token)
  if (!payload) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      createdAt: true,
    },
  })

  return user
}
