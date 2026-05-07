<!--
This file is a translation of README.md (Korean canonical source).
Last synced with README.md at commit: a0b4c52
Report drift or translation errors via a GitHub issue.

REVIEW NEEDED: native zh-CN reviewer.
The Chinese translation below was produced without a native Simplified Chinese
reviewer. Please verify phrasing and terminology before removing this marker.
-->

# openclone

[한국어](README.md) | [English](README_en.md) | **简体中文**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Skill-8A2BE2)](https://docs.claude.com/en/docs/claude-code)
[![Status](https://img.shields.io/badge/Status-v0.3.0-brightgreen)](CHANGELOG.md)
![Made in Korea](https://img.shields.io/badge/Made%20in-Korea-blue)

> **在 Claude Code 内使用,以及作为独立 CLI 使用,与 AI 人格克隆对话的技能。**

## 简介

一条 `/openclone` 命令,即可创建 AI 人格克隆、激活克隆,并通过群聊房间或类别面板同时听到多种视角。

- **开箱即用的内置克隆** — 安装后立即可用的精选预设(例如 `douglas` / 权道均)
- **创建属于你的克隆** — 通过访谈构建人格与知识库,生成专属克隆
- **群聊房间(room)** — 把多个克隆放进同一房间,最适合回答该问题的克隆会自动应答
- **类别面板** — 向同一类别下的所有克隆同时提问,并排比较不同视角
- **知识注入** — 把 URL、视频字幕或文档喂给当前激活的克隆,所有内容以本地文件形式保存

所有数据都以 Markdown 形式保存在你自己的机器上。没有服务器,没有账户,也没有 SaaS。

## 内置克隆

以下是本仓库默认附带的预设克隆列表。**Official** 列的 ✅ 表示本人亲自确认并正式接受的克隆。其他条目则基于公开的访谈、发言与文章构成;若本人希望修改或移除,请参阅下方的[选择加入](#选择加入实在人物克隆)一节。

| Official | 姓名 | 类别 | 简介 |
| :---: | --- | --- | --- |
| ✅ | [장동욱 (Brian)](clones/brian/persona.md) | `vc` | Kakao Ventures 董事。投资了 Daangn、Korea Credit Data、Queenit 等 60 多支早期团队 |
|  | [노정석 (Chester Roh)](clones/chester/persona.md) | `founder`, `vc` | 亚洲首位被谷歌收购的创业者。25 年连续创业 6 次,天使投资与 company-builder 经历 |
| ✅ | [김철우](clones/chulwukim/persona.md) | `vc`, `founder` | The Ventures 代表。Sellit 卖给 Kakao、Bungaejangter PEF 退出经历的创业者出身 VC |
| ✅ | [권도균](clones/douglas/persona.md) | `founder`, `vc` | Primer 代表。16 年投资 300 余家公司,韩国排名第一的加速器 |
| ✅ | [조여준 (Ethan Cho)](clones/ethan/persona.md) | `vc` | The Ventures 首席投资官(CIO)。出身 Google、高通风投、KB 投资,Dunamu 与 Toss 早期验证者 |
| ✅ | [정구봉](clones/gbjeong/persona.md) | `tech`, `founder` | Team Attention 代表。公认的 Claude Code 专家,AI 代理与自动化工程师 |
| ✅ | [김동현 (이드)](clones/iid/persona.md) | `expert` | T-order HR Director。经历过 Toss、Yanolja、Class101 的实战型 HR 合伙人 |
| ✅ | [신재명 (Jay Shin)](clones/jayshin/persona.md) | `founder` | Delight Room 创始人。全球 1 亿次下载量的 Alarmy,营收 340 亿韩元的健康应用 |
|  | [이동욱 (향로)](clones/jojoldu/persona.md) | `tech` | Inflab CTO。坚持记录的开发者,"记录胜过记忆" · "개발바닥(Gaebaldak)" |
| ✅ | [조쉬](clones/josh/persona.md) | `founder`, `expert` | Builder Josh · Josh 的新闻邮件 · 《我是独立创业者(나는 솔로프리너다)》作者 |
| ✅ | [이경훈](clones/kyunghun/persona.md) | `founder`, `vc` | Channel Corporation 副社长兼 CAIO。曾任 Global Brain 韩国代表,AI 与日本市场专家 |
|  | [김용훈 (Levi)](clones/levi/persona.md) | `expert` | Kim Yonghoon Growth Lab 代表。为 160 多家创业公司做过增长营销,有 M&A 与 IPO 经验的 CMO |
|  | [이승건 (SG Lee)](clones/sglee/persona.md) | `founder`, `expert` | Toss 团队负责人、Viva Republica 创始人。经历 5 年 8 次失败,在第 9 次创业打造出韩国国民级超级应用 |
|  | [김동신 (John Kim)](clones/johnkim/persona.md) | `founder`, `expert` | Sendbird 创始人。ParfaikaLab 退出 → Smile Family 转向 → 首位韩国人打造的硅谷 B2B 独角兽。目前正在创办 Delight.ai |

## 安装

openclone 提供**两种安装路径**。请根据你的环境选择对应的章节。

| 路径 | 何时使用 | 宿主 |
|---|---|---|
| **A. Claude Code 技能** | 想要在 Claude Code 中通过 `/openclone` 斜杠命令与克隆对话 | Claude Code |
| **B. 独立 CLI** | 想要在任意终端中通过 `openclone` 命令使用 OpenAI / Ollama / Codex 模型与克隆对话 | macOS / Linux / WSL2 |

---

### A. 作为 Claude Code 技能安装

在 Claude Code 中,你可以使用完整的交互能力 — `/openclone` 斜杠命令、群聊房间、类别面板与自然语言激活。

#### 方案 A1 — 交给 Claude Code

把下面这段提示粘贴到 Claude Code 会话中。

```text
Install openclone: run
  git clone --filter=blob:none --sparse --depth=1 https://github.com/open-clone/openclone.git ~/.claude/skills/openclone && cd ~/.claude/skills/openclone && git sparse-checkout set --no-cone '/*' '!/clones/*/knowledge/' && ./setup
then restart Claude Code (or start a new session) so the skill's hooks are picked up. Add an "openclone" section to ~/.claude/CLAUDE.md briefly explaining what openclone is: a single slash command `/openclone` that opens a home panel of AI persona clones grouped by category (vc, tech, founder, expert, influencer, politician, celebrity). Subcommands: `/openclone <name|N>` activates a clone, `/openclone room <A> <B> ...` opens a group chat where the most relevant clone auto-responds, `/openclone panel <category> "..."` broadcasts to all clones in that category, `/openclone new` creates a clone, `/openclone ingest <url|path>` feeds knowledge, `/openclone stop` exits. Knowledge for a built-in clone is lazy-fetched on first activation. Finally, confirm the skill loaded by running /openclone and show me the output.
```

Claude Code 会代为执行安装,并向 `~/.claude/CLAUDE.md` 追加使用备注,使技能在后续会话中自然被识别。

#### 方案 A2 — 直接在终端执行

```bash
git clone --filter=blob:none --sparse --depth=1 \
  https://github.com/open-clone/openclone.git \
  ~/.claude/skills/openclone \
  && cd ~/.claude/skills/openclone \
  && git sparse-checkout set --no-cone '/*' '!/clones/*/knowledge/' \
  && ./setup
```

安装后重启 Claude Code 会话,`/openclone` 即可使用。Claude Code 的使用方法见下方[使用方法](#使用方法)一节。

---

### B. 作为独立 CLI 安装

通过一行 npm 安装,你即可在任意终端中获得 `openclone` 命令行工具。它支持 OpenAI 兼容 API、Codex OAuth,以及本地 Ollama 模型。

#### B1. 安装

```bash
npm install -g @openclone/openclone
```

安装后 `openclone` 命令会被加入 `PATH`。14 个内置克隆与全部知识文件都已包含在该 npm 包中,可直接使用。

```bash
openclone list
openclone chat douglas
```

#### B2. (推荐) 通过 Vercel Agent Skill 获得使用指引

本仓库同时附带一个 [Vercel Agent Skill](https://vercel.com/docs/agent-resources/skills),18+ 种 AI 编程代理(Claude Code、Cursor、Copilot、Codex、Cline、Gemini 等)都能识别。安装后,你正在使用的代理会按需指引你完成 CLI 安装、provider 选择、会话管理与故障排查。

```bash
npx skills add open-clone/openclone --skill openclone-cli
```

安装完成后,用自然语言向你的代理提问即可:

```text
"我刚开始用 openclone CLI,如何用 OpenAI API key 起步?"
"openclone history 命令怎么继续之前的对话?"
"我想用本地 Ollama 模型运行 openclone"
"openclone chat 中 --resume 与 --resume=<id> 的区别是什么?"
```

代理只在需要时读取 `skills/openclone-cli/SKILL.md` 与对应的 `references/*.md`(provider 配置、会话持久化、故障排查等),并给出简洁、可直接复制粘贴的答案。

查看或更新已安装的技能:

```bash
npx skills list
npx skills check
npx skills update
```

#### B3. 直接使用

```bash
openclone list                                                # 可用克隆列表
openclone status                                              # 当前激活克隆与房间状态
openclone chat <slug> --prompt "问题"                          # 单次回答(会话自动保存)
openclone chat <slug>                                         # 交互式 TUI 模式
openclone history <slug>                                      # 某个克隆的已保存会话
openclone history --all                                       # 所有克隆的会话(含孤儿标记)
openclone chat <slug> --resume                                # 继续最近一次会话(交互式)
openclone chat <slug> --resume --prompt "follow-up"           # 继续最近一次会话(单次回答)
openclone chat <slug> --resume=<SESSION_ID> --prompt "..."    # 继续指定 ID 的会话(单次回答)
openclone chat <slug> --no-persist                            # 本次会话不写入磁盘
```

当传入 `--prompt` 时,CLI 只处理一轮就立刻退出。响应正文写到 `stdout`,会话标识符以 `[session: <id>]` 形式写到 `stderr`,这样代理就能在没有交互式终端的环境下也轻松串起多轮对话:

```bash
# 第一轮 — 捕获 stderr 拿到新的 sessionId
openclone chat douglas --prompt "早期融资该怎么思考?" 2>session.log
SESSION_ID=$(grep -oE '\[session: [^]]+\]' session.log | sed 's/\[session: //;s/\]//')

# 后续轮次通过 --resume 复用同一会话
openclone chat douglas --resume=$SESSION_ID --prompt "第一个选项再展开看看"
openclone chat douglas --resume=$SESSION_ID --prompt "给我一些具体案例"
```

#### B4. Provider 配置

默认 provider 是 OpenAI 兼容,默认模型是 `gpt-5.5`。使用 Codex OAuth 时,默认模型是 `gpt-5.3-codex-spark`。可以通过环境变量一次性配置,也可以每次用命令行参数指定。

**OpenAI 兼容 API:**

```bash
export OPENCLONE_API_KEY="sk-..."        # 或 OPENAI_API_KEY
export OPENCLONE_MODEL="gpt-5.5"
openclone chat douglas
```

**Codex OAuth(已经在 Codex CLI 中登录的机器):**

```bash
openclone chat douglas --use-codex-auth
# 如需切换模型:
openclone chat douglas --use-codex-auth --model gpt-5.5
```

ChatGPT 后端目前对 ChatGPT 普通用户级别的 OAuth token 拒绝 `store=true` 请求,因此 Codex OAuth 默认关闭 response item 持久化(`store=false`)。CLI 在每一轮都直接发送完整的 messages 数组,因此即便没有 `previous_response_id`,多轮对话仍可正常进行。在使用工具的多 step 轮次中,AI SDK 会把前一个 step 的 `rs_...` reasoning/tool item id 原样回传到下一个 step 的 input,后端会返回 `Item with id 'rs_...' not found.` 404;openclone 默认在 step 之间剥离这些 id 与 reasoning 内容片段。如需关闭,设置 `OPENCLONE_CODEX_STRIP_REASONING=0`。

**本地 Ollama:**

```bash
ollama serve &                          # 已经启动则跳过
openclone chat douglas --provider ollama --model llama3.2
```

各 provider 的详细配置、故障排查与会话管理细节,请通过上面的 [B2 Vercel Agent Skill](#b2-推荐-通过-vercel-agent-skill-获得使用指引) 询问代理,或直接阅读 `skills/openclone-cli/references/*.md`。

#### B5. 交互模式命令

```text
/help     命令帮助
/compact  立即将较旧的对话历史压缩为摘要
/clear    清空内存中的历史和摘要
/bye      结束对话(也可用 /exit、/quit)
```

会话会在每一轮以及 `/bye` 时,以纯文本 JSON 的形式保存到 `~/.openclone/conversations/<slug>/<sessionId>.json`。当你以 `--resume` 启动时,会先打印 `[resumed: N message(s)]` 提示,并把之前的整段对话原样回放到终端 — 向上滚动即可看到完整历史。最后会出现 `--- continuing conversation ---` 分隔符,以及新的 `>>>` 提示符。结束时会显示 `[session saved: <path>]`。

当一段对话超过约 350,000 字符(`OPENCLONE_COMPACT_MAX_CHARS`,大致相当于 250K-token 上下文窗口的 70%)时,较旧的消息会被压缩为摘要,而最近 8 轮(`OPENCLONE_COMPACT_KEEP_TURNS`)保持原文。摘要长度由 `OPENCLONE_COMPACT_SUMMARY_MAX_CHARS` 控制(默认 20,000 字符)。如果使用上下文较小的模型(例如 8B 级本地 Ollama)或想降低每轮 token 成本,可以将 `OPENCLONE_COMPACT_MAX_CHARS` 调小。被压缩的摘要也会保存在 session JSON 中,因此 `--resume` 时仍会还原。

#### B6. 从本地仓库运行(开发者)

```bash
git clone https://github.com/open-clone/openclone.git
cd openclone
npm install
npm run build
node dist/cli/index.js list
node dist/cli/index.js chat douglas
```

---

### C. Codex CLI(实验性)

> ⚠️ **当前仅是文件引用层面的实验性支持。** `./setup` 会修改 Claude Code 专用路径、钩子与 statusline,因此**在 Codex 环境中请不要执行 `./setup`**。`/openclone` 斜杠命令、`UserPromptSubmit` / `SessionStart` 钩子驱动的自动注入、statusline、后台自动更新等都还无法工作 — 目前只能把 `clones/<slug>/persona.md` 与 `knowledge/` 文件放到 Codex 能读取到的位置。原生的 `--host=codex` 安装器计划在后续版本中实现。如果你只是想用 Codex token 与克隆对话,使用上面 **B. 独立 CLI** 的 `--use-codex-auth` 更简单。

仅把仓库以稀疏 clone 方式放到 Codex 的技能路径下。

```bash
git clone --filter=blob:none --sparse --depth=1 \
  https://github.com/open-clone/openclone.git \
  ~/.codex/skills/openclone \
  && cd ~/.codex/skills/openclone \
  && git sparse-checkout set --no-cone '/*' '!/clones/*/knowledge/'
```

之后,把下面这段加入 Codex 会话的 `AGENTS.md`(或项目说明)中,Codex 就会根据对话上下文参考这些文件。

```text
openclone 的人格与知识位于 `~/.codex/skills/openclone/clones/<slug>/` 下。
当用户说 "像 <名字> 一样说话" 或 "openclone <slug>" 时,请阅读 `persona.md` 并遵循对应的语气与视角。
可用克隆列表请参考 `~/.codex/skills/openclone/README.md` 的 "Default clones" 一节。
```

需要某个克隆的知识文件时再按需 lazy-fetch:

```bash
cd ~/.codex/skills/openclone && git sparse-checkout add clones/<slug>/knowledge/
```

**更新**:由于此路径没有自动更新钩子,请用 `git pull --ff-only` 手动更新。**移除**:删除该目录(`rm -rf ~/.codex/skills/openclone`)即可 — 与 Claude Code 不同,这条路径不会动 `settings.json`。

### npm 发布

将 GitHub Release 设为 `published` 状态后,`.github/workflows/publish-npm.yml` 会执行 npm 发布。Release 标签是 npm 包版本的 source of truth。

- 标签示例:`v0.3.1` 或 `0.3.1`
- 预发布标签示例:`v0.4.0-beta.1`
- 普通 release 发布到 npm `latest` dist-tag
- GitHub prerelease 或 semver prerelease 标签会发布到 npm `next` dist-tag
- 仓库的 `NPM_TOKEN` secret 是必需的。

工作流会先从标签提取版本,通过 `npm version --no-git-tag-version` 写入 `package.json` / `package-lock.json`,然后只有 validate / build / test / lint / audit 全部通过后,才会执行 `npm publish --provenance`。

### 平台支持

| 环境 | 状态 | 备注 |
| --- | --- | --- |
| macOS | ✅ 正式支持 | 主要的开发和验证环境 |
| Linux | ✅ 正式支持 | |
| Windows (WSL2) | ✅ 可用 | 视为 Linux,推荐使用 |
| Windows (Git Bash) | ⚠️ 不支持 | 钩子运行依赖具体环境。`session-update.sh` 的后台 detach、`dev-link.sh` 的 `ln -sfn` 等尤其脆弱 |
| Windows (cmd / PowerShell 原生) | ❌ 不支持 | 钩子与脚本全部基于 bash,当前架构下无法实现 |

如果你通过 `CLAUDE_CONFIG_DIR` 环境变量改变了 `~/.claude` 的位置,`setup` / `uninstall` 也会自动跟随。Codex CLI 的宿主支持目前仍处于实验阶段,详见上方 "Codex CLI(实验性)" 一节。

<details>
<summary>更新、移除以及关闭自动更新</summary>

**更新** — 会话启动时会在后台自动执行 `git pull`(每小时最多一次)。要手动更新:

```bash
cd ~/.claude/skills/openclone && git pull --ff-only
```

**关闭 / 重新开启自动更新** — 通过文件标记切换。

```bash
touch ~/.openclone/no-auto-update    # 关闭
rm ~/.openclone/no-auto-update       # 重新开启
```

**移除** — 在安装目录下执行 `./uninstall`。

```bash
cd ~/.claude/skills/openclone && ./uninstall
```

你创建的克隆和已收集的知识(`~/.openclone/`)会被保留。如要彻底清除,使用 `rm -rf ~/.openclone`。

</details>

<details>
<summary id="安装故障排查">安装故障排查(清理 v1、重新安装)</summary>

**如果你是从插件版(0.2.0 之前)升级而来** — 当时的路径是 `~/.claude/plugins/marketplaces/openclone`。先清理再执行上面的方案 A 或 B。

```bash
cd ~/.claude/plugins/marketplaces/openclone && ./uninstall
rm -rf ~/.claude/plugins/marketplaces/openclone
rm -f ~/.openclone/no-auto-update
```

`~/.openclone/` 下的用户数据会被保留。

**如果现有安装出问题或更新被卡住** — 删除后重新安装更快。

```bash
cd ~/.claude/skills/openclone && ./uninstall
rm -f ~/.openclone/no-auto-update
# 然后重新执行上面的方案 A 或 B
```

</details>

## 使用方法

```text
/openclone                              # 主页面板 — 按类别列出克隆
/openclone 1                            # 通过编号激活
/openclone douglas                      # 通过名称激活
/openclone stop                         # 同时结束已激活的克隆和房间
/openclone new hayun                    # 创建一个克隆(访谈式)
/openclone ingest https://blog/post     # 给当前激活克隆补充知识
/openclone room douglas alice bob       # 群聊房间
/openclone room add charlie             # 向房间追加成员
/openclone room leave                   # 离开房间(已激活的克隆保留)
/openclone panel vc "问题"              # 类别面板 — 同时向所有 vc 克隆提问
```

类别共有 7 种固定值:`vc`、`tech`、`founder`、`expert`、`influencer`、`politician`、`celebrity`。每种"镜头"的细节请参阅 [references/categories.md](references/categories.md)。

## 选择加入(实在人物克隆)

openclone 中作为默认克隆分发的人物人格,只基于**公开的访谈、发言与文章**构成,是用以总结并再现公开观点的工具,而**不是**该人物的"虚拟分身"。

如果你正是其中之一,以下请求随时都可以提出:

- 查看当前默认克隆中包含的素材
- 修改或删除特定的引用、句子或知识文件
- 修正表面字段(`display_name`、`tagline`、所属机构等)
- 移除整个人格

**联系方式** — 公开请求请使用[选择加入 issue 模板](https://github.com/open-clone/openclone/issues/new?template=opt_in_request.md);需要私下证明身份的请发送邮件至 `hayun@rapidstudio.dev`。

**响应目标** — 收件后 7 天内做出初次回应。移除请求一经身份确认即写入仓库,会通过下一次自动更新到达用户本地。

## 更多

- [CONTRIBUTING.md](CONTRIBUTING.md) — 贡献指南(添加新克隆、命令与钩子开发)
- [references/clone-schema.md](references/clone-schema.md) — 克隆文件规范
- [references/categories.md](references/categories.md) — 类别镜头与语气指南
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) · [SECURITY.md](SECURITY.md)
- 赞助:[Team Attention](https://www.team-attention.com/)
- 许可证:MIT — [LICENSE](LICENSE)
