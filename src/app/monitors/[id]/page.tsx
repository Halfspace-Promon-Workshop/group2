'use client'

import { Navbar } from '@/components/layout/navbar'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

async function fetchMonitor(id: string) {
  const res = await fetch(`/api/monitors/${id}`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Failed to fetch monitor')
  return res.json()
}

export default function MonitorDetailPage() {
  const params = useParams()
  const id = params.id as string

  const { data: monitor, isLoading, refetch } = useQuery({
    queryKey: ['monitor', id],
    queryFn: () => fetchMonitor(id),
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

  if (!monitor) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Monitor not found</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link href="/monitors" className="text-blue-600 hover:underline">
            ← Back to Monitors
          </Link>
        </div>

        <div className="border rounded-lg p-6 space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{monitor.name}</h1>
              <span
                className={`px-3 py-1 text-sm rounded ${
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
          </div>

          <div>
            <h2 className="font-semibold mb-2">Configuration</h2>
            <div className="bg-gray-50 rounded p-4 space-y-2 text-sm">
              <div>
                <span className="font-medium">Query Type:</span> <span className="capitalize">{monitor.queryType}</span>
              </div>
              <div>
                <span className="font-medium">Interval:</span> {monitor.intervalMinutes} minutes
              </div>
              <div>
                <span className="font-medium">Search Surfaces:</span>{' '}
                {(monitor.searchSurfaces as string[]).map((s) => s).join(', ')}
              </div>
              <div>
                <span className="font-medium">Notification Threshold:</span> Severity ≥ {monitor.notificationThreshold}
              </div>
            </div>
          </div>

          <div>
            <h2 className="font-semibold mb-2">Status</h2>
            <div className="bg-gray-50 rounded p-4 space-y-2 text-sm">
              {monitor.lastRunAt && (
                <div>
                  <span className="font-medium">Last Run:</span>{' '}
                  {formatDistanceToNow(new Date(monitor.lastRunAt), { addSuffix: true })}
                </div>
              )}
              {monitor.nextRunAt && (
                <div>
                  <span className="font-medium">Next Run:</span>{' '}
                  {formatDistanceToNow(new Date(monitor.nextRunAt), { addSuffix: true })}
                </div>
              )}
              {monitor.errorMessage && (
                <div className="text-red-600">
                  <span className="font-medium">Error:</span> {monitor.errorMessage}
                </div>
              )}
            </div>
          </div>

          {monitor.runs && monitor.runs.length > 0 && (
            <div>
              <h2 className="font-semibold mb-2">Recent Runs</h2>
              <div className="space-y-2">
                {monitor.runs.slice(0, 10).map((run: any) => (
                  <div key={run.id} className="border rounded p-3 text-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">
                          {formatDistanceToNow(new Date(run.startedAt), { addSuffix: true })}
                        </span>
                        <span className={`ml-2 px-2 py-1 text-xs rounded ${
                          run.status === 'completed' ? 'bg-green-100 text-green-800' :
                          run.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {run.status}
                        </span>
                      </div>
                      <div className="text-gray-600">
                        {run.resultsNew} new / {run.resultsFound} total
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Link href={`/results?monitorId=${monitor.id}`}>
              <Button variant="outline">View Results</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
