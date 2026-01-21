'use client'

import { Navbar } from '@/components/layout/navbar'
import { ResultsTable } from '@/components/results/results-table'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

async function fetchResults(filters: any) {
  const params = new URLSearchParams()
  if (filters.monitorId) params.append('monitorId', filters.monitorId)
  if (filters.severity) params.append('severity', filters.severity)
  if (filters.status) params.append('status', filters.status)
  if (filters.entityType) params.append('entityType', filters.entityType)
  if (filters.search) params.append('search', filters.search)
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
    search: '',
    page: 1,
  })
  const [isRecalculating, setIsRecalculating] = useState(false)
  const [isClearingDedupe, setIsClearingDedupe] = useState(false)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['results', filters],
    queryFn: () => fetchResults(filters),
  })

  const handleRecalculateSeverity = async () => {
    if (!confirm('Recalculate severity for all results? This will update severity scores based on the latest rules.')) {
      return
    }

    setIsRecalculating(true)
    try {
      const res = await fetch('/api/results', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'recalculate-severity' }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to recalculate severity')
      }

      const result = await res.json()
      // Refetch results to update the UI
      refetch()
      alert(result.message || 'Severity recalculation completed successfully.')
    } catch (error: any) {
      alert(`Error recalculating severity: ${error.message}`)
    } finally {
      setIsRecalculating(false)
    }
  }

  const handleClearDedupeKeys = async () => {
    if (!confirm('Clear deduplication keys? This will allow the monitor to find results again even if they were seen before. Continue?')) {
      return
    }

    setIsClearingDedupe(true)
    try {
      const res = await fetch('/api/results', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'clear-dedupe-keys' }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to clear dedupe keys')
      }

      const result = await res.json()
      alert(result.message || 'Dedupe keys cleared successfully. Run the monitor again to find results.')
    } catch (error: any) {
      alert(`Error clearing dedupe keys: ${error.message}`)
    } finally {
      setIsClearingDedupe(false)
    }
  }

  const handleDeleteAll = async () => {
    if (!confirm('Are you sure you want to delete all results? This action cannot be undone.')) {
      return
    }

    try {
      const res = await fetch('/api/results', {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete results')
      }

      // Refetch results to update the UI
      refetch()
      alert('All results have been deleted successfully.')
    } catch (error: any) {
      alert(`Error deleting results: ${error.message}`)
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Results</h1>
          {data && data.results && data.results.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRecalculateSeverity}
                disabled={isRecalculating}
              >
                {isRecalculating ? 'Recalculating...' : 'Recalculate Severity'}
              </Button>
              <Button
                variant="outline"
                onClick={handleClearDedupeKeys}
                disabled={isClearingDedupe}
                title="Clear deduplication keys to allow finding results again"
              >
                {isClearingDedupe ? 'Clearing...' : 'Clear Dedupe Keys'}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteAll}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete All Results
              </Button>
            </div>
          )}
        </div>

        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="w-full">
            <input
              type="text"
              placeholder="Search results by title, repository, content..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="w-full max-w-md px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-4 flex-wrap">
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

            {filters.search && (
              <button
                onClick={() => setFilters({ ...filters, search: '', page: 1 })}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear search
              </button>
            )}
          </div>
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
