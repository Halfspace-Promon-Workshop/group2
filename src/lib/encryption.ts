import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const KEY_LENGTH = 32

/**
 * Derives an encryption key from the master key and user ID
 */
function deriveKey(masterKey: string, userId: string): Buffer {
  return crypto.pbkdf2Sync(masterKey, userId, 100000, KEY_LENGTH, 'sha256')
}

/**
 * Encrypts a GitHub token using AES-256-GCM
 */
export function encryptToken(token: string, userId: string): { encrypted: string; iv: string } {
  const masterKey = process.env.ENCRYPTION_KEY
  if (!masterKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }

  const key = deriveKey(masterKey, userId)
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(token, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const tag = cipher.getAuthTag()

  // Combine encrypted data and tag
  const combined = encrypted + tag.toString('hex')

  return {
    encrypted: combined,
    iv: iv.toString('hex'),
  }
}

/**
 * Decrypts a GitHub token using AES-256-GCM
 */
export function decryptToken(encrypted: string, iv: string, userId: string): string {
  const masterKey = process.env.ENCRYPTION_KEY
  if (!masterKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set')
  }

  const key = deriveKey(masterKey, userId)
  const ivBuffer = Buffer.from(iv, 'hex')

  // Extract tag and encrypted data
  const tag = Buffer.from(encrypted.slice(-TAG_LENGTH * 2), 'hex')
  const encryptedData = encrypted.slice(0, -TAG_LENGTH * 2)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
