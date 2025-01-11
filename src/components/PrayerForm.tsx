'use client'
import { useState } from 'react'
import Image from 'next/image'

const BLOCKED_WORDS = [
  'damn', 'hell', 'shit', 'fuck', 'ass', 'bitch', 'crap', 'piss',
  'bastard', 'slut', 'whore', 'dick', 'cock', 'pussy'
].map(word => word.toLowerCase());

const containsBlockedWords = (text: string): boolean => {
  const words = text.toLowerCase().split(/\s+/);
  return words.some(word => BLOCKED_WORDS.includes(word));
}

export default function PrayerForm() {
  const [prayer, setPrayer] = useState('')
  const [showThanks, setShowThanks] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (containsBlockedWords(prayer)) {
      setError('Please revise your prayer to remove inappropriate language.')
      return
    }
    
    setError('')
    setIsAnimating(true)
    
    try {
      await fetch('/api/submit-prayer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prayer })
      })
      
      setPrayer('')
      setShowThanks(true)
      setTimeout(() => {
        setShowThanks(false)
        setIsAnimating(false)
      }, 3000)
    } catch (err) {
      console.error('Error:', err)
      setIsAnimating(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
      <div className={`transition-opacity duration-500 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
        {showThanks ? (
          <div className="text-center">
            <Image
              src="https://sainthelen.org/wp-content/uploads/2025/01/Saint-Helen-Logo-Submark-Vector-Black.png"
              alt="Saint Helen Logo"
              width={400}
              height={67}
              className="w-auto h-16 mx-auto mb-6"
            />
            <div className="text-4xl mb-6">🙏</div>
            <h2 className="text-3xl font-bold mb-4 text-blue-900">Prayer Received</h2>
            <p className="text-slate-800">Your prayer has been added to our wall</p>
          </div>
        ) : (
          <div className="w-full max-w-lg">
            <div className="text-center mb-8">
              <Image
                src="https://sainthelen.org/wp-content/uploads/2025/01/Saint-Helen-Logo-Submark-Vector-Black.png"
                alt="Saint Helen Logo"
                width={400}
                height={67}
                className="w-auto h-16 mx-auto mb-4"
              />
              <h1 className="text-3xl text-blue-900 font-bold">Share Your Prayer</h1>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <textarea
                  value={prayer}
                  onChange={(e) => setPrayer(e.target.value)}
                  className="w-full h-40 p-4 text-xl border rounded-lg text-slate-800 border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all duration-200"
                  placeholder="Type your prayer intention..."
                  required
                  style={{
                    fontSize: '18px',
                    lineHeight: '1.5',
                    WebkitAppearance: 'none',
                    borderRadius: '12px'
                  }}
                />
                {error && (
                  <p className="text-red-600 mt-2 text-center">{error}</p>
                )}
              </div>
              <button 
                type="submit"
                className="w-full bg-blue-900 text-white py-5 rounded-xl hover:bg-blue-800 transition-all duration-200 text-xl font-semibold active:bg-blue-950"
                style={{
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation'
                }}
              >
                Submit Prayer
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}