'use client'

import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

interface Monitor {
  id: string
  name: string
  queryType: string
  intervalMinutes: number
  enabled: boolean
  status: string
  lastRunAt: string | null
  nextRunAt: string | null
  errorMessage: string | null
  resultsCount?: number
}

export function MonitorsList({ monitors, onUpdate }: { monitors: Monitor[]; onUpdate: () => void }) {
  const handleToggle = async (id: string, enabled: boolean) => {
    await fetch(`/api/monitors/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ enabled: !enabled }),
    })
    onUpdate()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this monitor?')) return
    await fetch(`/api/monitors/${id}`, { 
      method: 'DELETE',
      credentials: 'include',
    })
    onUpdate()
  }

  if (monitors.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <p className="text-gray-500 mb-4">No monitors yet. Create one to get started.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {monitors.map((monitor) => (
        <div key={monitor.id} className="border rounded-lg p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-semibold">{monitor.name}</h3>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    monitor.enabled
                      ? monitor.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {monitor.enabled ? monitor.status : 'paused'}
                </span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>
                  Type: <span className="font-medium">{monitor.queryType}</span> • Interval:{' '}
                  <span className="font-medium">{monitor.intervalMinutes} minutes</span>
                </p>
                {monitor.lastRunAt && (
                  <p>
                    Last run:{' '}
                    <span className="font-medium">
                      {formatDistanceToNow(new Date(monitor.lastRunAt), { addSuffix: true })}
                    </span>
                  </p>
                )}
                {monitor.nextRunAt && (
                  <p>
                    Next run:{' '}
                    <span className="font-medium">
                      {formatDistanceToNow(new Date(monitor.nextRunAt), { addSuffix: true })}
                    </span>
                  </p>
                )}
                {monitor.errorMessage && (
                  <p className="text-red-600">Error: {monitor.errorMessage}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/monitors/${monitor.id}`}>
                <Button variant="outline" size="sm">
                  View
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggle(monitor.id, monitor.enabled)}
              >
                {monitor.enabled ? 'Pause' : 'Resume'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDelete(monitor.id)}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
