// AI layer: one short Claude call that reads a prayer which already passed the
// rules layer and decides whether it can go straight to the screen.
//
// Runs only when ANTHROPIC_API_KEY is set. Any failure (timeout, parse error,
// refusal, missing key) returns null and the caller falls back to the rules
// verdict with the prayer held for staff, which is the safe direction.

import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'

export const AI_MODEL = process.env.MODERATION_MODEL ?? 'claude-opus-5-5'

const Verdict = z.object({
  verdict: z.enum(['approve', 'review', 'reject']),
  category: z.enum([
    'sincere',
    'profanity',
    'slur_or_hate',
    'sexual',
    'threat_or_violence',
    'mockery',
    'advertising_or_spam',
    'personal_data',
    'gibberish_or_test',
    'political',
    'other',
  ]),
  pastoral_flag: z.boolean(),
  reason: z.string(),
})

export type AiVerdict = z.infer<typeof Verdict>

const SYSTEM_PROMPT = `You screen prayer intentions submitted by parishioners of Saint Helen, a Catholic parish. Approved intentions appear, unedited, on a large screen inside the church and on a public web page, so children, grieving families, and visitors will read them.

Decide one of three outcomes:

approve - a sincere intention, however short, plain, misspelled, or heavy. Grief, illness, addiction, abuse, suicide, divorce, money trouble, and anger at God are all normal content for a prayer wall. Approve prayers for named people with ordinary detail ("for my mom Rose, recovering from surgery").

review - hold for parish staff when you are not sure, and always when the text contains: a full name together with a stigmatising detail (addiction, arrest, affair, mental illness, HIV); a home address, phone number, email, or licence plate; a statement that the writer may harm themselves or someone else; partisan political content; a message aimed at a specific person rather than a prayer ("Tom, call your mother"); a joke that might be affectionate.

reject - do not show: profanity or crude language, slurs or hate toward any group, sexual content, threats, mockery of God, the Church, the Mass, the clergy, or of the people praying, advertising, links, and keyboard mashing or test input.

Set pastoral_flag to true when the writer themselves seems to be in danger or acute distress (suicidal thoughts, self-harm, abuse happening now), regardless of verdict, so a staff member can follow up. Do not set it for grief or illness alone.

When the text is in a language other than English, apply the same standards. Keep reason to one short sentence a volunteer can read at a glance.`

let client: Anthropic | null = null
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null
  if (!client) {
    client = new Anthropic({
      timeout: 8_000,
      maxRetries: 1,
    })
  }
  return client
}

export function aiModerationEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

export async function moderateWithAi(
  text: string,
  rulesFlags: string[],
): Promise<AiVerdict | null> {
  const c = getClient()
  if (!c) return null

  const flagNote = rulesFlags.length
    ? `\n\nAutomated checks flagged: ${rulesFlags.join('; ')}. Weigh them, but decide from the text itself.`
    : ''

  try {
    const response = await c.messages.parse({
      model: AI_MODEL,
      max_tokens: 2048,
      output_config: {
        effort: 'low',
        format: zodOutputFormat(Verdict),
      },
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [
        {
          role: 'user',
          content: `Prayer intention as submitted:\n\n"""\n${text}\n"""${flagNote}`,
        },
      ],
    })

    if (response.stop_reason === 'refusal') return null
    return response.parsed_output ?? null
  } catch (err) {
    console.error('AI moderation failed:', err instanceof Error ? err.message : err)
    return null
  }
}
