// Rules layer: fast, deterministic checks that run on every submission before
// anything is stored. Produces a verdict plus a list of flags that the AI layer
// and the admin page can both see.
//
// Verdicts:
//   'reject'  hard stop (profanity, slurs, links, spam). Stored as rejected,
//             never shown. The parishioner still sees "received".
//   'review'  held for staff unless the AI layer clears it.
//   'approve' nothing tripped.
//
// A prayer that only trips SENSITIVE words is never rejected by rules; it gets
// a 'pastoral' flag and otherwise follows the normal path.

import {
  REJECT_WORDS,
  REJECT_SUBSTRINGS,
  REVIEW_SUBSTRINGS,
  REVIEW_WORDS,
  SENSITIVE_WORDS,
  PARISH_ALLOW,
} from './blocklist'

export const MAX_PRAYER_LENGTH = 300
export const MIN_PRAYER_LENGTH = 2

export type RulesVerdict = 'approve' | 'review' | 'reject'

export interface RulesResult {
  verdict: RulesVerdict
  flags: string[]
  /** Short human-readable summary for the admin page. */
  reason: string
}

// --------------------------------------------------------------------------
// Normalisation
// --------------------------------------------------------------------------

const LEET: Record<string, string> = {
  '0': 'o', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '4': 'a', '@': 'a',
  '5': 's', '$': 's', '7': 't', '+': 't', '8': 'b', '9': 'g', '6': 'g',
}

function stripDiacritics(s: string): string {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '')
}

/** Map leetspeak inside tokens that also contain letters. Pure numbers stay. */
function mapLeet(s: string): string {
  return s
    .split(/\s+/)
    .map(tok => {
      if (!/[a-z]/.test(tok)) return tok
      // "sh!t!!" -> trailing punctuation is sentence punctuation, not leet.
      const core = tok.replace(/[!?.,;:]+$/, '')
      return core.replace(/[0134578$@!|+69]/g, ch => LEET[ch] ?? ch)
    })
    .join(' ')
}

/** Lowercase, strip accents, map leetspeak, replace punctuation with spaces. */
export function normalizeText(text: string): string {
  const lower = stripDiacritics(text.toLowerCase())
  const leet = mapLeet(lower)
  return leet.replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim()
}

/** "f u c k" / "f.u.c.k" -> "fuck". Runs on normalised text. */
function joinSpacedLetters(s: string): string {
  return s.replace(/\b(?:[a-z] ){2,}[a-z]\b/g, m => m.replace(/ /g, ''))
}

/** "fuuuuck" -> "fuck", "shiit" -> "shit". Collapses any repeated letter. */
function collapseRepeats(s: string): string {
  return s.replace(/([a-z])\1+/g, '$1')
}

/** The set of text variants we match word lists against. */
function variants(text: string): string[] {
  const n = normalizeText(text)
  const joined = joinSpacedLetters(n)
  return Array.from(new Set([n, joined, collapseRepeats(n), collapseRepeats(joined)]))
}

// --------------------------------------------------------------------------
// Word matching
// --------------------------------------------------------------------------

const SUFFIX = '(?:s|es|ed|er|ers|ing|in|y|ies)?'

function wordRegex(words: string[]): RegExp {
  const alts = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  return new RegExp(`\\b(?:${alts})${SUFFIX}\\b`, 'g')
}

const REJECT_RE = wordRegex(REJECT_WORDS)
const REVIEW_RE = wordRegex(REVIEW_WORDS)
const SENSITIVE_RE = wordRegex(SENSITIVE_WORDS)
const ALLOW_SET = new Set(PARISH_ALLOW)

function findMatches(re: RegExp, texts: string[]): string[] {
  const hits = new Set<string>()
  for (const t of texts) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(t)) !== null) {
      if (!ALLOW_SET.has(m[0])) hits.add(m[0])
    }
  }
  return Array.from(hits)
}

// Looks inside words ("fuckyou"), but never across a word boundary: squashing
// spaces would turn "who recently" into a hit for "whore".
function findSubstrings(list: string[], texts: string[]): string[] {
  const hits = new Set<string>()
  for (const t of texts) {
    for (const s of list) {
      if (t.includes(s)) hits.add(s)
    }
  }
  return Array.from(hits)
}

