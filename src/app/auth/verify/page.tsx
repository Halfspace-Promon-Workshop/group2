'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function VerifyPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      // The API route will handle the verification and redirect
      window.location.href = `/api/auth/verify?token=${token}`
    } else {
      router.push('/auth/login?error=no_token')
    }
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p>Verifying your email...</p>
      </div>
    </div>
  )
}
