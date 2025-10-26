import { mutation, query } from "./_generated/server";

import {v} from "convex/values";

export const createTasks = mutation({
    args: {tasks: v.array(v.object({
        description: v.string(),
        dueBy: v.optional(v.number())
    }))},

    async handler(ctx, args) {
        await Promise.all(
            args.tasks.map((task) => {
                return ctx.db.insert("tasks", {
                    description: task.description,
                    dueBy: task.dueBy
                })
            })
        )       
    },
})

export const getTasks = query({
    args: {},

    async handler(ctx, _) {
        return await ctx.db.query("tasks").collect();
    }
})