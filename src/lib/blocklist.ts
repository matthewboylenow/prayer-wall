// Word lists for the rules layer of moderation.
//
// Three tiers:
//   REJECT  - never shown. Profanity, slurs, sexual terms.
//   REVIEW  - held for staff unless the AI layer clears it. Words that are
//             usually fine in a parish context but worth a second look.
//   SENSITIVE - sincere prayers often contain these (suicide, abuse, illness).
//             They are never auto-rejected; they add a pastoral flag so staff
//             can see that someone may need a call.
//
// Matching is done on normalised text (lowercase, accents stripped, leetspeak
// mapped, punctuation removed), with common suffixes tolerated. See
// moderation.ts for the matcher.

export const REJECT_WORDS: string[] = [
  // profanity
  'fuck', 'fuk', 'fck', 'motherfucker', 'shit', 'bullshit', 'bitch', 'cunt',
  'asshole', 'ass', 'arse', 'jackass', 'dumbass', 'wanker', 'twat',
  'cock', 'pussy', 'whore', 'slut', 'tits', 'boobs', 'horny', 'blowjob',
  'dildo', 'porn', 'porno', 'cum', 'jizz', 'fap', 'milf',
  'douche', 'douchebag', 'skank',
  // slurs
  'nigger', 'nigga', 'niggers', 'niggas', 'negro',
  'faggot', 'fag', 'fags', 'dyke', 'tranny', 'shemale',
  'kike', 'spic', 'spick', 'wetback', 'beaner', 'chink', 'gook', 'jap',
  'raghead', 'towelhead', 'sandnigger', 'paki', 'coon', 'darkie',
  'retard', 'retards', 'retarded', 'tard',
  'kkk', 'heil',
]

// Substring matches for strings that never appear inside innocent words.
export const REJECT_SUBSTRINGS: string[] = ['fuck', 'nigg', 'faggot']

// Substrings that are almost always bad but do occur inside real words
// (Scunthorpe). These hold for review instead of rejecting.
export const REVIEW_SUBSTRINGS: string[] = ['cunt', 'bitch', 'whore']

export const REVIEW_WORDS: string[] = [
  'damn', 'goddamn', 'dammit', 'crap', 'piss', 'pissed', 'bastard', 'prick',
  'dick', 'screw', 'sucks', 'suck', 'bloody', 'hoe', 'bum',
  'sex', 'sexy', 'sexual', 'naked', 'nude', 'penis', 'vagina', 'orgasm',
  'nazi', 'hitler',
  'stupid', 'idiot', 'moron', 'loser', 'ugly', 'hate', 'hates',
  'kill', 'killing', 'murder', 'murdered', 'shoot', 'shooting', 'gun', 'bomb',
  'weed', 'cocaine', 'heroin', 'meth', 'drunk', 'wasted',
  'trump', 'biden', 'democrat', 'democrats', 'republican', 'republicans', 'maga',
  'lol', 'lmao', 'rofl', 'omg', 'wtf', 'stfu', 'yolo',
]

export const SENSITIVE_WORDS: string[] = [
  'suicide', 'suicidal', 'overdose', 'overdosed', 'selfharm', 'cutting',
  'abuse', 'abused', 'abusive', 'molested', 'molestation', 'rape', 'raped',
  'assault', 'assaulted', 'violence', 'violent', 'beaten', 'beats',
  'hopeless', 'worthless', 'alone', 'lonely',
  'addiction', 'addicted', 'alcoholic', 'relapse', 'relapsed',
  'miscarriage', 'stillborn', 'hospice', 'terminal', 'cancer', 'dying',
  'divorce', 'homeless', 'eviction', 'evicted', 'deported', 'deportation',
  'prison', 'jail', 'arrested',
]

// Words that look like profanity to a naive matcher but are ordinary in a
// Catholic parish. They are never flagged on their own.
export const PARISH_ALLOW: string[] = [
  'hell', 'damnation', 'damned', 'purgatory', 'sin', 'sins', 'sinner', 'sinners',
  'died', 'death', 'dead', 'passed', 'funeral', 'grave', 'burial',
  'blood', 'body', 'flesh', 'wounds', 'crucified', 'cross',
]
