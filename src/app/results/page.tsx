'use client'

import { Navbar } from '@/components/layout/navbar'
import { ResultsTable } from '@/components/results/results-table'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

async function fetchResults(filters: any) {
  const params = new URLSearchParams()
  if (filters.monitorId) params.append('monitorId', filters.monitorId)
  if (filters.severity) params.append('severity', filters.severity)
  if (filters.status) params.append('status', filters.status)
  if (filters.entityType) params.append('entityType', filters.entityType)
  if (filters.page) params.append('page', filters.page.toString())

  const res = await fetch(`/api/results?${params}`, {
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Failed to fetch results')
  return res.json()
}

export default function ResultsPage() {
  const [filters, setFilters] = useState({
    monitorId: '',
    severity: '',
    status: '',
    entityType: '',
    page: 1,
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['results', filters],
    queryFn: () => fetchResults(filters),
  })

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Results</h1>

        <div className="mb-6 flex gap-4 flex-wrap">
          <select
            value={filters.severity}
            onChange={(e) => setFilters({ ...filters, severity: e.target.value, page: 1 })}
            className="px-3 py-2 border rounded-md"
          >
            <option value="">All Severities</option>
            <option value="1">Severity 1</option>
            <option value="2">Severity 2</option>
            <option value="3">Severity 3</option>
            <option value="4">Severity 4</option>
            <option value="5">Severity 5</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            className="px-3 py-2 border rounded-md"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="seen">Seen</option>
            <option value="triaged">Triaged</option>
            <option value="false_positive">False Positive</option>
          </select>

          <select
            value={filters.entityType}
            onChange={(e) => setFilters({ ...filters, entityType: e.target.value, page: 1 })}
            className="px-3 py-2 border rounded-md"
          >
            <option value="">All Types</option>
            <option value="code">Code</option>
            <option value="repo">Repository</option>
            <option value="issue">Issue</option>
            <option value="pr">Pull Request</option>
          </select>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading results...</div>
        ) : (
          <ResultsTable
            results={data?.results || []}
            pagination={data?.pagination}
            onUpdate={refetch}
            onPageChange={(page) => setFilters({ ...filters, page })}
          />
        )}
      </div>
    </div>
  )
}
