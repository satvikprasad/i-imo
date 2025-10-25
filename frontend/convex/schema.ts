import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  persons: defineTable({
    name: v.string(),
    createdAt: v.number(),
  }),
  face_embs: defineTable({
    personId: v.string(),
    emb: v.array(v.float64()),          
    createdAt: v.number(),
  }).index("by_person", ["personId"]),
  face_media: defineTable({
    personId: v.string(),
    imageStorageId: v.string(),
    createdAt: v.number()
  }).index("by_person", ["personId"]),
});
