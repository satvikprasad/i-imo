import { httpAction, internalMutation, internalQuery, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from 'convex/values';
import type { Id } from "./_generated/dataModel";

export const getEmbeddings = httpAction(async (ctx, _request) => {
  const rows = await ctx.runQuery(api.images.getEmbeddingsFromDB);
  const payload = rows.map(r => r.emb);
  return new Response(JSON.stringify(payload), { status: 200 });
});

export const getEmbeddingsFromDB = query({
  args: {},
  returns: v.array(v.object({
    personId: v.id("persons"),
    emb: v.array(v.float64()),
    createdAt: v.number(),
    _id: v.id("face_embs"),
    _creationTime: v.number(),
  })),
  handler: async (ctx) => {  
    return await ctx.db.query("face_embs").collect()
  },
});

export const postUploadPerson = httpAction(async (ctx, request) => {
  const { image, emb, label, thumbnail } = await request.json();

  // Check for duplicate person based on name and face embedding similarity
  const duplicate = await ctx.runQuery(internal.images.checkForDuplicate, {
    name: label,
    emb: emb,
  });

  if (duplicate) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "Person already exists",
        personId: duplicate.personId,
        reason: duplicate.reason
      }), 
      { status: 200 }
    );
  }

  // Convert base64 image to Blob
  const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'image/jpeg' });

  // Convert base64 thumbnail to Blob
  const thumbnailBase64Data = thumbnail.replace(/^data:image\/\w+;base64,/, '');
  const thumbnailBinaryString = atob(thumbnailBase64Data);
  const thumbnailBytes = new Uint8Array(thumbnailBinaryString.length);
  for (let i = 0; i < thumbnailBinaryString.length; i++) {
    thumbnailBytes[i] = thumbnailBinaryString.charCodeAt(i);
  }
  const thumbnailBlob = new Blob([thumbnailBytes], { type: 'image/jpeg' });

  // Store both image and thumbnail in Convex storage
  const storageId: Id<"_storage"> = await ctx.storage.store(blob);
  const thumbnailStorageId: Id<"_storage"> = await ctx.storage.store(thumbnailBlob);

  // Save person, embedding, and media to database
  const personId: Id<"persons"> = await ctx.runMutation(internal.images.createPerson, {
    name: label,
  });

  await ctx.runMutation(internal.images.createFaceEmbedding, {
    personId,
    emb,
  });

  await ctx.runMutation(internal.images.createFaceMedia, {
    personId,
    storageId,
    thumbnailStorageId,
  });

  return new Response(JSON.stringify({ success: true, personId }), {
    status: 200,
  });
});

// Helper function to calculate cosine similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (normA * normB);
}

// Helper function to check name similarity (case-insensitive)
function areNamesSimilar(name1: string, name2: string): boolean {
  const normalized1 = name1.toLowerCase().trim();
  const normalized2 = name2.toLowerCase().trim();
  
  // Exact match
  if (normalized1 === normalized2) return true;
  
  // Check if one name contains the other
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return true;
  }
  
  return false;
}

export const checkForDuplicate = internalQuery({
  args: {
    name: v.string(),
    emb: v.array(v.float64()),
  },
  returns: v.union(
    v.object({
      personId: v.id("persons"),
      reason: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    // Get all persons
    const allPersons = await ctx.db.query("persons").collect();
    
    // Check for name similarity first
    for (const person of allPersons) {
      if (areNamesSimilar(person.name, args.name)) {
        // Found similar name, now check face embedding similarity
        const faceEmbs = await ctx.db
          .query("face_embs")
          .withIndex("by_person", (q) => q.eq("personId", person._id))
          .collect();
        
        // Check similarity with any of their face embeddings
        for (const faceEmb of faceEmbs) {
          const similarity = cosineSimilarity(args.emb, faceEmb.emb);
          
          // If similarity is above threshold (e.g., 0.7), consider it a duplicate
          if (similarity > 0.7) {
            return {
              personId: person._id,
              reason: `Similar name and face detected (similarity: ${(similarity * 100).toFixed(1)}%)`,
            };
          }
        }
        
        // Similar name but different face
        return {
          personId: person._id,
          reason: "Similar name detected",
        };
      }
    }
    
    // Check for face similarity even with different names
    const allEmbeddings = await ctx.db.query("face_embs").collect();
    
    for (const existingEmb of allEmbeddings) {
      const similarity = cosineSimilarity(args.emb, existingEmb.emb);
      
      // If face is very similar (above 0.8), it's likely the same person
      if (similarity > 0.8) {
        return {
          personId: existingEmb.personId,
          reason: `Similar face detected (similarity: ${(similarity * 100).toFixed(1)}%)`,
        };
      }
    }
    
    // No duplicate found
    return null;
  },
});

export const createPerson = internalMutation({
  args: {
    name: v.string(),
  },
  returns: v.id("persons"),
  handler: async (ctx, args) => {
    const personId = await ctx.db.insert("persons", {
      name: args.name,
      createdAt: Date.now(),
      conversationSummary: "Undocumented..."
    });
    return personId;
  },
});

export const createFaceEmbedding = internalMutation({
  args: {
    personId: v.id("persons"),
    emb: v.array(v.float64()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("face_embs", {
      personId: args.personId,
      emb: args.emb,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const createFaceMedia = internalMutation({
  args: {
    personId: v.id("persons"),
    storageId: v.id("_storage"),
    thumbnailStorageId: v.id("_storage"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("face_media", {
      personId: args.personId,
      imageStorageId: args.storageId,
      thumbnailStorageId: args.thumbnailStorageId,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const getPersonImage = query({
  args: {
    personId: v.id("persons"),
  },
  returns: v.union(
    v.object({
      imageUrl: v.union(v.string(), v.null()),
      thumbnailUrl: v.union(v.string(), v.null()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const faceMedia = await ctx.db
      .query("face_media")
      .withIndex("by_person", (q) => q.eq("personId", args.personId))
      .first();

    if (!faceMedia) {
      return null;
    }

    const imageUrl = await ctx.storage.getUrl(faceMedia.imageStorageId);
    const thumbnailUrl = await ctx.storage.getUrl(faceMedia.thumbnailStorageId);

    return {
      imageUrl,
      thumbnailUrl,
    };
  },
});

export const getAllPersonImages = query({
  args: {},
  returns: v.array(
    v.object({
      personId: v.id("persons"),
      imageUrl: v.union(v.string(), v.null()),
      thumbnailUrl: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx) => {
    const allFaceMedia = await ctx.db.query("face_media").collect();

    const results = await Promise.all(
      allFaceMedia.map(async (media) => {
        const imageUrl = await ctx.storage.getUrl(media.imageStorageId);
        const thumbnailUrl = await ctx.storage.getUrl(media.thumbnailStorageId);

        return {
          personId: media.personId,
          imageUrl,
          thumbnailUrl,
        };
      })
    );

    return results;
  },
});