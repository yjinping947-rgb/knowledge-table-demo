import type { Topic } from "@/data";
import { topic as defaultTopic } from "@/data";

export function questionForTopic(title: string): string {
  if (title === defaultTopic.question.replace(/[？?]$/, "")) return defaultTopic.question;
  return `${title.replace(/[？?]$/, "")}？`;
}

export function discussionTopic(topicId = "T01", title = defaultTopic.question): Topic {
  if (topicId === "T01") return { ...defaultTopic, id: "T01" };
  const question = questionForTopic(title);
  return {
    id: topicId,
    question,
    duration: "约 5 分钟",
    scenario: `假设你正面临「${question.replace(/[？?]$/, "")}」，眼前的选择各有代价。你会先采取哪一步？`,
  };
}
