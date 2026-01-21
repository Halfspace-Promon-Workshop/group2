'use client'

import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface Result {
  id: string
  title: string
  url: string
  repository: string
  entityType: string
  severity: number
  status: string
  createdAt: string
  monitor: {
    id: string
    name: string
  }
}

export function ResultsTable({
  results,
  pagination,
  onUpdate,
  onPageChange,
}: {
  results: Result[]
  pagination?: any
  onUpdate: () => void
  onPageChange: (page: number) => void
}) {
  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/results/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    })
    onUpdate()
  }

  const getSeverityColor = (severity: number) => {
    if (severity >= 4) return 'bg-red-100 text-red-800'
    if (severity >= 3) return 'bg-orange-100 text-orange-800'
    if (severity >= 2) return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
  }

  if (results.length === 0) {
    return <div className="text-center py-12 border rounded-lg">No results found</div>
  }

  return (
    <div>
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Time</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Monitor</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Repository</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Severity</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {results.map((result) => (
              <tr key={result.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-600">
                  {formatDistanceToNow(new Date(result.createdAt), { addSuffix: true })}
                </td>
                <td className="px-4 py-3 text-sm">{result.monitor.name}</td>
                <td className="px-4 py-3 text-sm capitalize">{result.entityType}</td>
                <td className="px-4 py-3 text-sm">
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {result.title.length > 50 ? `${result.title.substring(0, 50)}...` : result.title}
                  </a>
                </td>
                <td className="px-4 py-3 text-sm">{result.repository}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 text-xs rounded font-medium ${getSeverityColor(result.severity)}`}
                  >
                    {result.severity}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm capitalize">{result.status}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link href={`/results/${result.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                    <select
                      value={result.status}
                      onChange={(e) => handleStatusChange(result.id, e.target.value)}
                      className="text-xs px-2 py-1 border rounded"
                    >
                      <option value="new">New</option>
                      <option value="seen">Seen</option>
                      <option value="triaged">Triaged</option>
                      <option value="false_positive">False Positive</option>
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
