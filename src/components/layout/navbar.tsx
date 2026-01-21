'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useQuery } from '@tanstack/react-query'

async function getCurrentUser() {
  const res = await fetch('/api/auth/me', {
    credentials: 'include',
  })
  if (!res.ok) return null
  return res.json()
}

export function Navbar() {
  const router = useRouter()
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: getCurrentUser,
  })

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { 
      method: 'POST',
      credentials: 'include',
    })
    router.push('/auth/login')
    router.refresh()
  }

  if (!user) {
    return (
      <nav className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold">
            Shield Monitor
          </Link>
          <Link href="/auth/login">
            <Button variant="outline">Login</Button>
          </Link>
        </div>
      </nav>
    )
  }

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex gap-6 items-center">
          <Link href="/" className="text-xl font-bold">
            Shield Monitor
          </Link>
          <Link href="/monitors" className="text-sm hover:underline">
            Monitors
          </Link>
          <Link href="/results" className="text-sm hover:underline">
            Results
          </Link>
          <Link href="/settings" className="text-sm hover:underline">
            Settings
          </Link>
        </div>
        <div className="flex gap-4 items-center">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </nav>
  )
}