// --------------------------------------------------------------------------
// Heuristics for spam, gibberish, and silliness
// --------------------------------------------------------------------------

const URL_RE = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|co|us|info|biz|xyz|me|tv|app)\b)/i
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i
const PHONE_RE = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/
const KEYBOARD_WALKS = ['qwert', 'werty', 'asdf', 'sdfg', 'zxcv', 'xcvb', 'hjkl', 'jkl;', '12345', '23456', 'abcdef', 'qazwsx']
const EMOJI_RE = /\p{Extended_Pictographic}/gu
const TEST_RE = /^(test|testing|hello|hi|hey|asdf|blah|lorem ipsum)[\s.!]*$/i

function heuristics(raw: string): { flags: string[]; reject: boolean } {
  const flags: string[] = []
  let reject = false
  const trimmed = raw.trim()
  const normalized = normalizeText(raw)
  const words = normalized.split(' ').filter(Boolean)

  if (URL_RE.test(trimmed)) { flags.push('link'); reject = true }
  if (EMAIL_RE.test(trimmed)) { flags.push('email'); reject = true }
  if (PHONE_RE.test(trimmed)) flags.push('phone')

  if (TEST_RE.test(trimmed)) flags.push('test-input')
  if (words.length < 2) flags.push('very-short')

  if (/(.)\1{4,}/i.test(trimmed)) flags.push('repeated-characters')

  const lowerNoSpace = trimmed.toLowerCase().replace(/\s+/g, '')
  if (KEYBOARD_WALKS.some(k => lowerNoSpace.includes(k))) flags.push('keyboard-walk')

  const alphaWords = words.filter(w => /^[a-z]+$/.test(w) && w.length >= 4)
  const noVowel = alphaWords.filter(w => !/[aeiouy]/.test(w))
  if (noVowel.length >= 2 || (alphaWords.length > 0 && noVowel.length / alphaWords.length > 0.34)) {
    flags.push('gibberish')
  }

  const emojiCount = (trimmed.match(EMOJI_RE) ?? []).length
  if (emojiCount >= 4) flags.push('emoji')

  const nonSpace = trimmed.replace(/\s+/g, '')
  const nonLetter = nonSpace.replace(/[\p{L}\p{N}.,'’"!?;:()\-]/gu, '').length
  if (nonSpace.length > 0 && nonLetter / nonSpace.length > 0.3) flags.push('symbols')

  return { flags, reject }
}

// --------------------------------------------------------------------------
// Public API
// --------------------------------------------------------------------------

export function assessPrayer(text: string): RulesResult {
  const vs = variants(text)
  const flags: string[] = []

  const rejectHits = findMatches(REJECT_RE, vs)
  const substringHits = findSubstrings(REJECT_SUBSTRINGS, vs).filter(s => !rejectHits.includes(s))
  const reviewSubstringHits = findSubstrings(REVIEW_SUBSTRINGS, vs).filter(s => !rejectHits.includes(s))
  const reviewHits = findMatches(REVIEW_RE, vs)
  const sensitiveHits = findMatches(SENSITIVE_RE, vs)
  const h = heuristics(text)

  if (rejectHits.length) flags.push(`profanity:${rejectHits.join(',')}`)
  if (substringHits.length) flags.push(`profanity-embedded:${substringHits.join(',')}`)
  if (reviewHits.length) flags.push(`language:${reviewHits.join(',')}`)
  if (reviewSubstringHits.length) flags.push(`language-embedded:${reviewSubstringHits.join(',')}`)
  if (sensitiveHits.length) flags.push('pastoral')
  flags.push(...h.flags)

  let verdict: RulesVerdict = 'approve'
  if (rejectHits.length || substringHits.length || h.reject) verdict = 'reject'
  else if (reviewHits.length || reviewSubstringHits.length || h.flags.length) verdict = 'review'

  const reason =
    verdict === 'reject'
      ? `Blocked by rules: ${flags.filter(f => !f.startsWith('pastoral')).join('; ')}`
      : verdict === 'review'
        ? `Held by rules: ${flags.filter(f => f !== 'pastoral').join('; ')}`
        : 'Passed rules'

  return { verdict, flags, reason }
}

/** Kept for the client form so it can do a cheap pre-check if ever wanted. */
export function containsBlockedWords(text: string): boolean {
  return assessPrayer(text).verdict === 'reject'
}
