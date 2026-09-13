"""
多轮对话压力测试。

验证三件事：
1. 提问与回答质量（走完整 5 步流程）
2. 上下文记忆（后一轮能不能引用前一轮的内容）
3. 认知边界扩展（AI 有没有给出用户没想到的角度）
"""

import json
import urllib.request

BASE = "http://localhost:3000"
SID = "multiturn-001"

SEP = "=" * 72


def post(path, body):
    req = urllib.request.Request(
        BASE + path,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"},
    )
    with urllib.request.urlopen(req, timeout=240) as r:
        return json.load(r)


# ══════════════════════════════════════════════════════════════
print(SEP)
print("第 1 轮：向行动派追问（带个人条件）")
print(SEP)
f1 = post(
    "/api/followup",
    {
        "topicId": "T01",
        "seatId": "action",
        "question": "我今年 32，房贷每个月 8000，手上只有 4 个月存款，还能裸辞吗",
        "sessionId": SID,
        "userAddedConditions": ["房贷每月 8000", "存款只够 4 个月", "32 岁"],
    },
)
print(f"[mode={f1['mode']}] 行动派：{f1['reply']}")
print()

# ══════════════════════════════════════════════════════════════
print(SEP)
print("第 2 轮：同一席继续追问（测记忆 —— 能不能记住上一轮的条件）")
print(SEP)
f2 = post(
    "/api/followup",
    {
        "topicId": "T01",
        "seatId": "action",
        "question": "那我刚才说的房贷压力，你准备怎么解决",
        "sessionId": SID,
    },
)
print(f"[mode={f2['mode']}] 行动派：{f2['reply']}")
print()

# ══════════════════════════════════════════════════════════════
print(SEP)
print("第 3 轮：换到现实派问同一个问题（测席位不串味）")
print(SEP)
f3 = post(
    "/api/followup",
    {
        "topicId": "T01",
        "seatId": "realist",
        "question": "我今年 32，房贷每个月 8000，手上只有 4 个月存款，还能裸辞吗",
        "sessionId": SID,
    },
)
print(f"[mode={f3['mode']}] 现实派：{f3['reply']}")
print()

# ══════════════════════════════════════════════════════════════
print(SEP)
print("第 4 轮：碰撞（质疑 + 回应）")
print(SEP)
c = post(
    "/api/collision",
    {
        "topicId": "T01",
        "tendency": "closer_first",
        "selectedSeatId": "action",
        "collisionPoint": "4 个月存款够不够支撑这次裸辞？",
        "sessionId": SID,
    },
)
print(f"[mode={c['mode']}]")
print(f"  现实派质疑：{c['challenge']['reply']}")
print()
print(f"  行动派回应：{c['response']['reply']}")
print()
print(f"  主持人：{c.get('hostComment')}")
print()

# ══════════════════════════════════════════════════════════════
print(SEP)
print("第 5 轮：隐藏分歧（测 --- 能不能引用上面真实发生的对话）")
print(SEP)
d = post(
    "/api/divergence",
    {
        "topicId": "T01",
        "tendency": "closer_first",
        "selectedSeatId": "action",
        "collisionPoint": "4 个月存款够不够支撑这次裸辞？",
        "challenge": c["challenge"]["reply"],
        "response": c["response"]["reply"],
        "sessionId": SID,
    },
)
print(f"[mode={d['mode']}]")
for i, x in enumerate(d["candidates"]):
    print(f"  [{i+1}] {x['title']}")
    print(f"      {x['detail']}")
print()

# ══════════════════════════════════════════════════════════════
print(SEP)
print("第 6 轮：第三席（测 --- 能不能给出用户没想到的角度）")
print(SEP)
p = post(
    "/api/perspective",
    {
        "topicId": "T01",
        "selectedSeatId": "action",
        "collisionPoint": "4 个月存款够不够支撑这次裸辞？",
        "confirmedDivergence": d["candidates"][0]["title"],
        "sessionId": SID,
    },
)
print(f"[mode={p['mode']} origin={p.get('origin')}]")
print(f"  名称：{p['name']}")
print(f"  重构：{p['reframe']}")
print(f"  工具：{p.get('tool')}")
print(f"  发言：{p['reply']}")
print()

# ══════════════════════════════════════════════════════════════
print(SEP)
print("第 7 轮：结果卡")
print(SEP)
s = post(
    "/api/summary",
    {
        "flow": "knowledge-table-v2",
        "topicId": "T01",
        "firstChoice": "support_quit",
        "secondChoice": "leave_now",
        "positionChange": "slightly_changed",
        "respondedSeatIds": ["action"],
        "tendency": "closer_first",
        "collisionPoint": "4 个月存款够不够支撑这次裸辞？",
        "challenge": c["challenge"]["reply"],
        "response": c["response"]["reply"],
        "confirmedDivergence": d["candidates"][0]["title"],
        "perspectiveName": p["name"],
        "perspectiveReframe": p["reframe"],
        "sessionId": SID,
    },
)
print(f"[mode={s['mode']}]")
m = s.get("discussionMap", {})
print(f"  中心问题：{m.get('question')}")
for r in m.get("ripples", []):
    print(f"    - {r['label']}  [{r['type']}]  <- {r['sourceSeat']}")
print(f"  轨迹：{m.get('trajectory')}")
print(f"  灵魂金句：{s.get('soulSentence')}")
