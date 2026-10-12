'use client'
import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import type { PrayerRow, PrayerStatus } from '@/lib/db'

type Counts = Record<PrayerStatus, number>

const TABS: Array<{ key: PrayerStatus; label: string }> = [
  { key: 'pending', label: 'Needs review' },
  { key: 'approved', label: 'On the wall' },
  { key: 'rejected', label: 'Hidden' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function sourceLabel(s: PrayerRow['moderated_by']) {
  switch (s) {
    case 'ai': return 'AI check'
    case 'rules': return 'Word rules'
    case 'staff': return 'Staff'
    case 'legacy': return 'Before review'
    default: return 'Not yet checked'
  }
}

export default function AdminPanel() {
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')

  const [tab, setTab] = useState<PrayerStatus>('pending')
  const [prayers, setPrayers] = useState<PrayerRow[]>([])
  const [counts, setCounts] = useState<Counts>({ pending: 0, approved: 0, rejected: 0 })
  const [ai, setAi] = useState<{ enabled: boolean; model: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/login')
      .then(r => r.json())
      .then(d => { setConfigured(Boolean(d.configured)); setAuthed(Boolean(d.authenticated)) })
      .catch(() => setConfigured(false))
  }, [])

  const load = useCallback(async (status: PrayerStatus) => {
    setLoading(true)
    setError('')
    try {
      const r = await fetch(`/api/admin/prayers?status=${status}`, { cache: 'no-store' })
      if (r.status === 401) { setAuthed(false); return }
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed to load')
      setPrayers(d.prayers)
      setCounts(d.counts)
      setAi(d.ai)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authed) load(tab)
  }, [authed, tab, load])

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')
    const r = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (r.ok) { setAuthed(true); setPassword('') }
    else setLoginError((await r.json()).error || 'Could not sign in')
  }

  const logout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' })
    setAuthed(false)
  }

  const setStatus = async (id: string, status: PrayerStatus) => {
    setBusy(id)
    try {
      const r = await fetch('/api/admin/prayers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Update failed')
      setPrayers(p => p.filter(x => x.id !== id))
      setCounts(d.counts)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setBusy(null)
    }
  }

  // ---------------------------------------------------------------------
  if (configured === null) {
    return <div className="min-h-screen bg-paper" />
  }

  if (configured === false) {
    return (
      <Shell>
        <div className="mx-auto max-w-xl rounded-[14px] border border-line bg-white p-8">
          <h1 className="font-heading text-2xl font-bold text-navy">Staff review is not set up</h1>
          <p className="mt-3 text-muted">
            Add an <code className="rounded bg-cream px-1">ADMIN_PASSWORD</code> environment
            variable in Vercel and redeploy to turn on this page.
          </p>
        </div>
      </Shell>
    )
  }

  if (!authed) {
    return (
      <Shell>
        <form onSubmit={login} className="mx-auto max-w-sm rounded-[14px] border border-line bg-white p-8">
          <h1 className="font-heading text-2xl font-bold text-navy">Staff sign in</h1>
          <label className="mt-6 block text-sm font-semibold text-ink" htmlFor="pw">Password</label>
          <input
            id="pw"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="mt-2 w-full rounded-[10px] border border-line bg-white px-4 py-3 text-ink outline-none focus:border-navy focus:ring-[3px] focus:ring-navy/20"
            autoFocus
          />
          {loginError && <p className="mt-3 text-sm text-rust-solid">{loginError}</p>}
          <button type="submit" className="btn-primary mt-6 w-full">Sign in</button>
        </form>
      </Shell>
    )
  }

  return (
    <Shell onLogout={logout}>
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-[14px] border border-line bg-white px-5 py-4">
        <span className="eyebrow text-rust-solid">Show</span>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`chip ${tab === t.key ? 'chip-active' : ''}`}
          >
            {t.label}
            <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 text-xs tabular-nums">{counts[t.key]}</span>
          </button>
        ))}
        <span className="ml-auto text-sm text-muted">
          {ai?.enabled ? `AI check on (${ai.model})` : 'AI check off: word rules only'}
        </span>
      </div>

      {error && <p className="mb-4 text-sm text-rust-solid">{error}</p>}

      {loading && prayers.length === 0 ? (
        <p className="text-muted">Loading…</p>
      ) : prayers.length === 0 ? (
        <div className="rounded-[14px] border border-dashed border-line bg-white p-8 text-center text-muted">
          {tab === 'pending' ? 'Nothing waiting for review.' : 'Nothing here.'}
        </div>
      ) : (
        <ul className="space-y-3">
          {prayers.map(p => {
            const pastoral = p.flags.includes('pastoral')
            return (
              <li key={p.id} className="rounded-[14px] border border-line bg-white p-5">
                <p className="font-heading text-lg leading-relaxed text-ink">{p.content}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
                  <span>{formatDate(p.created_at)}</span>
                  <span>{sourceLabel(p.moderated_by)}</span>
                  {p.moderation_reason && <span className="italic">{p.moderation_reason}</span>}
                </div>
                {(p.flags.length > 0) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {pastoral && <span className="badge badge-rust">May need a call</span>}
                    {p.flags.filter(f => f !== 'pastoral').map(f => (
                      <span key={f} className="badge">{f}</span>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {tab !== 'approved' && (
                    <button disabled={busy === p.id} onClick={() => setStatus(p.id, 'approved')} className="btn-primary btn-sm">
                      Show on wall
                    </button>
                  )}
                  {tab !== 'rejected' && (
                    <button disabled={busy === p.id} onClick={() => setStatus(p.id, 'rejected')} className="btn-ghost btn-sm">
                      Hide
                    </button>
                  )}
                  {tab === 'rejected' && (
                    <button disabled={busy === p.id} onClick={() => setStatus(p.id, 'pending')} className="btn-ghost btn-sm">
                      Move to review
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Shell>
  )
}

function Shell({ children, onLogout }: { children: React.ReactNode; onLogout?: () => void }) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="bg-navy">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
          <div className="flex items-center gap-4">
            <Image src="/images/Saint-Helen-Submark-White.png" alt="Saint Helen" width={200} height={34} className="h-7 w-auto" priority />
            <span className="hidden text-sm text-white/70 sm:inline">Prayer Wall · Staff review</span>
          </div>
          {onLogout && (
            <button onClick={onLogout} className="text-sm text-white/80 underline-offset-4 hover:underline">Sign out</button>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
    </div>
  )
}
