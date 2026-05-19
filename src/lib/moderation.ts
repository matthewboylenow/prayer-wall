export const BLOCKED_WORDS = [
  'damn', 'hell', 'shit', 'fuck', 'ass', 'bitch', 'crap', 'piss',
  'bastard', 'slut', 'whore', 'dick', 'cock', 'pussy',
].map(w => w.toLowerCase())

export function containsBlockedWords(text: string): boolean {
  const words = text.toLowerCase().split(/\s+/)
  return words.some(w => BLOCKED_WORDS.includes(w))
}

export const MAX_PRAYER_LENGTH = 300
