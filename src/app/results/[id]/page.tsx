'use client'

import { Navbar } from '@/components/layout/navbar'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'

async function fetchResult(id: string) {
  const res = await fetch(`/api/results/${id}`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Failed to fetch result')
  return res.json()
}

export default function ResultDetailPage() {
  const params = useParams()
  const id = params.id as string

  const { data: result, isLoading } = useQuery({
    queryKey: ['result', id],
    queryFn: () => fetchResult(id),
  })

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Result not found</div>
        </div>
      </div>
    )
  }

  const getSeverityColor = (severity: number) => {
    if (severity >= 4) return 'bg-red-100 text-red-800'
    if (severity >= 3) return 'bg-orange-100 text-orange-800'
    if (severity >= 2) return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <a href="/results" className="text-blue-600 hover:underline">
            ← Back to Results
          </a>
        </div>

        <div className="border rounded-lg p-6 space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{result.title}</h1>
              <span
                className={`px-3 py-1 text-sm rounded font-medium ${getSeverityColor(result.severity)}`}
              >
                Severity {result.severity}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Found {formatDistanceToNow(new Date(result.createdAt), { addSuffix: true })} •{' '}
              {result.monitor.name}
            </p>
          </div>

          <div>
            <h2 className="font-semibold mb-2">Details</h2>
            <div className="bg-gray-50 rounded p-4 space-y-2 text-sm">
              <div>
                <span className="font-medium">Type:</span> <span className="capitalize">{result.entityType}</span>
              </div>
              <div>
                <span className="font-medium">Repository:</span>{' '}
                <a
                  href={result.repositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {result.repository}
                </a>
              </div>
              {result.path && (
                <div>
                  <span className="font-medium">Path:</span> {result.path}
                </div>
              )}
              <div>
                <span className="font-medium">URL:</span>{' '}
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {result.url}
                </a>
              </div>
              <div>
                <span className="font-medium">Status:</span> <span className="capitalize">{result.status}</span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-semibold mb-2">Severity Explanation</h2>
            <p className="text-sm text-gray-700 bg-yellow-50 p-4 rounded">{result.severityExplanation}</p>
          </div>

          {result.excerpt && (
            <div>
              <h2 className="font-semibold mb-2">Excerpt</h2>
              <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto whitespace-pre-wrap">
                {result.excerpt}
              </pre>
            </div>
          )}

          {result.matchedTerms && result.matchedTerms.length > 0 && (
            <div>
              <h2 className="font-semibold mb-2">Matched Terms</h2>
              <div className="flex flex-wrap gap-2">
                {(result.matchedTerms as string[]).map((term, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                    {term}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
