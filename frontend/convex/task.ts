import { mutation } from "./_generated/server";

import {v} from "convex/values";

const createTasks = mutation({
    args: {tasks: v.array(v.object({
        description: v.string(),
        dueBy: v.number()
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