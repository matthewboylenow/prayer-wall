import type { Metadata } from 'next'
import AdminPanel from '@/components/AdminPanel'

export const metadata: Metadata = {
  title: 'Prayer Wall: Staff Review',
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  return <AdminPanel />
}
