# Siralim Planner 中文版（含中/英一键切换）

基于 [Berated-Bert/siralim-planner](https://github.com/Berated-Bert/siralim-planner)（GPL-3.0）的本地汉化版。
原版 React 源码与全部逻辑保留，分享码与官方站点（berated-bert.github.io/siralim-planner）**互相兼容**。

## 启动

双击 `启动组件库.bat`（首次运行需已执行 `npm install`，本目录已装好），浏览器访问 http://localhost:3000。

生产版（可选）：`npm run build`，产物在 `build/`，可放到任意静态服务器（homepage 已改为相对路径 `.`）。

## 中/英切换

顶栏 **EN / 中文** 按钮一键切换：

- **中文模式**：界面与数据纯中文（生物/特性/专精/专长/圣物全部官方简中；个别无官方译名的内容回退英文）。
- **英文模式**：完全还原原版英文界面。
- 选择保存在浏览器 localStorage，刷新后保持。

## 网页聊天助手（右侧可收起）

队伍区右侧有一条可收起的「知识库问答」竖栏（与专精栏同款收起交互，收起时队伍区自动扩展），展开后可查询
生物 / 特性 / 专长 / 法术 / 圣物 / 领域，支持回复序号选择候选、点击图片放大查看。机器人回复会内嵌汇总大图。

聊天面板右上角可切换两种模式：

- **知识库**：关键词精确检索，秒回（默认）。
- **AI 问答**：开放性问题（如"哪些专长可以配合哪些特性"）交给你部署在 Linux 服务器上的
  Qwen2.5-32B（sglang，OpenAI 兼容接口）。采用 RAG：先从本地知识库检索最多 8 张相关卡片
  作为上下文，模型被要求只依据资料回答、不足时明确说明。
  服务器地址在本目录（qq-kb-assistant）的 `llm_config.json` 里配置，改完即时生效，
  详见 `配置大模型.txt`。

后端为 `D:\siralim\qq-kb-assistant\web_api.py`（与 QQ 机器人同一套知识库），双击
`qq-kb-assistant\启动问答服务.bat` 启动（127.0.0.1:8801，首次加载约 1 分钟）。
服务未启动时面板会显示离线提示，不影响 planner 本身使用。

## 与原版的差异（改动清单）

1. **数据**：`src/data/*.json` 在原英文字段基础上追加了 `*_cn` 显示字段（uid、英文名、build 码逻辑原样未动）。
   原始英文数据备份为 `src/data/*.en.json`。
2. **翻译来源**：`localization/*.csv`（游戏官方简中）+ `qq-kb-assistant/data/knowledge_unified.xlsx`（机器人整理的中英对照：特性效果/专精/圣物/种族/领域），
   生成脚本为 `D:\siralim\_work\build_zh_json.py`（游戏更新后重跑即可）。
3. **语言模块**：`src/functions/lang.js`（`t()` 静态文案 / `D()` 数据字段按语言取值），切换按钮在 `AppHeader.js`，
   `App.js` 收到切换事件后以 key 强制整树重渲染。
4. **文案**：表头、弹窗标题、按钮、搜索提示、通知/错误信息均已双语化（`parsePartyString.js` 的解析错误也已接入）。
5. **图标路径**：原代码写死的 `/siralim-planner/...` 改为 `process.env.PUBLIC_URL + ...`，本地开发/相对路径部署都能加载。
6. **补齐资源**：`public/specialization_icons/`（42 专精图标 + UNKNOWN 占位）；`public/relic_icons/`（62 张圣物图标，
   已从原版站点下载 32px 官方大图替换，配合 `MonsterPlanner.scss` 自带的 `image-rendering: pixelated` 1:1 显示，清晰且与原版完全一致）。
7. `package.json` homepage 改为 `.`；`public/index.html` 标题改为「Siralim Planner 中文版」。

## 数据版本

Compendium 1.1.0（此仓库自带的数据，1592 只生物 / 40 专精 / 31 圣物）。
如需升级到最新 Compendium：替换 `data/siralim-ultimate-compendium/*.csv` 与 API 数据后重跑原版 `build_data.py`，再重跑 `build_zh_json.py` 即可。
