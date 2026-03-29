import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  stravaConnections: defineTable({
    tokenIdentifier: v.string(),
    athleteId: v.number(),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
    athleteName: v.optional(v.string()),
    scope: v.string(),
  }).index('by_tokenIdentifier', ['tokenIdentifier']),

  activities: defineTable({
    tokenIdentifier: v.string(),
    slug: v.string(),
    name: v.string(),
    sourceFormat: v.union(v.literal('gpx'), v.literal('tcx')),
    xmlStorageId: v.id('_storage'),
    source: v.union(v.literal('file'), v.literal('strava')),
    stravaActivityId: v.optional(v.number()),
    sport: v.optional(v.string()),
    distance: v.number(),
    duration: v.number(),
    elevationGain: v.optional(v.number()),
    lapCount: v.number(),
    activityDate: v.optional(v.string()),
  })
    .index('by_tokenIdentifier', ['tokenIdentifier'])
    .index('by_tokenIdentifier_and_stravaActivityId', ['tokenIdentifier', 'stravaActivityId'])
    .index('by_slug', ['slug']),
})
