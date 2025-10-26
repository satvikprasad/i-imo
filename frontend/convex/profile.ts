import { mutation, query } from "./_generated/server"

import { v } from "convex/values";

export const createProfile = mutation({
    args: {
        name: v.string(),
        createdAt: v.number(),
        conversationSummary: v.string(),
    },
    handler: async (ctx, args) => {
        const profileId = await ctx.db.insert("persons", {
            name: args.name,
            createdAt: args.createdAt,
            conversationSummary: args.conversationSummary
        });
    },
});

export const getProfiles = query({
    args: {},

    async handler(ctx, args_0) {
        return await ctx.db.query("persons").collect();
    },
})

export const updateProfile = mutation({
    args: { id: v.id("persons"), conversationSummary: v.string() },

    async handler(ctx, args) {
        const { id } = args;

        await ctx.db.patch(id, {
            conversationSummary: args.conversationSummary
        });
    },
});

export const updateProfiles = mutation({
    args: {
        profiles: v.array(
            v.object({
                name: v.string(),
                conversationSummary: v.string(),
            })
        ),
    },

    async handler(ctx, args) {
        await Promise.all(
            args.profiles.map(async (profile) => {
                const existing = await ctx.db
                    .query("persons")
                    .filter((q) => q.eq(q.field("name"), profile.name))
                    .first();

                if (existing) {
                    const update  = await ctx.db.patch(existing._id, profile);
                }
            })
        )
    },
});

export const upsertProfiles = mutation({
    args: {
        profiles: v.array(
            v.object({
                name: v.string(),
                conversationSummary: v.string(),
            })
        )
    },

    async handler(ctx, args) {
        const results = await Promise.all(
            args.profiles.map(async (profile) => {
                const existing = await ctx.db
                    .query("persons")
                    .filter((q) => q.eq(q.field("name"), profile.name))
                    .first();

                if (existing) {
                    await ctx.db.patch(existing._id, profile);

                    return { id: existing._id, action: 'updated' }
                } else {
                    const id = await ctx.db.insert("persons", {
                        name: profile.name,
                        conversationSummary: profile.conversationSummary,
                        createdAt: Date.now()
                    });

                    return { id, action: 'created' };
                }
            })
        )
    },
})
