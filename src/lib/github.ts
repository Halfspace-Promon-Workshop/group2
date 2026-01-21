import { Octokit } from '@octokit/rest'
import { createHash } from 'crypto'

export interface GitHubSearchResult {
  entityType: 'code' | 'repo' | 'issue' | 'pr'
  entityId: string
  title: string
  url: string
  repository: string
  repositoryUrl: string
  path?: string
  sha?: string
  excerpt?: string
  matchedTerms: string[]
  stars?: number
  forks?: number
  createdAt?: Date
  updatedAt?: Date
  topics?: string[]
  description?: string
}

export interface RateLimitInfo {
  remaining: number
  resetAt: Date
}

export class GitHubClient {
  private octokit: Octokit
  private rateLimitRemaining: number = 30
  private rateLimitResetAt: Date = new Date()

  constructor(token: string) {
    this.octokit = new Octokit({
      auth: token,
    })
  }

  /**
   * Updates rate limit info from API response headers
   */
  private updateRateLimit(headers: any) {
    const remaining = parseInt(headers['x-ratelimit-remaining'] || '0', 10)
    const reset = parseInt(headers['x-ratelimit-reset'] || '0', 10) * 1000

    this.rateLimitRemaining = remaining
    this.rateLimitResetAt = new Date(reset)
  }

  /**
   * Gets current rate limit info
   */
  getRateLimit(): RateLimitInfo {
    return {
      remaining: this.rateLimitRemaining,
      resetAt: this.rateLimitResetAt,
    }
  }

  /**
   * Searches GitHub code
   */
  async searchCode(query: string, createdAfter?: Date): Promise<GitHubSearchResult[]> {
    let searchQuery = query
    if (createdAfter) {
      const dateStr = createdAfter.toISOString().split('T')[0]
      searchQuery += ` created:>${dateStr}`
    }

    const results: GitHubSearchResult[] = []
    let page = 1
    const maxPages = 10 // GitHub limits to 1000 results (10 pages * 100)

    while (page <= maxPages) {
      try {
        const response = await this.octokit.rest.search.code({
          q: searchQuery,
          per_page: 100,
          page,
          sort: 'indexed',
          order: 'desc',
        })

        this.updateRateLimit(response.headers)

        if (response.data.items.length === 0) break

        for (const item of response.data.items) {
          results.push({
            entityType: 'code',
            entityId: item.sha,
            title: item.name,
            url: item.html_url,
            repository: item.repository.full_name,
            repositoryUrl: item.repository.html_url,
            path: item.path,
            sha: item.sha,
            excerpt: item.text_matches?.[0]?.fragment?.substring(0, 500),
            matchedTerms: this.extractMatchedTerms(item.text_matches || []),
            stars: item.repository.stargazers_count,
            forks: item.repository.forks_count,
            createdAt: item.repository.created_at ? new Date(item.repository.created_at) : undefined,
            updatedAt: item.repository.updated_at ? new Date(item.repository.updated_at) : undefined,
            topics: item.repository.topics || [],
            description: item.repository.description || undefined,
          })
        }

        if (response.data.items.length < 100) break
        page++
      } catch (error: any) {
        if (error.status === 403) {
          throw new Error('Rate limited')
        }
        throw error
      }
    }

    return results
  }

  /**
   * Searches GitHub repositories
   */
  async searchRepositories(query: string, createdAfter?: Date): Promise<GitHubSearchResult[]> {
    let searchQuery = query
    if (createdAfter) {
      const dateStr = createdAfter.toISOString().split('T')[0]
      searchQuery += ` created:>${dateStr}`
    }

    const results: GitHubSearchResult[] = []
    let page = 1
    const maxPages = 10

    while (page <= maxPages) {
      try {
        const response = await this.octokit.rest.search.repos({
          q: searchQuery,
          per_page: 100,
          page,
          sort: 'updated',
          order: 'desc',
        })

        this.updateRateLimit(response.headers)

        if (response.data.items.length === 0) break

        for (const item of response.data.items) {
          results.push({
            entityType: 'repo',
            entityId: item.id.toString(),
            title: item.full_name,
            url: item.html_url,
            repository: item.full_name,
            repositoryUrl: item.html_url,
            excerpt: item.description?.substring(0, 500),
            matchedTerms: [query],
            stars: item.stargazers_count,
            forks: item.forks_count,
            createdAt: item.created_at ? new Date(item.created_at) : undefined,
            updatedAt: item.updated_at ? new Date(item.updated_at) : undefined,
            topics: item.topics || [],
            description: item.description || undefined,
          })
        }

        if (response.data.items.length < 100) break
        page++
      } catch (error: any) {
        if (error.status === 403) {
          throw new Error('Rate limited')
        }
        throw error
      }
    }

    return results
  }

