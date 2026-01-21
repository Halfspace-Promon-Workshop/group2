import { GitHubSearchResult } from './github'

export interface SeverityScore {
  severity: number // 1-5
  explanation: string
  score: number // 0-100
}

/**
 * Calculates severity score (1-5) for a GitHub search result
 */
export function calculateSeverity(result: GitHubSearchResult): SeverityScore {
  let score = 0
  const reasons: string[] = []

  // 1. Keyword Matches (0-30 points)
  const keywordScore = calculateKeywordScore(result, reasons)
  score += keywordScore

  // 2. File/Path Context (0-25 points)
  const fileScore = calculateFileScore(result, reasons)
  score += fileScore

  // 3. Repository Context (0-20 points)
  const repoScore = calculateRepoScore(result, reasons)
  score += repoScore

  // 4. Content Analysis (0-15 points)
  const contentScore = calculateContentScore(result, reasons)
  score += contentScore

  // 5. Recency & Popularity (0-10 points)
  const recencyScore = calculateRecencyScore(result, reasons)
  score += recencyScore

  // Map to 1-5 severity
  let severity: number
  if (score <= 20) severity = 1
  else if (score <= 40) severity = 2
  else if (score <= 60) severity = 3
  else if (score <= 80) severity = 4
  else severity = 5

  // Generate explanation
  const primaryReason = reasons[0] || 'No significant indicators found'
  const secondaryIndicators = reasons.slice(1, 3).join('. ')
  const context = getContext(result)

  const explanation = `Severity ${severity}: ${primaryReason}. ${secondaryIndicators ? secondaryIndicators + '. ' : ''}${context}.`

  return {
    severity,
    explanation,
    score: Math.min(100, Math.max(0, score)),
  }
}

function calculateKeywordScore(result: GitHubSearchResult, reasons: string[]): number {
  let score = 0
  const text = `${result.title} ${result.excerpt || ''} ${result.description || ''}`.toLowerCase()
  const matchedTerms = result.matchedTerms.map((t) => t.toLowerCase())

  // Check for Shield + bypass terms
  const hasShield = text.includes('shield') || matchedTerms.some((t) => t.includes('shield'))
  const bypassTerms = ['bypass', 'workaround', 'disable', 'hook', 'frida', 'root', 'instrumentation']
  const exploitTerms = ['exploit', 'poc', 'cve', 'rce']
  const crackTerms = ['crack', 'patch', 'modify']

  if (hasShield) {
    const hasBypass = bypassTerms.some((term) => text.includes(term) || matchedTerms.some((t) => t.includes(term)))
    const hasExploit = exploitTerms.some((term) => text.includes(term) || matchedTerms.some((t) => t.includes(term)))
    const hasCrack = crackTerms.some((term) => text.includes(term) || matchedTerms.some((t) => t.includes(term)))

    if (hasExploit) {
      score += 25
      reasons.push("Contains 'Shield' with exploit indicators")
    } else if (hasBypass) {
      score += 20
      reasons.push("Contains 'Shield' with bypass terms")
    } else if (hasCrack) {
      score += 15
      reasons.push("Contains 'Shield' with modification terms")
    }
  }

  // Exploit indicators
  const cveMatches = text.match(/cve-\d{4}-\d+/gi) || []
  if (cveMatches.length > 0) {
    score += Math.min(10, cveMatches.length * 5)
    reasons.push(`Contains ${cveMatches.length} CVE reference(s)`)
  }

  const exploitIndicators = ['rce', 'xss', 'sqli', 'lfi', 'rfi']
  const foundIndicators = exploitIndicators.filter((ind) => text.includes(ind))
  if (foundIndicators.length > 0) {
    score += foundIndicators.length * 3
    reasons.push(`Contains exploit indicators: ${foundIndicators.join(', ')}`)
  }

  const payloadTerms = ['payload', 'shellcode', 'metasploit']
  const foundPayloads = payloadTerms.filter((term) => text.includes(term))
  if (foundPayloads.length > 0) {
    score += foundPayloads.length * 2
  }

  return Math.min(30, score)
}

