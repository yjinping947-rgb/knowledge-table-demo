// 知乎实时适配器的无额度单元测试：验证 Data.Items 归一化与错误缓存。
import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
const cacheFile = resolve(".tmp/zhihu-search-cache.json");

const { normalizeRealtimeSources, filterRealtimeSourcesForTopic, searchZhihuRealtime, clearZhihuSearchCache } =
  await import("../src/lib/zhihu/realtime.ts");

const normalized = normalizeRealtimeSources({
  Data: {
    Items: [{
      ContentID: 123,
      Title: "测试问题",
      AuthorName: "测试答主",
      ContentText: "这是完整的回答内容。",
      Url: "https://www.zhihu.com/question/123/answer/456",
      VoteUpCount: "7",
      CommentCount: 2,
      AuthorityLevel: "3",
    }],
  },
});
assert.equal(normalized.length, 1);
assert.equal(normalized[0].contentId, "123");
assert.equal(normalized[0].author, "测试答主");
assert.equal(normalized[0].voteUpCount, 7);
assert.match(normalized[0].url, /[?&](?:utm=openai_platform|utm_medium=openapi_platform)/);
assert.equal(normalized[0].sourceProvider, "zhihu-realtime");

const topicGateSources = normalizeRealtimeSources({
  Data: { Items: [
    { ContentID: "generic-quit", Title: "裸辞前要做什么", ContentText: "先算清空窗期成本。", Url: "https://www.zhihu.com/question/1/answer/1" },
    { ContentID: "civil-service", Title: "体制内要不要离职", ContentText: "公务员和事业单位的选择需要考虑编制环境。", Url: "https://www.zhihu.com/question/2/answer/2" },
    { ContentID: "creator", Title: "普通人怎么做自媒体", ContentText: "先验证内容方向和账号定位，不必为了做个人 IP 裸辞。", Url: "https://www.zhihu.com/question/3/answer/3" },
  ] },
});
assert.deepEqual(filterRealtimeSourcesForTopic("T09", topicGateSources).map((x) => x.contentId), ["civil-service"]);
assert.deepEqual(filterRealtimeSourcesForTopic("T19", topicGateSources).map((x) => x.contentId), ["creator"]);

const crossTalkSources = normalizeRealtimeSources({
  Data: { Items: [
    { ContentID: "creator-quit-mention", Title: "普通人怎么做自媒体", ContentText: "先验证内容方向和账号定位；有人会把做自媒体和裸辞联系起来，但这不是本文重点。", Url: "https://www.zhihu.com/question/4/answer/4" },
    { ContentID: "quit-disguised", Title: "没钱先别裸辞", ContentText: "文章顺带提到自媒体账号，但主要讨论收入中断和空窗期风险。", Url: "https://www.zhihu.com/question/5/answer/5" },
    { ContentID: "weak-mention", Title: "普通人的职业选择", ContentText: "偶尔提到自媒体。", Url: "https://www.zhihu.com/question/6/answer/6" },
  ] },
});
assert.deepEqual(filterRealtimeSourcesForTopic("T19", crossTalkSources).map((x) => x.contentId), ["creator-quit-mention"]);

process.env.ZHIHU_REALTIME_DISABLED = "1";
const disabled = await searchZhihuRealtime("不应调用 CLI", 1);
assert.equal(disabled.status, "error");
assert.match(disabled.message, /已禁用/);
delete process.env.ZHIHU_REALTIME_DISABLED;

clearZhihuSearchCache();
process.env.ZHIHU_CLI_PATH = "__missing_zhihu_cli__";
const first = await searchZhihuRealtime("缓存测试", 1);
// 模拟开发服务重启后内存缓存丢失，第二次应从持久化缓存读取，
// 不再执行一次缺失的 CLI 调用。
clearZhihuSearchCache();
const second = await searchZhihuRealtime("缓存测试", 1);
assert.equal(first.status, "error");
assert.equal(first.cached, false);
assert.equal(second.status, "error");
assert.equal(second.cached, true);
clearZhihuSearchCache();

const persistentSource = {
  contentId: "persistent-1",
  title: "持久化缓存测试",
  author: "测试答主",
  contentText: "该内容来自预置的本地成功缓存。",
  url: "https://www.zhihu.com/question/1/answer/1?utm=openai_platform",
  voteUpCount: 1,
  commentCount: 0,
  authorityLevel: 1,
  sourceProvider: "zhihu-realtime",
};
await mkdir(dirname(cacheFile), { recursive: true });
await writeFile(cacheFile, JSON.stringify({
  "持久化成功缓存::1": {
    expiresAt: Date.now() + 60_000,
    value: { status: "ok", sources: [persistentSource], cached: false, elapsedMs: 10 },
  },
}), "utf8");
clearZhihuSearchCache();
const persistentHit = await searchZhihuRealtime("持久化成功缓存", 1);
assert.equal(persistentHit.status, "ok");
assert.equal(persistentHit.cached, true);
assert.equal(persistentHit.sources[0].contentId, "persistent-1");
clearZhihuSearchCache();
await rm(cacheFile, { force: true });

console.log("PASS: realtime adapter normalization + error cache + persistent success cache");
