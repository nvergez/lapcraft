import { createFileRoute } from '@tanstack/react-router'
import { fetchAuthQuery } from '~/lib/auth-server'
import { getStripe, getSiteUrl } from '~/lib/stripe'
import { api } from '../../../../convex/_generated/api'

export const Route = createFileRoute('/api/stripe/portal')({
  server: {
    handlers: {
      POST: async () => {
        const profile = await fetchAuthQuery(api.credits.getProfile)
        if (!profile?.stripeCustomerId) {
          return Response.json({ error: 'No Stripe customer found' }, { status: 400 })
        }

        const stripe = getStripe()
        const siteUrl = getSiteUrl()

        const session = await stripe.billingPortal.sessions.create({
          customer: profile.stripeCustomerId,
          return_url: `${siteUrl}/pricing`,
        })

        return Response.json({ url: session.url })
      },
    },
  },
})
