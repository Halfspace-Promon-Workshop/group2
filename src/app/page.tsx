import { Navbar } from '@/components/layout/navbar'
import { redirect } from 'next/navigation'

export default async function Home() {
  // For now, redirect to monitors
  redirect('/monitors')
}
