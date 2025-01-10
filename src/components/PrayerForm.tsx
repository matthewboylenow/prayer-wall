'use client'
import { useState } from 'react'

export default function PrayerForm() {
  const [prayer, setPrayer] = useState('')
  const [showThanks, setShowThanks] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await fetch('/api/submit-prayer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prayer })
      })
      
      setPrayer('')
      setShowThanks(true)
      setTimeout(() => setShowThanks(false), 3000)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      {showThanks ? (
        <div className="text-center">
          <div className="text-4xl mb-6">🙏</div>
          <h2 className="text-3xl font-bold mb-4 text-blue-900">Prayer Received</h2>
          <p className="text-slate-800">Your prayer has been added to our wall</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-4">
          <h1 className="text-3xl text-center mb-6 text-blue-900 font-bold">Share Your Prayer</h1>
          <textarea
            value={prayer}
            onChange={(e) => setPrayer(e.target.value)}
            className="w-full h-48 p-4 text-lg border rounded-lg text-slate-800 border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Type your prayer intention..."
            required
          />
          <button className="w-full bg-blue-900 text-white py-4 rounded-lg hover:bg-blue-800 transition-colors text-lg font-semibold">
            Submit Prayer
          </button>
        </form>
      )}
    </div>
  )
}