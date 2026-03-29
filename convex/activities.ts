import { v } from 'convex/values'
import { action, mutation, query } from './_generated/server'
import { api } from './_generated/api'

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')
    return await ctx.storage.generateUploadUrl()
  },
})

export const create = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    return await ctx.db.insert('activities', {
      tokenIdentifier: identity.tokenIdentifier,
      ...args,
    })
  },
})

export const update = mutation({
  args: {
    activityId: v.id('activities'),
    name: v.optional(v.string()),
    xmlStorageId: v.optional(v.id('_storage')),
    distance: v.optional(v.number()),
    duration: v.optional(v.number()),
    elevationGain: v.optional(v.number()),
    lapCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const activity = await ctx.db.get(args.activityId)
    if (!activity || activity.tokenIdentifier !== identity.tokenIdentifier) {
      throw new Error('Activity not found')
    }

    const { activityId, ...updates } = args
    const patch: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        patch[key] = value
      }
    }

    // Delete old storage blob if we're replacing it
    if (updates.xmlStorageId && activity.xmlStorageId !== updates.xmlStorageId) {
      await ctx.storage.delete(activity.xmlStorageId)
    }

    await ctx.db.patch(activityId, patch)
  },
})

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    return await ctx.db
      .query('activities')
      .withIndex('by_tokenIdentifier', (q) => q.eq('tokenIdentifier', identity.tokenIdentifier))
      .order('desc')
      .take(50)
  },
})

export const getXmlUrl = query({
  args: { activityId: v.id('activities') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const activity = await ctx.db.get(args.activityId)
    if (!activity || activity.tokenIdentifier !== identity.tokenIdentifier) {
      return null
    }

    return await ctx.storage.getUrl(activity.xmlStorageId)
  },
})

export const getXmlContent = action({
  args: { activityId: v.id('activities') },
  handler: async (ctx, args): Promise<string | null> => {
    const url: string | null = await ctx.runQuery(api.activities.getXmlUrl, {
      activityId: args.activityId,
    })
    if (!url) return null

    const response = await fetch(url)
    if (!response.ok) return null
    return await response.text()
  },
})

export const remove = mutation({
  args: { activityId: v.id('activities') },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const activity = await ctx.db.get(args.activityId)
    if (!activity || activity.tokenIdentifier !== identity.tokenIdentifier) {
      throw new Error('Activity not found')
    }

    // Delete the stored XML blob
    await ctx.storage.delete(activity.xmlStorageId)
    await ctx.db.delete(args.activityId)
  },
})
