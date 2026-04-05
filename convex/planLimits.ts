// ---------------------------------------------------------------------------
// Plan limits — single source of truth.
// Importable from both convex/ and src/ (no Convex runtime deps).
// ---------------------------------------------------------------------------

export const PLAN_LIMITS = {
  free: {
    maxActivities: 10,
    maxCustomColumnsPerActivity: 1,
  },
  premium: {
    maxActivities: null,
    maxCustomColumnsPerActivity: null,
  },
} as const

export type PlanId = 'free' | 'premium'
