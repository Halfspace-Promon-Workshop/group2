'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function CreateMonitorDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    queryType: 'keyword' as 'keyword' | 'collection' | 'standard',
    keyword: '',
    words: '',
    searchSurfaces: ['code'] as string[],
    intervalMinutes: '60',
    notificationThreshold: 3,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let queryConfig: any = {}
      if (formData.queryType === 'keyword') {
        queryConfig = { keyword: formData.keyword }
      } else if (formData.queryType === 'collection') {
        queryConfig = { words: formData.words.split(',').map((w) => w.trim()) }
      } else {
        queryConfig = { template: 'standard' }
      }

      const res = await fetch('/api/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          queryType: formData.queryType,
          queryConfig,
          searchSurfaces: formData.searchSurfaces,
          intervalMinutes: formData.intervalMinutes,
          notificationThreshold: formData.notificationThreshold,
        }),
      })

      if (res.ok) {
        setOpen(false)
        onSuccess()
        setFormData({
          name: '',
          queryType: 'keyword',
          keyword: '',
          words: '',
          searchSurfaces: ['code'],
          intervalMinutes: '60',
          notificationThreshold: 3,
        })
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to create monitor')
      }
    } catch (error) {
      alert('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>Create Monitor</Button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Create Monitor</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Query Type</label>
            <select
              value={formData.queryType}
              onChange={(e) =>
                setFormData({ ...formData, queryType: e.target.value as any })
              }
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="keyword">Single Keyword</option>
              <option value="collection">Collection of Words</option>
              <option value="standard">Standard Search</option>
            </select>
          </div>

          {formData.queryType === 'keyword' && (
            <div>
              <label className="block text-sm font-medium mb-1">Keyword</label>
              <input
                type="text"
                required
                value={formData.keyword}
                onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g., Shield bypass"
              />
            </div>
          )}

          {formData.queryType === 'collection' && (
            <div>
              <label className="block text-sm font-medium mb-1">Words (comma-separated)</label>
              <input
                type="text"
                required
                value={formData.words}
                onChange={(e) => setFormData({ ...formData, words: e.target.value })}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="bypass, workaround, exploit"
              />
            </div>
          )}

          {formData.queryType === 'standard' && (
            <div className="p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">
                Standard search: &quot;Shield&quot; (bypass OR workaround OR exploit OR poc)
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Search Surfaces</label>
            <div className="space-y-2">
              {['code', 'repo', 'issues', 'prs'].map((surface) => (
                <label key={surface} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.searchSurfaces.includes(surface)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          searchSurfaces: [...formData.searchSurfaces, surface],
                        })
                      } else {
                        setFormData({
                          ...formData,
                          searchSurfaces: formData.searchSurfaces.filter((s) => s !== surface),
                        })
                      }
                    }}
                  />
                  <span className="capitalize">{surface}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Interval</label>
            <select
              value={formData.intervalMinutes}
              onChange={(e) => setFormData({ ...formData, intervalMinutes: e.target.value })}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="5">5 minutes</option>
              <option value="15">15 minutes</option>
              <option value="60">1 hour</option>
              <option value="360">6 hours</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Notification Threshold (severity ≥ N)
            </label>
            <input
              type="number"
              min="1"
              max="5"
              value={formData.notificationThreshold}
              onChange={(e) =>
                setFormData({ ...formData, notificationThreshold: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
