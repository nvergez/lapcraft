import { v } from 'convex/values'
import { action } from './_generated/server'
import { internal } from './_generated/api'

/**
 * Webhook-processing actions called from the TanStack Start Stripe webhook route.
 * Protected by a shared secret (STRIPE_WEBHOOK_CONVEX_SECRET) as defense-in-depth;
 * the primary protection is Stripe signature verification in the webhook route.
 */

function verifySecret(secret: string) {
  const expected = process.env.STRIPE_WEBHOOK_CONVEX_SECRET
  if (!expected) throw new Error('STRIPE_WEBHOOK_CONVEX_SECRET is not set')
  if (secret !== expected) throw new Error('Invalid webhook secret')
}

/** Called after checkout.session.completed for a subscription purchase. */
export const handleSubscriptionCreated = action({
  args: {
    webhookSecret: v.string(),
    tokenIdentifier: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    verifySecret(args.webhookSecret)

    await ctx.runMutation(internal.credits.upgradeToPremium, {
      tokenIdentifier: args.tokenIdentifier,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      metadata: 'checkout.session.completed (subscription)',
    })
  },
})

/** Called after checkout.session.completed for a credit pack purchase. */
export const handleCreditPackPurchased = action({
  args: {
    webhookSecret: v.string(),
    tokenIdentifier: v.string(),
    credits: v.number(),
    checkoutSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    verifySecret(args.webhookSecret)

    await ctx.runMutation(internal.credits.grantPurchasedCredits, {
      tokenIdentifier: args.tokenIdentifier,
      amount: args.credits,
      metadata: `credit pack purchase (session ${args.checkoutSessionId})`,
    })
  },
})

/** Called after invoice.paid for subscription renewal (not initial creation). */
export const handleInvoicePaid = action({
  args: {
    webhookSecret: v.string(),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    verifySecret(args.webhookSecret)

    const profile = await ctx.runQuery(internal.credits.getProfileByStripeCustomerId, {
      stripeCustomerId: args.stripeCustomerId,
    })

    if (!profile) {
      console.warn(`invoice.paid: no profile found for Stripe customer ${args.stripeCustomerId}`)
      return
    }

    await ctx.runMutation(internal.credits.resetPlanCredits, {
      tokenIdentifier: profile.tokenIdentifier,
      metadata: 'invoice.paid (monthly renewal)',
    })
  },
})

/** Called after customer.subscription.deleted — downgrade to free plan. */
export const handleSubscriptionDeleted = action({
  args: {
    webhookSecret: v.string(),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    verifySecret(args.webhookSecret)

    const profile = await ctx.runQuery(internal.credits.getProfileByStripeCustomerId, {
      stripeCustomerId: args.stripeCustomerId,
    })

    if (!profile) {
      console.warn(
        `customer.subscription.deleted: no profile found for Stripe customer ${args.stripeCustomerId}`,
      )
      return
    }

    await ctx.runMutation(internal.credits.downgradeToFree, {
      tokenIdentifier: profile.tokenIdentifier,
      metadata: 'customer.subscription.deleted',
    })
  },
})
