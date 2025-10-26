import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    persons: defineTable({
        name: v.string(),
        createdAt: v.number(),
        conversationSummary: v.string(),
    }),

    face_embs: defineTable({
        personId: v.id("persons"),
        emb: v.array(v.float64()),
        createdAt: v.number(),
    }).index("by_person", ["personId"]),

    face_media: defineTable({
        personId: v.id("persons"),
        imageStorageId: v.id("_storage"),
        createdAt: v.number(),
    }).index("by_person", ["personId"]),

	tasks: defineTable({
		description: v.string(),
		dueBy: v.optional(v.number())
	})
});
