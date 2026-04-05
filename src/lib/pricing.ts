// ---------------------------------------------------------------------------
// Shared product / pricing constants — no server dependencies.
// This is the single source of truth for plans and credit packs.
// Plan limits (maxActivities, maxCustomColumnsPerActivity) live in
// convex/planLimits.ts and are re-exported here for convenience.
// ---------------------------------------------------------------------------

import { PLAN_LIMITS } from '../../convex/planLimits'
export { PLAN_LIMITS } from '../../convex/planLimits'
export type { PlanId } from '../../convex/planLimits'
import type { PlanId } from '../../convex/planLimits'

export interface PlanDef {
  name: string
  priceEurCents: number
  monthlyCredits: number
  features: string[]
}

export const PLANS: Record<PlanId, PlanDef> = {
  free: {
    name: 'Free',
    priceEurCents: 0,
    monthlyCredits: 20,
    features: [
      '20 AI credits/month',
      `Up to ${PLAN_LIMITS.free.maxActivities} activities`,
      `${PLAN_LIMITS.free.maxCustomColumnsPerActivity} custom column per activity`,
      'GPX & TCX editing',
      'Strava import',
    ],
  },
  premium: {
    name: 'Premium',
    priceEurCents: 500,
    monthlyCredits: 750,
    features: [
      '750 AI credits/month',
      'Unlimited activities',
      'Unlimited custom columns',
      'GPX & TCX editing',
      'Strava import',
      'Priority support',
    ],
  },
}

export type CreditPackId = 'small' | 'medium' | 'large'

export interface CreditPackDef {
  credits: number
  priceEurCents: number
  label: string
}

export const CREDIT_PACKS: Record<CreditPackId, CreditPackDef> = {
  small: { credits: 100, priceEurCents: 500, label: '100 credits' },
  medium: { credits: 500, priceEurCents: 1500, label: '500 credits' },
  large: { credits: 1250, priceEurCents: 2500, label: '1250 credits' },
} as const

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/** Format cents as a display string: "0" for free, "X.XX" otherwise */
export function formatEur(cents: number): string {
  if (cents === 0) return '0'
  return (cents / 100).toFixed(2)
}

/** Price per credit as a display string (e.g. "5c", "2.0c") */
export function perCreditLabel(pack: CreditPackDef): string {
  const perCredit = pack.priceEurCents / pack.credits
  const formatted = Number.isInteger(perCredit) ? String(perCredit) : perCredit.toFixed(1)
  return `${formatted}c`
}
