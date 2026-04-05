import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { api } from '../../convex/_generated/api'
import { Button } from '~/components/ui/button'
import { Check, Zap, Loader2, Crown, ExternalLink } from 'lucide-react'
import {
  PLANS,
  CREDIT_PACKS,
  formatEur,
  perCreditLabel,
  type PlanId,
  type CreditPackId,
} from '~/lib/pricing'

export const Route = createFileRoute('/pricing')({
  component: PricingPage,
})

const PLAN_LIST: PlanId[] = ['free', 'premium']
const PACK_LIST: CreditPackId[] = ['small', 'medium', 'large']

function PricingPage() {
  const { data: balance } = useQuery(convexQuery(api.credits.getBalance, {}))
  const [loading, setLoading] = useState<string | null>(null)

  const currentPlan = balance?.plan ?? 'free'
  const isPremium = currentPlan === 'premium'
  const hasStripe = !!balance?.stripeCustomerId

  async function handleCheckout(type: 'subscription' | 'credit_pack', packId?: string) {
    const key = packId ?? type
    setLoading(key)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, packId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('Checkout error:', data.error)
      }
    } finally {
      setLoading(null)
    }
  }

  async function handlePortal() {
    setLoading('portal')
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="font-serif text-3xl tracking-tight">Pricing</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Use Trail Companion to edit your activities with AI. Pick a plan or buy credits as you go.
        </p>
        {balance && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Zap className="size-4 text-primary" />
            <span className="text-sm font-medium tabular-nums">
              {balance.total} credits available
            </span>
            <span className="text-xs text-muted-foreground">
              ({balance.planCredits} plan + {balance.purchasedCredits} purchased)
            </span>
          </div>
        )}
      </div>

      {/* Plans */}
      <div className="grid gap-4 sm:grid-cols-2 max-w-2xl mx-auto">
        {PLAN_LIST.map((id) => {
          const plan = PLANS[id]
          const isCurrent = id === currentPlan
          return (
            <div
              key={id}
              className={`relative rounded-xl border p-6 flex flex-col ${
                id === 'premium'
                  ? 'border-primary/30 bg-primary/[0.02] ring-1 ring-primary/10'
                  : 'border-border'
              }`}
            >
              {id === 'premium' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-0.5 text-[11px] font-semibold text-primary-foreground">
                    <Crown className="size-3" />
                    Recommended
                  </span>
                </div>
              )}

              <div>
                <h3 className="font-serif text-lg">{plan.name}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tabular-nums">
                    {formatEur(plan.priceEurCents)}
                  </span>
                  <span className="text-sm text-muted-foreground">EUR/month</span>
                </div>
              </div>

              <ul className="mt-5 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="size-4 text-primary shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="mt-auto pt-5 space-y-2">
                  <div className="flex items-center justify-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 py-2 text-sm font-medium text-primary">
                    <Check className="size-3.5" />
                    Current plan
                  </div>
                  {isPremium && hasStripe && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5"
                      onClick={handlePortal}
                      disabled={loading === 'portal'}
                    >
                      {loading === 'portal' ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <ExternalLink className="size-3" />
                      )}
                      Manage subscription
                    </Button>
                  )}
                </div>
              ) : id === 'premium' ? (
                <div className="mt-auto pt-5">
                  <Button
                    className="w-full"
                    onClick={() => handleCheckout('subscription')}
                    disabled={loading === 'subscription'}
                  >
                    {loading === 'subscription' ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      'Upgrade to Premium'
                    )}
                  </Button>
                </div>
              ) : (
                /* Free card when user is premium — offer downgrade via portal */
                <div className="mt-auto pt-5 space-y-2">
                  <div className="flex items-center justify-center gap-1.5 rounded-md border border-border bg-muted/30 py-2 text-sm text-muted-foreground">
                    Free tier
                  </div>
                  {hasStripe && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full gap-1.5 text-xs"
                      onClick={handlePortal}
                      disabled={loading === 'portal'}
                    >
                      {loading === 'portal' ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <ExternalLink className="size-3" />
                      )}
                      Downgrade in billing portal
                    </Button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Credit packs */}
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="text-center">
          <h2 className="font-serif text-xl tracking-tight">Credit packs</h2>
          <p className="text-xs text-muted-foreground mt-1">
            One-time purchase. Credits never expire.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {PACK_LIST.map((id) => {
            const pack = CREDIT_PACKS[id]
            return (
              <div key={id} className="rounded-xl border border-border p-4 space-y-3 text-center">
                <div>
                  <div className="text-2xl font-bold tabular-nums">{pack.credits}</div>
                  <div className="text-xs text-muted-foreground">credits</div>
                </div>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-lg font-semibold tabular-nums">
                    {formatEur(pack.priceEurCents)}
                  </span>
                  <span className="text-xs text-muted-foreground">EUR</span>
                </div>
                <div className="text-[11px] text-muted-foreground/60">
                  {perCreditLabel(pack)}/credit
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleCheckout('credit_pack', id)}
                  disabled={loading === id}
                >
                  {loading === id ? <Loader2 className="size-3 animate-spin" /> : 'Buy'}
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
