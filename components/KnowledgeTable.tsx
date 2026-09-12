// components/KnowledgeTable.tsx
// 薄壳 re-export，保持 `@/components/KnowledgeTable` 路径可用。
// 真实实现在 src/client/rooms-app/（20 个房间大厅 + 单房间详情）。
//
// 这里不加 "use client"，让 src/client/rooms-app 保留 server-component 能力
// （可以直接调 listRooms() 预拉数据）。它的内部 RoomsShell 是 client 边界。

import RoomsApp from "../src/client/rooms-app";
export default RoomsApp;
