'use client'

import { useState } from 'react'
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
  const [triggering, setTriggering] = useState<Record<string, boolean>>({})

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

  const handleTrigger = async (id: string) => {
    setTriggering({ ...triggering, [id]: true })
    try {
      const res = await fetch(`/api/monitors/${id}/trigger`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json()
      if (res.ok) {
        alert('Monitor triggered! Check the Results page in a few moments.')
        // Refresh after a short delay to show updated status
        setTimeout(() => {
          onUpdate()
        }, 2000)
      } else {
        alert(data.error || 'Failed to trigger monitor')
      }
    } catch (error) {
      alert('An error occurred while triggering the monitor')
    } finally {
      setTriggering({ ...triggering, [id]: false })
    }
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
                  <div className={`mt-2 p-3 border rounded ${
                    monitor.errorMessage.includes('Rate limit') 
                      ? 'bg-yellow-50 border-yellow-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <p className={`font-medium ${
                      monitor.errorMessage.includes('Rate limit') 
                        ? 'text-yellow-800' 
                        : 'text-red-800'
                    }`}>
                      {monitor.errorMessage.includes('Rate limit') ? '⚠️ ' : 'Error: '}
                      {monitor.errorMessage}
                    </p>
                    {monitor.errorMessage.includes('GitHub token') && (
                      <p className="text-sm text-red-600 mt-1">
                        <Link href="/settings" className="underline">
                          Add your GitHub token in Settings
                        </Link>
                      </p>
                    )}
                    {monitor.errorMessage.includes('Rate limit') && (
                      <p className="text-sm text-yellow-700 mt-1">
                        The monitor will automatically resume when the rate limit resets. You can also try "Run Now" after waiting a few minutes.
                      </p>
                    )}
                  </div>
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
                onClick={() => handleTrigger(monitor.id)}
                disabled={triggering[monitor.id] || !monitor.enabled}
                title={!monitor.enabled ? 'Enable the monitor first' : 'Run search now'}
              >
                {triggering[monitor.id] ? 'Running...' : 'Run Now'}
              </Button>
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
