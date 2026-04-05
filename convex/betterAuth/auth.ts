import { betterAuth } from 'better-auth/minimal'
import { createAuthOptions } from '../auth'

// Export a static instance for Better Auth schema generation.
// Uses createAuthOptions() which doesn't throw on missing SITE_URL.
export const auth = betterAuth(createAuthOptions())
