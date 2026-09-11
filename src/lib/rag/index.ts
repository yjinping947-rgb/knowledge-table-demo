// src/lib/rag/index.ts
export { runRag, getRoom, listRooms, type RagResult, type Room } from "./pipeline";
export { retrieveTopK, type RagItem, type RagEmbedding } from "./retrieve";
export { embedQuery, EMBED_MODEL, EMBED_DIM } from "./client";
export { loadTopics, loadTopicEmbeddings, listTopics, retrieveFromTopics, type Topic, type TopicSource, type TopicEmbedding } from "./topics";
