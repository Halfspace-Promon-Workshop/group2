'use client'

import { Navbar } from '@/components/layout/navbar'
import { MonitorsList } from '@/components/monitors/monitors-list'
import { CreateMonitorDialog } from '@/components/monitors/create-monitor-dialog'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'

async function fetchMonitors() {
  const res = await fetch('/api/monitors', {
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Failed to fetch monitors')
  return res.json()
}

export default function MonitorsPage() {
  const { data: monitors = [], isLoading, refetch } = useQuery({
    queryKey: ['monitors'],
    queryFn: fetchMonitors,
  })

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Monitors</h1>
          <CreateMonitorDialog onSuccess={() => refetch()} />
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading monitors...</div>
        ) : (
          <MonitorsList monitors={monitors} onUpdate={refetch} />
        )}
      </div>
    </div>
  )
}
