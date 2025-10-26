import { httpAction, internalMutation, query } from "./_generated/server";
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