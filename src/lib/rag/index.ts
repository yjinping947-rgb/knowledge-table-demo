// src/lib/rag/index.ts
export { runRag, getRoom, listRooms, type RagResult, type Room } from "./pipeline";
export { retrieveTopK, type RagItem, type RagEmbedding } from "./retrieve";
export { embedQuery, EMBED_MODEL, EMBED_DIM } from "./client";
