import { httpAction, query } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from 'convex/values';

export const getEmbeddings = httpAction(async (ctx, request) => {
  const rows = await ctx.runQuery(api.images.getEmbeddingsFromDB);
  const payload = rows.map(r => ({ personId: r.personId, emb: r.emb }));
  return new Response(JSON.stringify(payload), { status: 200 });
});

export const getEmbeddingsFromDB = query(async (ctx) => {  
  return await ctx.db.query("face_embs").collect();
})

export const postUploadPerson = httpAction(async (ctx, request) => {
  const { author, body } = await request.json();

  console.log(author, body);

  return new Response(null, {
    status: 200,
  });
});