  /**
   * Searches GitHub issues
   */
  async searchIssues(query: string, createdAfter?: Date): Promise<GitHubSearchResult[]> {
    let searchQuery = `${query} is:issue`
    if (createdAfter) {
      const dateStr = createdAfter.toISOString().split('T')[0]
      searchQuery += ` created:>${dateStr}`
    }

    const results: GitHubSearchResult[] = []
    let page = 1
    const maxPages = 10

    while (page <= maxPages) {
      try {
        const response = await this.octokit.rest.search.issuesAndPullRequests({
          q: searchQuery,
          per_page: 100,
          page,
          sort: 'updated',
          order: 'desc',
        })

        this.updateRateLimit(response.headers)

        if (response.data.items.length === 0) break

        for (const item of response.data.items) {
          const repoName = item.repository_url.split('/').slice(-2).join('/')
          results.push({
            entityType: 'issue',
            entityId: item.number.toString(),
            title: item.title,
            url: item.html_url,
            repository: repoName,
            repositoryUrl: `https://github.com/${repoName}`,
            excerpt: item.body?.substring(0, 500),
            matchedTerms: [query],
            createdAt: item.created_at ? new Date(item.created_at) : undefined,
            updatedAt: item.updated_at ? new Date(item.updated_at) : undefined,
          })
        }

        if (response.data.items.length < 100) break
        page++
      } catch (error: any) {
        if (error.status === 403) {
          throw new Error('Rate limited')
        }
        throw error
      }
    }

    return results
  }

  /**
   * Searches GitHub pull requests
   */
  async searchPullRequests(query: string, createdAfter?: Date): Promise<GitHubSearchResult[]> {
    let searchQuery = `${query} is:pr`
    if (createdAfter) {
      const dateStr = createdAfter.toISOString().split('T')[0]
      searchQuery += ` created:>${dateStr}`
    }

    const results: GitHubSearchResult[] = []
    let page = 1
    const maxPages = 10

    while (page <= maxPages) {
      try {
        const response = await this.octokit.rest.search.issuesAndPullRequests({
          q: searchQuery,
          per_page: 100,
          page,
          sort: 'updated',
          order: 'desc',
        })

        this.updateRateLimit(response.headers)

        if (response.data.items.length === 0) break

        for (const item of response.data.items) {
          const repoName = item.repository_url.split('/').slice(-2).join('/')
          results.push({
            entityType: 'pr',
            entityId: item.number.toString(),
            title: item.title,
            url: item.html_url,
            repository: repoName,
            repositoryUrl: `https://github.com/${repoName}`,
            excerpt: item.body?.substring(0, 500),
            matchedTerms: [query],
            createdAt: item.created_at ? new Date(item.created_at) : undefined,
            updatedAt: item.updated_at ? new Date(item.updated_at) : undefined,
          })
        }

        if (response.data.items.length < 100) break
        page++
      } catch (error: any) {
        if (error.status === 403) {
          throw new Error('Rate limited')
        }
        throw error
      }
    }

    return results
  }

  /**
   * Extracts matched terms from GitHub text matches
   */
  private extractMatchedTerms(textMatches: any[]): string[] {
    const terms = new Set<string>()
    for (const match of textMatches) {
      if (match.matches) {
        for (const m of match.matches) {
          if (m.text) {
            terms.add(m.text.toLowerCase())
          }
        }
      }
    }
    return Array.from(terms)
  }

  /**
   * Generates a dedupe key for a result
   */
  static generateDedupeKey(
    entityType: 'code' | 'repo' | 'issue' | 'pr',
    repository: string,
    entityId: string,
    sha?: string
  ): string {
    let key = `${repository}:${entityType}:${entityId}`
    if (sha) {
      key += `:${sha}`
    }
    return createHash('sha256').update(key).digest('hex')
  }
}
