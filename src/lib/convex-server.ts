import { ConvexHttpClient } from 'convex/browser'
import { getServerConvexConfig } from './convex-env'

let _client: ConvexHttpClient | null = null

/** Server-side ConvexHttpClient for unauthenticated calls (e.g. webhook handlers). */
export function getConvexClient(): ConvexHttpClient {
  if (!_client) {
    const { convexUrl } = getServerConvexConfig()
    _client = new ConvexHttpClient(convexUrl)
  }
  return _client
}
