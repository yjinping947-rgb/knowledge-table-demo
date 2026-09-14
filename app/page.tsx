// app/page.tsx
// 主页：默认显示话题大厅；?topic=T01 进入对应话题的讨论桌。
// 详见 docs/contributing/team-setup.md 与 .harness/INDEX.md 第 7 节。

import KnowledgeTable from "@/components/KnowledgeTable";
import { listSeasons } from "@/data";
import { listTopics } from "@/lib/rag";
import { SeasonsShell } from "../src/client/seasons/SeasonsShell";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; q?: string }>;
}) {
  const { topic: topicId, q: customQuestion } = await searchParams;
  const [seasons, topics] = await Promise.all([listSeasons(), listTopics()]);

  if (topicId === "CUSTOM" && customQuestion) {
    return <KnowledgeTable topicId="CUSTOM" topicTitle={customQuestion} />;
  }
  if (topicId) {
    const selectedTopic = topics.find((item) => item.id === topicId);
    if (selectedTopic) {
      return <KnowledgeTable topicId={selectedTopic.id} topicTitle={selectedTopic.title} />;
    }
  }

  return <SeasonsShell seasons={seasons} topics={topics} />;
}
