import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "知识拼桌", description: "不是替你回答，而是陪你把问题想清楚" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
