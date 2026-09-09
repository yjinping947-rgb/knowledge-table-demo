import { z } from "zod";

export const discussRequestSchema = z.object({
  round: z.union([z.literal(1), z.literal(2)]),
  firstChoice: z.enum(["support_quit", "oppose_quit", "depends"]),
  secondChoice: z.enum(["leave_now", "wait_offer", "set_deadline"]).nullable().optional(),
  respondedSeatIds: z.array(z.enum(["action", "realist", "conditional"])).max(3)
}).superRefine((value, ctx) => {
  if (value.round === 2 && !value.secondChoice) ctx.addIssue({ code: "custom", message: "第二轮需要 secondChoice" });
});

export const summaryRequestSchema = z.object({
  firstChoice: z.enum(["support_quit", "oppose_quit", "depends"]),
  secondChoice: z.enum(["leave_now", "wait_offer", "set_deadline"]),
  positionChange: z.enum(["unchanged", "slightly_changed", "changed"]),
  respondedSeatIds: z.array(z.enum(["action", "realist", "conditional"])).max(3)
});

export const discussOutputSchema = z.object({ selectedSeatId: z.enum(["action", "realist", "conditional"]), reply: z.string().min(1).max(140), hostComment: z.string().min(1).max(100), sourceIds: z.array(z.string()).min(1).max(3) });
export const summaryOutputSchema = z.object({ consensus: z.string().min(1), disagreement: z.string().min(1), hiddenAssumption: z.string().min(1), trajectory: z.object({ before: z.string().min(1), during: z.string().min(1), after: z.string().min(1) }), openQuestion: z.string().min(1) });

export function parseModelJson(text: string): unknown {
  return JSON.parse(text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, ""));
}
