// Note: For server-side, we'll use a simpler approach
// In production, consider using DOMPurify or similar

/**
 * Sanitizes HTML content to prevent XSS (basic implementation)
 * For production, use a proper HTML sanitizer like DOMPurify
 */
export function sanitizeHtml(html: string): string {
  // Basic sanitization - remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '')
}

/**
 * Sanitizes user input by removing potentially dangerous characters
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 10000) // Limit length
}

/**
 * Validates and sanitizes monitor name
 */
export function sanitizeMonitorName(name: string): string {
  return sanitizeInput(name).substring(0, 255)
}

/**
 * Validates and sanitizes notes
 */
export function sanitizeNotes(notes: string): string {
  return sanitizeInput(notes).substring(0, 5000)
}
