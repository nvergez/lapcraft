import { createFileRoute } from '@tanstack/react-router'
import { fetchAuthQuery } from '~/lib/auth-server'
import { getStripe, getConvexWebhookSecret, PLANS } from '~/lib/stripe'
import { getConvexClient } from '~/lib/convex-server'
import { api } from '../../../../convex/_generated/api'

export const Route = createFileRoute('/api/stripe/admin-plan')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // 1. Verify caller is admin
        const isAdmin = await fetchAuthQuery(api.admin.isAdmin)
        if (!isAdmin) {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }

        const body = await request.json()
        const { tokenIdentifier, plan } = body as {
          tokenIdentifier: string
          plan: 'premium' | 'free'
        }

        if (!tokenIdentifier || !['premium', 'free'].includes(plan)) {
          return Response.json({ error: 'Invalid request' }, { status: 400 })
        }

        // 2. Get target user's profile
        const profile = await fetchAuthQuery(api.admin.getProfile, { tokenIdentifier })
        if (!profile) {
          return Response.json({ error: 'User profile not found' }, { status: 404 })
        }

        const stripe = getStripe()
        const convex = getConvexClient()
        const webhookSecret = getConvexWebhookSecret()

        if (plan === 'premium') {
          if (profile.plan === 'premium') {
            return Response.json({ error: 'User is already premium' }, { status: 400 })
          }

          // 3a. Ensure Stripe customer exists
          let stripeCustomerId = profile.stripeCustomerId
          if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
              metadata: { tokenIdentifier },
            })
            stripeCustomerId = customer.id
            // stripeCustomerId will be stored by handleSubscriptionCreated → upgradeToPremium
          }

          // 3b. Ensure the admin-comp coupon exists
          try {
            await stripe.coupons.retrieve('lapcraft-admin-comp')
          } catch {
            await stripe.coupons.create({
              id: 'lapcraft-admin-comp',
              percent_off: 100,
              duration: 'forever',
              name: 'Admin Complimentary',
            })
          }

          // 3c. Find or create the premium price
          const priceId = await getOrCreatePremiumPrice(stripe)

          // 3d. Create the subscription (free via coupon)
          const subscription = await stripe.subscriptions.create({
            customer: stripeCustomerId,
            items: [{ price: priceId }],
            discounts: [{ coupon: 'lapcraft-admin-comp' }],
            metadata: { tokenIdentifier, admin_grant: 'true' },
          })

          // 3e. Update the DB via existing Stripe handler
          await convex.action(api.stripe.handleSubscriptionCreated, {
            webhookSecret,
            tokenIdentifier,
            stripeCustomerId,
            stripeSubscriptionId: subscription.id,
          })

          return Response.json({ ok: true, plan: 'premium', subscriptionId: subscription.id })
        }

        if (plan === 'free') {
          if (profile.plan === 'free') {
            return Response.json({ error: 'User is already on free plan' }, { status: 400 })
          }

          if (!profile.stripeSubscriptionId) {
            // No subscription to cancel — just downgrade directly
            await convex.action(api.stripe.handleSubscriptionDeleted, {
              webhookSecret,
              stripeCustomerId: profile.stripeCustomerId ?? '',
            })
            return Response.json({ ok: true, plan: 'free' })
          }

          // 4a. Check if this is an admin-granted (free) subscription
          const subscription = await stripe.subscriptions.retrieve(profile.stripeSubscriptionId)
          const isAdminGrant = subscription.metadata?.admin_grant === 'true'

          if (isAdminGrant) {
            // Admin-granted subs are free — cancel immediately
            await stripe.subscriptions.cancel(profile.stripeSubscriptionId)

            if (profile.stripeCustomerId) {
              await convex.action(api.stripe.handleSubscriptionDeleted, {
                webhookSecret,
                stripeCustomerId: profile.stripeCustomerId,
              })
            }

            return Response.json({ ok: true, plan: 'free', canceledImmediately: true })
          }

          // Paying user — cancel at end of billing period
          await stripe.subscriptions.update(profile.stripeSubscriptionId, {
            cancel_at_period_end: true,
          })

          // Don't downgrade in DB yet — the webhook fires when the period actually ends
          return Response.json({ ok: true, plan: 'pending_cancellation' })
        }

        return Response.json({ error: 'Invalid plan' }, { status: 400 })
      },
    },
  },
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getOrCreatePremiumPrice(stripe: ReturnType<typeof getStripe>): Promise<string> {
  // Search for existing Lapcraft Premium product
  const products = await stripe.products.search({
    query: "metadata['app']:'lapcraft' AND active:'true'",
  })

  let productId: string
  if (products.data.length > 0) {
    productId = products.data[0].id
  } else {
    const product = await stripe.products.create({
      name: 'Lapcraft Premium',
      description: `${PLANS.premium.monthlyCredits} AI credits/month, unlimited activities & custom columns`,
      metadata: { app: 'lapcraft' },
    })
    productId = product.id
  }

  // Find active recurring EUR price for this product
  const prices = await stripe.prices.list({
    product: productId,
    active: true,
    currency: 'eur',
    type: 'recurring',
    limit: 1,
  })

  if (prices.data.length > 0) {
    return prices.data[0].id
  }

  // Create one
  const price = await stripe.prices.create({
    product: productId,
    currency: 'eur',
    unit_amount: PLANS.premium.priceEurCents,
    recurring: { interval: 'month' },
  })

  return price.id
}
