import Stripe from 'stripe'

export { PLANS, CREDIT_PACKS, type CreditPackId, type PlanId } from './pricing'

function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  return key
}

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(getStripeSecretKey())
  }
  return _stripe
}

export function getConvexWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_CONVEX_SECRET
  if (!secret) throw new Error('STRIPE_WEBHOOK_CONVEX_SECRET is not set')
  return secret
}

export function getSiteUrl(): string {
  return process.env.VITE_SITE_URL ?? 'http://localhost:3000'
}