function calculateFileScore(result: GitHubSearchResult, reasons: string[]): number {
  let score = 0
  const path = result.path?.toLowerCase() || ''
  const title = result.title.toLowerCase()

  // Exploit patterns in path
  const exploitPaths = ['/poc/', '/exploit/', '/bypass/', '/crack/']
  const hasExploitPath = exploitPaths.some((p) => path.includes(p))
  if (hasExploitPath) {
    score += 15
    reasons.push('Found in exploit-related directory')
  }

  // Exploit patterns in filename
  const exploitPatterns = [/^exploit\./, /^poc\./, /^bypass\./]
  const hasExploitFile = exploitPatterns.some((pattern) => pattern.test(title))
  if (hasExploitFile) {
    score += 10
    reasons.push('Filename suggests exploit/PoC')
  }

  // Benign indicators
  if (path.includes('/test/') || path.includes('/example/')) {
    score -= 5
  }

  // File extensions
  if (title.endsWith('.py') || title.endsWith('.sh') || title.endsWith('.js') || title.endsWith('.rb')) {
    score += 5
  } else if (title.endsWith('.md')) {
    score += 2
  } else if (title.endsWith('.txt')) {
    score += 1
  }

  return Math.min(25, Math.max(0, score))
}

function calculateRepoScore(result: GitHubSearchResult, reasons: string[]): number {
  let score = 0
  const repoName = result.repository.toLowerCase()
  const description = (result.description || '').toLowerCase()
  const topics = (result.topics || []).map((t) => t.toLowerCase())

  // Security research repos
  const securityTopics = ['security', 'exploit', 'pentest', 'malware']
  const hasSecurityTopic = topics.some((t) => securityTopics.includes(t))
  if (hasSecurityTopic) {
    score += 10
    reasons.push('Repository tagged with security topics')
  }

  const exploitInName = ['exploit', 'poc', 'cve'].some((term) => repoName.includes(term))
  if (exploitInName) {
    score += 8
    reasons.push('Repository name suggests exploit/PoC')
  }

  if (description.includes('security research') || description.includes('proof of concept')) {
    score += 5
  }

  // Benign indicators
  const benignTopics = ['tutorial', 'learning', 'example']
  const hasBenignTopic = topics.some((t) => benignTopics.includes(t))
  if (hasBenignTopic) {
    score -= 5
  }

  return Math.min(20, Math.max(-10, score))
}

function calculateContentScore(result: GitHubSearchResult, reasons: string[]): number {
  let score = 0
  const text = `${result.excerpt || ''} ${result.description || ''}`.toLowerCase()

  // Code patterns
  const codePatterns = ['bypass', 'hook', 'inject', 'patch']
  const foundPatterns = codePatterns.filter((pattern) => text.includes(pattern))
  if (foundPatterns.length > 0) {
    score += Math.min(10, foundPatterns.length * 2.5)
    reasons.push(`Contains code patterns: ${foundPatterns.join(', ')}`)
  }

  // Exploit instructions
  if (text.includes('how to bypass') || text.includes('workaround')) {
    score += 5
  }

  if (text.includes('installation') && (text.includes('bypass') || text.includes('hook'))) {
    score += 3
  }

  return Math.min(15, score)
}

function calculateRecencyScore(result: GitHubSearchResult, reasons: string[]): number {
  let score = 0
  const now = new Date()
  const updatedAt = result.updatedAt || result.createdAt

  if (updatedAt) {
    const daysSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSinceUpdate <= 7) {
      score += 3
      reasons.push('Recently created/updated (within 7 days)')
    } else if (daysSinceUpdate <= 30) {
      score += 2
    } else if (daysSinceUpdate > 90) {
      score -= 1
    }
  }

  // Popularity
  if (result.stars) {
    if (result.stars > 1000) {
      score += 3
    } else if (result.stars > 100) {
      score += 2
    }
  }

  if (result.forks) {
    if (result.forks > 200) {
      score += 2
    } else if (result.forks > 50) {
      score += 1
    }
  }

  return Math.min(10, score)
}

function getContext(result: GitHubSearchResult): string {
  const parts: string[] = []

  if (result.path) {
    parts.push(`Found in ${result.path}`)
  }

  if (result.topics && result.topics.length > 0) {
    parts.push(`Repository topics: ${result.topics.slice(0, 3).join(', ')}`)
  }

  if (result.stars && result.stars > 100) {
    parts.push(`Popular repository (${result.stars} stars)`)
  }

  return parts.length > 0 ? parts.join('. ') : 'Standard repository context'
}
