<!--
This file is a translation of README.md (Korean canonical source).
Last synced with README.md at commit: 9889002
Report drift or translation errors via a GitHub issue.

REVIEW NEEDED: native zh-CN reviewer.
The Chinese translation below was produced without a native Simplified Chinese
reviewer. Please verify phrasing and terminology before removing this marker.
-->

# openclone

[한국어](README.md) | [English](README_en.md) | **简体中文**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Skill-8A2BE2)](https://docs.claude.com/en/docs/claude-code)
[![Status](https://img.shields.io/badge/Status-v0.2-brightgreen)](CHANGELOG.md)
![Made in Korea](https://img.shields.io/badge/Made%20in-Korea-blue)

> **在 Claude Code 内与 AI 人格克隆对话的技能。**

## 简介

只需一条 `/openclone` 命令,即可创建、激活 AI 人格克隆,并通过群聊房间或类别面板同时听取多方观点。

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

## 安装

openclone 把 **Claude Code** 作为一级宿主,同时对 **Codex CLI** 提供实验性的安装支持。请按你所用宿主对应的章节操作。

### Claude Code(推荐)

#### 方案 A — 交给 Claude Code

把下面这段粘贴进 Claude Code 会话:

```text
Install openclone: run
  git clone --filter=blob:none --sparse --depth=1 https://github.com/taurin-inc/openclone.git ~/.claude/skills/openclone && cd ~/.claude/skills/openclone && git sparse-checkout set --no-cone '/*' '!/clones/*/knowledge/' && ./setup
then restart Claude Code (or start a new session) so the skill's hooks are picked up. Add an "openclone" section to ~/.claude/CLAUDE.md briefly explaining what openclone is: a single slash command `/openclone` that opens a home panel of AI persona clones grouped by category (vc, tech, founder, expert, influencer, politician, celebrity). Subcommands: `/openclone <name|N>` activates a clone, `/openclone room <A> <B> ...` opens a group chat where the most relevant clone auto-responds, `/openclone panel <category> "..."` broadcasts to all clones in that category, `/openclone new` creates a clone, `/openclone ingest <url|path>` feeds knowledge, `/openclone stop` exits. Knowledge for a built-in clone is lazy-fetched on first activation. Finally, confirm the skill loaded by running /openclone and show me the output.
```

Claude Code 会替你完成安装,并在 `~/.claude/CLAUDE.md` 中补充使用说明,使以后的会话可以自然识别该技能。

#### 方案 B — 直接在终端执行

```bash
git clone --filter=blob:none --sparse --depth=1 \
  https://github.com/taurin-inc/openclone.git \
  ~/.claude/skills/openclone \
  && cd ~/.claude/skills/openclone \
  && git sparse-checkout set --no-cone '/*' '!/clones/*/knowledge/' \
  && ./setup
```

安装完成后重启 Claude Code,`/openclone` 即可立即使用。

### Codex CLI(实验性)

> ⚠️ **目前仅提供文件引用层面的实验性支持。** `./setup` 会修改 Claude Code 专属的路径、钩子与 statusline,因此**请勿在 Codex 环境下运行 `./setup`。** 斜杠命令 `/openclone`、基于 `UserPromptSubmit` / `SessionStart` 钩子的自动注入、statusline、后台自动更新目前都尚未生效;当下只能把 `clones/<slug>/persona.md` 与 `knowledge/` 文件放到 Codex 可以读取的位置。原生 `--host=codex` 安装器将在后续版本提供。

把仓库以 sparse clone 的方式放到 Codex 的技能目录:

```bash
git clone --filter=blob:none --sparse --depth=1 \
  https://github.com/taurin-inc/openclone.git \
  ~/.codex/skills/openclone \
  && cd ~/.codex/skills/openclone \
  && git sparse-checkout set --no-cone '/*' '!/clones/*/knowledge/'
```

之后把下面这段贴到 Codex 会话的 `AGENTS.md`(或项目指令)里,Codex 会根据对话上下文读取相应文件:

```text
openclone persona / knowledge files live under `~/.codex/skills/openclone/clones/<slug>/`.
When the user asks "talk like <name>" or "openclone <slug>", read `persona.md` and follow
that tone and perspective. The list of available clones is in the "Default clones" section
of `~/.codex/skills/openclone/README.md`.
```

如果需要特定克隆的知识文件,可在需要时再惰性拉取:

```bash
cd ~/.codex/skills/openclone && git sparse-checkout add clones/<slug>/knowledge/
```

**更新**:由于没有自动更新钩子,请用 `git pull --ff-only` 手动刷新。**卸载**:直接删除目录(`rm -rf ~/.codex/skills/openclone`)即可 —— 它不像 Claude Code 会改动 `settings.json`。

### 平台支持

| 环境 | 状态 | 备注 |
| --- | --- | --- |
| macOS | ✅ 正式支持 | 主要开发与验证环境 |
| Linux | ✅ 正式支持 | |
| Windows (WSL2) | ✅ 可用 | 视为 Linux 使用。推荐 |
| Windows (Git Bash) | ⚠️ 不支持 | 钩子执行依赖具体环境;`session-update.sh` 的后台脱离、`dev-link.sh` 的 `ln -sfn` 尤其脆弱 |
| Windows(cmd / PowerShell 原生) | ❌ 不支持 | 钩子与脚本全部基于 bash,当前架构下无法实现 |

如果通过 `CLAUDE_CONFIG_DIR` 环境变量改动了 `~/.claude` 的位置,`setup` / `uninstall` 会自动跟随。Codex CLI 宿主支持目前处于实验阶段,详见上方 "Codex CLI(实验性)" 一节。

<details>
<summary>更新 · 卸载 · 关闭自动更新</summary>

**更新** —— 每次会话启动时会在后台自动执行 `git pull`(每小时最多一次)。若需手动更新:

```bash
cd ~/.claude/skills/openclone && git pull --ff-only
```

**开关自动更新** —— 通过文件开关切换:

```bash
touch ~/.openclone/no-auto-update    # 关闭
rm ~/.openclone/no-auto-update       # 重新开启
```

**卸载** —— 在安装目录下执行 `./uninstall`:

```bash
cd ~/.claude/skills/openclone && ./uninstall
```

你创建的克隆与收集的知识(`~/.openclone/`)会被保留。若要彻底清除,运行 `rm -rf ~/.openclone`。

</details>

<details>
<summary id="install-troubleshooting-zh">安装故障排查(清理 v1、重新安装)</summary>

**从插件版本(0.2.0 之前)升级而来** —— 以前的路径是 `~/.claude/plugins/marketplaces/openclone`。先执行清理,再按上面的方案 A 或 B 操作:

```bash
cd ~/.claude/plugins/marketplaces/openclone && ./uninstall
rm -rf ~/.claude/plugins/marketplaces/openclone
rm -f ~/.openclone/no-auto-update
```

`~/.openclone/` 目录下的用户数据会被完整保留。

**现有安装损坏或更新卡住时** —— 删除后重新安装通常更快:

```bash
cd ~/.claude/skills/openclone && ./uninstall
rm -f ~/.openclone/no-auto-update
# 然后重新执行上面的方案 A 或 B
```

</details>

## 使用方法

```text
/openclone                              # 主面板 —— 按类别列出所有克隆
/openclone 1                            # 通过编号激活
/openclone douglas                      # 通过名称激活
/openclone stop                         # 同时结束激活的克隆与房间
/openclone new hayun                    # 创建克隆(访谈式)
/openclone ingest https://blog/post     # 给当前激活的克隆添加知识
/openclone room douglas alice bob       # 群聊房间
/openclone room add charlie             # 往房间里追加成员
/openclone room leave                   # 离开房间(激活的克隆保留)
/openclone panel vc "问题"              # 类别面板 —— 向所有 vc 类别的克隆提问
```

共有 `vc`、`tech`、`founder`、`expert`、`influencer`、`politician`、`celebrity` 7 种类别。各视角的详细说明请参阅 [references/categories.md](references/categories.md)。

## 选择加入(实在人物克隆)

openclone 默认附带的人物 persona,**仅基于公开的访谈、发言与文章**构成,并非该人物的 "化身",而是一个总结与再现其公开观点的工具。

如果你是本人,随时可以提出以下请求:

- 确认当前默认克隆所包含的素材
- 修改或删除特定引用、句子或知识文件
- 更正标注(`display_name`、`tagline`、所属单位等)
- 完整移除整个 persona

**联系方式** —— 公开请求请使用[选择加入 issue 模板](https://github.com/taurin-inc/openclone/issues/new?template=opt_in_request.md);需要私下验证时请写信至 `hayun@rapidstudio.dev`。

**响应目标** —— 收到后 7 天内给出首次回复。移除请求在完成身份确认后会立即应用到仓库,并通过下次自动更新推送到用户本地。

## 更多

- [CONTRIBUTING.md](CONTRIBUTING.md) —— 贡献指南,涵盖新增克隆、命令和钩子开发(韩文)
- [references/clone-schema.md](references/clone-schema.md) —— 克隆文件规范(英文)
- [references/categories.md](references/categories.md) —— 类别视角与语气指南(英文)
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) · [SECURITY.md](SECURITY.md)
- 仓库中的其他文档(`CHANGELOG.md`、`docs/architecture.md`、persona 文件、knowledge 文件)目前仍保持原始语言(韩文 / 英文)
- 赞助:[Team Attention(팀어텐션)](https://www.team-attention.com/)
- 许可证:MIT —— [LICENSE](LICENSE)
