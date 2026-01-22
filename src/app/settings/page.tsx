'use client'

import { Navbar } from '@/components/layout/navbar'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

async function getTokenStatus() {
  const res = await fetch('/api/github-token', {
    credentials: 'include',
  })
  if (!res.ok) return null
  return res.json()
}

export default function SettingsPage() {
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushSubscribed, setPushSubscribed] = useState(false)

  const { data: tokenStatus, refetch: refetchToken } = useQuery({
    queryKey: ['github-token'],
    queryFn: getTokenStatus,
  })

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setPushSubscribed(!!subscription)
        })
      })
    }
  }, [])

  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const res = await fetch('/api/github-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token }),
      })

      const data = await res.json()

      if (res.ok) {
        setMessage('Token saved successfully')
        setToken('')
        refetchToken()
      } else {
        setMessage(data.error || 'Failed to save token')
      }
    } catch (error) {
      setMessage('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleEnablePush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications are not supported in this browser')
      return
    }

    try {
      // Get VAPID public key
      const res = await fetch('/api/notifications/vapid-public-key', {
        credentials: 'include',
      })
      const { publicKey } = await res.json()

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js')
      await registration.update()

      // Request permission
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        alert('Notification permission denied')
        return
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: Uint8Array.from(atob(publicKey), (c) => c.charCodeAt(0)),
      })

      // Send subscription to server
      const key = subscription.getKey('p256dh')
      const auth = subscription.getKey('auth')
      
      const subscribeRes = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: key ? btoa(String.fromCharCode(...new Uint8Array(key))) : '',
            auth: auth ? btoa(String.fromCharCode(...new Uint8Array(auth))) : '',
          },
        }),
      })

      if (!subscribeRes.ok) {
        const error = await subscribeRes.json()
        console.error('Failed to save subscription:', error)
        throw new Error(error.error || 'Failed to save subscription')
      }

      const result = await subscribeRes.json()
      console.log('Push notification subscription saved:', result)
      setPushSubscribed(true)
      setMessage('Push notifications enabled successfully! You will now receive notifications for high-severity results.')
    } catch (error) {
      console.error('Error enabling push:', error)
      alert('Failed to enable push notifications')
    }
  }

  const handleDisablePush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()
        await fetch(`/api/notifications/subscribe?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
          method: 'DELETE',
          credentials: 'include',
        })
        setPushSubscribed(false)
        setMessage('Push notifications disabled')
      }
    } catch (error) {
      console.error('Error disabling push:', error)
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>

        <div className="space-y-8">
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">GitHub Token</h2>
            <p className="text-sm text-gray-600 mb-4">
              Add your GitHub Personal Access Token to enable searches. Create one at{' '}
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                github.com/settings/tokens
              </a>
            </p>
            {tokenStatus?.hasToken && (
              <p className="text-sm text-green-600 mb-4">
                Token configured (created {tokenStatus.createdAt ? new Date(tokenStatus.createdAt).toLocaleDateString() : 'recently'})
              </p>
            )}
            <form onSubmit={handleSaveToken} className="space-y-4">
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_..."
                className="w-full px-3 py-2 border rounded-md"
              />
              <Button type="submit" disabled={loading || !token}>
                {loading ? 'Saving...' : 'Save Token'}
              </Button>
            </form>
            {message && (
              <p className={`mt-2 text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                {message}
              </p>
            )}
          </div>

          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Push Notifications</h2>
            <p className="text-sm text-gray-600 mb-4">
              Enable browser push notifications to get alerts for new high-severity results.
            </p>
            {pushSubscribed ? (
              <div>
                <p className="text-sm text-green-600 mb-4">Push notifications are enabled</p>
                <Button variant="outline" onClick={handleDisablePush}>
                  Disable Push Notifications
                </Button>
              </div>
            ) : (
              <Button onClick={handleEnablePush}>Enable Push Notifications</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
