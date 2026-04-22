# openclone

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Skill-8A2BE2)](https://docs.claude.com/en/docs/claude-code)
[![Status](https://img.shields.io/badge/Status-v2.0-brightgreen)](#상태)
[![Made in Korea](https://img.shields.io/badge/Made%20in-Korea-blue)](#크레딧)

> **Claude Code 안에서 AI 페르소나 클론을 만들고, 대화하고, 패널로 묻는다.**
>
> 카테고리별 페르소나를 가진 AI 클론을 만들고, Claude Code 안에서 그 클론과 직접 대화합니다.

<!-- 데모 GIF 추가 예정 -->

## 목차

- [할 수 있는 일](#할-수-있는-일)
- [설치](#설치)
- [사용법](#사용법)
- [데이터 레이아웃](#데이터-레이아웃)
- [카테고리 (v1 고정 목록)](#카테고리-v1-고정-목록)
- [작동 방식](#작동-방식)
- [로드맵 (잠정)](#로드맵-잠정)
- [기여하기](#기여하기)
- [옵트인 정책 (실존 인물 클론)](#옵트인-정책-실존-인물-클론)
- [상태](#상태)
- [크레딧](#크레딧)
- [라이선스](#라이선스)

## 할 수 있는 일

- **단일 진입점 `/openclone`** — `/openclone`만 치면 홈 패널이 뜹니다. 카테고리별로 그룹핑된 클론 목록에서 번호나 이름으로 바로 선택.
- **기본 내장 클론을 바로 사용** — 스킬에 큐레이션된 프리셋 클론이 함께 배포됩니다(예: `douglas` / 권도균). 설치 직후 활성화하거나 패널 브로드캐스트로 질문할 수 있습니다.
- **나만의 클론 만들기** — 카테고리(`vc`, `dev`, `founder`, `pm`, `designer`, `writer`, `marketing`, `hr`) 하나 이상을 선택해 생성합니다. 하나의 클론은 여러 카테고리에 속할 수 있지만 파일은 하나입니다.
- **클론 한 명과 대화** — `/openclone <name>` 이후 보내는 모든 메시지는 그 클론의 목소리로 응답됩니다.
- **단체 대화방(room)** — `/openclone room <A> <B> <C>`로 여러 클론을 한 방에 모아두고 자연스럽게 대화하면, 질문의 성격에 따라 **가장 적절한 1명**(필요시 뚜렷이 다른 2명)이 자동 응답.
- **카테고리 패널** — `/openclone panel vc "질문"`은 `vc`를 포함한 모든 클론(내장 + 사용자)에게 동시에 질문하고, 각 관점을 나란히 돌려줍니다.
- **지식 주입** — URL·YouTube 자막·문서를 넣으면 `~/.openclone/` 아래에 일반 마크다운으로 저장됩니다. 내장 클론에 주입하면 사용자 네임스페이스로 자동 포크됩니다.

모든 데이터는 로컬 파일시스템에 있습니다. 서버도, 계정도, SaaS도 없습니다.

> **실존 인물 내장 클론 관련.** openclone에 내장된 인물 클론은 공개된 발언·글을 기반으로 구성됐습니다. 본인이신 경우 확인·정정·제거를 요청하실 수 있습니다 — 자세한 내용은 [옵트인 정책](#옵트인-정책-실존-인물-클론) 참고.

<!-- -->

> **v2.0 breaking change.** openclone은 Claude Code **플러그인**에서 **Standalone skill**로 전환됐습니다. 설치 경로가 `~/.claude/plugins/marketplaces/openclone` → `~/.claude/skills/openclone` 으로 바뀌었고, 슬래시 커맨드는 `/openclone:openclone`이 아니라 `/openclone`으로 직접 호출됩니다. 이전 버전을 쓰고 있었다면 [재설치 안내](#이전-v1-플러그인-설치를-사용-중이라면) 참고.

---

## 설치

두 가지 방법 중 하나를 고르세요.

### 옵션 A — Claude Code 안에서 설치 (권장)

Claude Code 세션에 아래 문단을 그대로 붙여넣으세요:

```text
Install openclone: run
  git clone --filter=blob:none --sparse --depth=1 https://github.com/taurin-inc/openclone.git ~/.claude/skills/openclone && cd ~/.claude/skills/openclone && git sparse-checkout set --no-cone '/*' '!/clones/*/knowledge/' && ./setup
then restart Claude Code (or start a new session) so the skill's hooks are picked up. Add an "openclone" section to ~/.claude/CLAUDE.md briefly explaining what openclone is: a single slash command `/openclone` that opens a home panel of AI persona clones grouped by category (vc, dev, founder, pm, designer, writer, marketing, hr). Subcommands: `/openclone <name|N>` activates a clone, `/openclone room <A> <B> ...` opens a group chat where the most relevant clone auto-responds, `/openclone panel <category> "..."` broadcasts to all clones in that category, `/openclone new` creates a clone, `/openclone ingest <url|path>` feeds knowledge, `/openclone stop` exits. Knowledge for a built-in clone is lazy-fetched on first activation. Finally, confirm the skill loaded by running /openclone and show me the output.
```

Claude Code가 직접 클론·`./setup`을 실행하고, 앞으로의 세션에서 openclone을 자연스럽게 인식하도록 `~/.claude/CLAUDE.md`에 메모를 추가합니다.

### 옵션 B — 터미널에서 직접

```bash
git clone --filter=blob:none --sparse --depth=1 \
  https://github.com/taurin-inc/openclone.git \
  ~/.claude/skills/openclone \
  && cd ~/.claude/skills/openclone \
  && git sparse-checkout set --no-cone '/*' '!/clones/*/knowledge/' \
  && ./setup
```

설치 후 Claude Code 세션을 한 번 재시작하면 `/openclone` 이 바로 사용 가능합니다 (훅·statusline 적용을 위해 재시작이 필요합니다).

### 공통 동작

- Partial + sparse 클론이라 첫 설치는 가볍습니다 (수 MB, 지식 제외).
- 각 클론의 지식은 `/openclone <name>` 으로 활성화할 때 **필요한 것만** 내려받습니다.
- Claude Code는 `~/.claude/skills/<skill-name>/SKILL.md` 를 자동 인식하므로 별도 플러그인 등록은 필요 없습니다.

### 이전 v1 플러그인 설치를 사용 중이라면

v1은 `~/.claude/plugins/marketplaces/openclone` 에 플러그인으로 설치됐습니다. v2 setup은 이 경로를 감지하면 중단하므로, 먼저 정리해 주세요:

```bash
cd ~/.claude/plugins/marketplaces/openclone && ./uninstall
rm -rf ~/.claude/plugins/marketplaces/openclone
rm -f ~/.openclone/no-auto-update
# 그 후 위 설치 one-liner 재실행
```

`./uninstall`이 `~/.claude/settings.json` 에서 v1 플러그인 등록(`enabledPlugins`, `extraKnownMarketplaces`)과 openclone이 심어둔 훅·상태줄을 정리합니다. v1 설치 디렉터리 삭제는 위의 `rm -rf`로 수동 처리합니다(실행 중인 스크립트가 자신을 지울 수 없어서).

`~/.openclone/` 아래의 사용자 데이터(활성 클론 포인터, 직접 만든 클론, 수집한 지식)는 **그대로 보존됩니다**.

### 이미 설치됐는데 실패·깨짐 / 재설치

설치가 과거에 한 번 됐다면 `git clone`이 디렉터리 충돌로 실패합니다. 또한 원격 저장소가 rewrite(force-push)된 경우 자동 업데이트가 `git pull --ff-only`로는 따라갈 수 없어 구버전에 멈춰 있을 수 있습니다.

가장 확실한 복구는 기존 설치를 지우고 one-liner를 다시 돌리는 것입니다:

```bash
cd ~/.claude/skills/openclone && ./uninstall
rm -f ~/.openclone/no-auto-update
# 그 후 위 설치 one-liner 재실행
```

### 업데이트

세션을 시작할 때마다 백그라운드에서 `git pull --ff-only`를 시도합니다 (1시간당 최대 1회, 네트워크·git 실패 시 조용히 skip). 직접 업데이트하려면:

```bash
cd ~/.claude/skills/openclone && git pull --ff-only
```

자동 업데이트를 끄려면:

```bash
touch ~/.openclone/no-auto-update
```

다시 켜려면 `rm ~/.openclone/no-auto-update`.

### 제거

```bash
cd ~/.claude/skills/openclone && ./uninstall
```

`~/.openclone/` 의 사용자 데이터(활성 클론 포인터, 직접 만든 클론, 수집한 지식)는 보존됩니다. 완전 제거하려면 추가로 `rm -rf ~/.openclone`.

---

## 사용법

모든 기능이 `/openclone` 하나에 서브명령으로 모여 있습니다.

```text
/openclone                                       # 홈 패널 — 카테고리별 클론 목록 + 번호
/openclone 1                                     # 홈 패널의 1번 클론 활성화
/openclone douglas                               # 이름으로 활성화 (이후 대화는 이 클론과 나눔)
/openclone stop                                  # 활성 클론 · 방 모두 종료
/openclone new hayun                             # 클론 생성 — 카테고리 1개 이상 선택 후 인터뷰
/openclone ingest https://blog/post              # 활성 클론에 지식 추가
/openclone room douglas alice bob                # 단체 대화방 — 가장 적합한 1명이 자동 응답
/openclone room add charlie                      # 방에 멤버 추가
/openclone room leave                            # 방 종료 (활성 클론은 유지)
/openclone panel vc "지금 투자를 받을 타이밍인가요?"   # 카테고리 패널
```

홈 패널이 떠 있는 동안 클론을 고르는 가장 빠른 방법은 `/openclone <번호>`. 클론 이름을 외우고 있으면 `/openclone <이름>`도 똑같이 동작합니다.

---

## 데이터 레이아웃

내장 클론과 사용자 클론은 **같은 폴더 구조**를 씁니다 — `clones/<name>/` 안에 `persona.md`와 `knowledge/`가 함께 있습니다. 루트만 다릅니다. 읽기 시점에 두 루트가 병합됩니다.

```text
<skill-root>/                           # ~/.claude/skills/openclone
└── clones/<name>/
    ├── persona.md                      # 내장 페르소나 (항상 설치됨)
    └── knowledge/                      # 내장 지식 (sparse-excluded — 활성화 시에만 fetch)
        └── YYYY-MM-DD-<topic>.md

~/.openclone/                           # 로컬 사용자 상태 (쓰기 가능)
├── active-clone                        # 현재 활성 클론 이름 (단일)
├── room                                # 단체 방의 멤버 (줄마다 한 명)
├── menu-context                        # 가장 최근 홈 패널의 번호↔이름 매핑 (JSON)
└── clones/<name>/
    ├── persona.md                      # 사용자가 만든 페르소나
    └── knowledge/
        └── YYYY-MM-DD-<topic>.md       # /openclone ingest가 append
```

**우선순위.**

- *페르소나*: 이름이 겹치면 **사용자 클론이 이김** — 홈 패널·use·패널 커맨드 모두에서 내장 클론을 덮어씁니다.
- *지식*: **누적형** — 훅은 활성 클론(또는 방 멤버 전원)의 두 knowledge 디렉터리를 모두 읽고, 같은 토픽이 여러 파일에 있을 경우 최신 날짜에 더 높은 가중치를 두도록 Claude에 지시합니다.
- *모드*: room이 열려 있으면 room이 우선. room이 닫혀 있고 active-clone이 있으면 단일 클론 모드. 둘 다 없으면 기본 Claude.

`persona.md` frontmatter에는 `categories: [founder, vc]`(리스트)가 포함됩니다. 필요하면 `## Category-specific framing` 섹션으로 카테고리별 강조를 덧붙일 수 있습니다. 순수 마크다운이므로 복사·수정·버전 관리·공유가 자유롭습니다.

지식 파일은 날짜와 토픽 이름이 붙은 형식(`2026-04-21-투자철학.md`)이며, 소스 메타데이터를 frontmatter에 둡니다. 저장은 append-only입니다: 같은 토픽을 이후에 다시 주입해도 덮어쓰지 않고 새 파일이 생기므로, 클론의 관점 변화가 그대로 보존됩니다.

## 카테고리 (v1 고정 목록)

| 코드 | 렌즈 |
| --- | --- |
| `vc` | 투자자 — 시장, 팀, 트랙션, 엑싯, 리스크 |
| `dev` | 엔지니어 — 설계, 성능, 유지보수성, 보안 |
| `founder` | 창업가 — 비즈니스 모델, 팀, 실행, 펀딩 |
| `pm` | 프로덕트 — 사용자, KPI, 우선순위, 로드맵 |
| `designer` | 디자이너 — UX, 비주얼, 브랜드, 프로토타입 |
| `writer` | 작가/편집자 — 구조, 명료성, 독자, 톤 |
| `marketing` | 마케터 — 오디언스, 포지셔닝, 채널, CAC |
| `hr` | 피플옵스 — 채용, 레벨링, 컬처, 리텐션 |

## 작동 방식

- 저장소 루트의 `SKILL.md`가 단일 디스패처. Claude Code는 `~/.claude/skills/openclone/SKILL.md`를 자동으로 인식하고, `$ARGUMENTS`의 첫 토큰으로 서브명령(`<name>` / `<N>` / `stop` / `new` / `ingest` / `room` / `panel`)을 분기합니다. 세부 로직은 `references/` 아래 워크플로 파일을 on-demand로 로드해 재사용합니다.
- `UserPromptSubmit` 훅(`hooks/inject-active-clone.sh`)이 매 메시지마다 `~/.openclone/room`과 `~/.openclone/active-clone`을 순서대로 확인합니다. 방이 열려 있으면 멤버 전원의 페르소나와 "가장 적절한 1명이 응답" 라우팅 규칙을 주입하고, 그렇지 않고 active-clone이 있으면 그 클론의 페르소나를 `primary_category` 렌즈와 함께 주입합니다. 둘 다 없으면 조용히 no-op.
- `/openclone panel <category>`는 현재 활성 상태를 무시하고, frontmatter `categories`에 그 카테고리를 포함한 **모든** 클론(내장 + 사용자)에게 질문을 전달합니다(이름 충돌 시 사용자 버전이 내장을 가립니다).
- 홈 패널·인터뷰·정제·패널·방 라우팅 관련 참조 워크플로우는 `references/` 아래에 있으며, 디스패처가 필요할 때 on-demand로 로드합니다.
- 내장 클론의 `persona.md`는 설치 시 항상 받지만, 지식은 `clones/<name>/knowledge/` 서브폴더에 있고 기본 sparse-checkout에서 제외됩니다(non-cone 패턴 `/*` + `!/clones/*/knowledge/`). `/openclone <name>`이 최초 호출될 때 `scripts/fetch-clone-knowledge.sh`가 `git sparse-checkout add clones/<name>/knowledge/`로 해당 클론 분만 당겨옵니다 (partial clone이라 blob도 on-demand).
- 세션 시작마다 `SessionStart` 훅(`scripts/session-update.sh`)이 백그라운드로 `git pull --ff-only`를 시도합니다 (1시간당 1회). 세션은 절대 블록되지 않고, 실패는 조용히 로그에 남깁니다.

## 로드맵 (잠정)

- 클론 공유 / 가져오기 — 다른 사람이 만든 클론 폴더를 간편히 설치
- 지식 내보내기·백업 — `~/.openclone/` 스냅샷과 복원
- 카테고리 커스터마이즈 — v1 고정 8개 외의 사용자 정의 카테고리 (v2 후보)
- 패널 응답 포맷 개선 — 비교 표, 합의/반대 지점 요약

구체적 우선순위와 디자인은 이슈/Discussions에서 논의합니다. PR 환영.

---

## 기여하기

버그 리포트·기능 제안·PR 모두 환영합니다. 가장 흔한 기여 — **새 클론 추가** — 는 아래 튜토리얼만 따라 해도 첫 PR까지 갈 수 있습니다. 커맨드·훅·카테고리 추가처럼 더 깊은 변경은 [CONTRIBUTING.md](CONTRIBUTING.md)에 정리돼 있습니다.

### 버그 리포트·기능 제안

이슈를 열 때 아래 정보가 있으면 훨씬 빠르게 고쳐집니다.

- Claude Code 버전, OS, openclone 커밋 해시(`cd ~/.claude/skills/openclone && git rev-parse HEAD`)
- 재현 절차 — 어떤 커맨드를 어떤 순서로 실행했고 무엇을 기대했는지
- 실제 결과·에러 메시지(있다면 `~/.openclone/last-update.log`도 함께)
- 해결 아이디어가 있다면 한 줄이라도 제안 — 없어도 괜찮습니다

### 새 클론 기여하기 (튜토리얼)

내장 클론은 `clones/<slug>/` 폴더 하나로 끝납니다. 아래 6단계를 따라가면 CI까지 통과하는 PR을 열 수 있습니다. 스펙 전체는 [references/clone-schema.md](references/clone-schema.md), 검증 규칙은 [.github/scripts/validate-clones.ts](.github/scripts/validate-clones.ts)에 있습니다.

#### 1. 폴더 만들기

`clones/<slug>/` 경로에 폴더를 만듭니다. `<slug>`는 소문자·영숫자·하이픈만 허용(`[a-z0-9-]+`)하며, 폴더 이름과 `persona.md`의 `name` 필드가 반드시 같아야 합니다.

```bash
mkdir -p clones/hyun
```

#### 2. persona.md 작성

아래는 그대로 복사해도 CI 검증(`validate-clones.ts`)을 통과하는 최소 예제입니다. 필수 frontmatter 키 6개(`name`, `display_name`, `tagline`, `categories`, `created`, `voice_traits`) + 본문 섹션 4개(`## Persona` → `## Speaking style` → `## Guidelines` → `## Background`)가 **순서대로** 들어가야 합니다.

```markdown
---
name: hyun                         # 폴더 이름과 동일한 슬러그(소문자, 영숫자·하이픈)
display_name: 김현                  # 목록과 패널에 표시될 이름
tagline: 백엔드 엔지니어·시스템 디자인    # 한 줄 소개 (80자 이하)
categories: [dev]                  # 고정 8개 중 1개 이상 (리스트 형식)
created: 2026-04-22                # ISO 날짜
voice_traits:                      # 3–5개의 짧은 톤 태그
  - concrete
  - trade-off-first
  - skeptical
---

## Persona

10년차 백엔드 엔지니어. 성능·신뢰성·유지보수성 중 하나는 반드시
포기해야 하는 순간이 온다고 믿는 사람. 문제를 풀기 전에 무엇이
진짜 제약인지부터 묻는다.

## Speaking style

- 결론 먼저, 근거는 뒤에 한두 줄
- "이게 왜 문제인가?"를 먼저 묻고 해결책으로 간다
- 모호한 용어는 구체 수치나 예로 바꿔서 되묻는다

## Guidelines

**Always:**
- 트레이드오프를 먼저 드러낸다
- 작고 검증 가능한 단계로 쪼갠다

**Never:**
- 측정 없이 "성능이 좋다"고 말하지 않는다
- 유행하는 기술 스택을 이유로 추천하지 않는다

## Background

- 10년차 백엔드, 최근 5년은 분산 시스템
- 트래픽 기반 스타트업에서 SRE 리드 경험
```

여러 카테고리에 걸친 클론(예: `founder`이면서 `vc`)을 만들고 싶다면 `## Category-specific framing` 섹션과 `primary_category` 키를 더합니다. 실전 예시는 [clones/douglas/persona.md](clones/douglas/persona.md)를 참고하세요.

#### 3. 카테고리 선택

`categories`는 아래 고정 8개 중에서만 고를 수 있습니다(위 카테고리 표 참고).

```text
vc · dev · founder · pm · designer · writer · marketing · hr
```

클론이 여러 카테고리에 속하면 각 `/openclone panel <category>` 호출에 모두 참여합니다. 패널마다 강조점이 달라야 한다면 `## Category-specific framing`을, 기본 렌즈를 지정하고 싶다면 `primary_category: <값>`(반드시 `categories` 안에 있는 값)을 frontmatter에 추가합니다.

#### 4. (선택) 지식 추가

클론이 이미 가진 배경지식을 함께 배포하고 싶다면 `clones/<slug>/knowledge/` 아래에 파일을 둡니다. 파일명은 **날짜 접두사 + 토픽 슬러그**: `YYYY-MM-DD-<topic>.md`. 같은 토픽을 나중에 다시 주입해도 **덮어쓰지 않고** 새 날짜 파일로 쌓입니다(append-only). frontmatter와 본문 규칙은 [references/clone-schema.md](references/clone-schema.md#knowledge-directory)를 따릅니다.

```text
clones/hyun/knowledge/
└── 2026-04-22-분산시스템-원칙.md
```

#### 5. 로컬 검증

PR 전에 CI와 동일한 검사를 돌려 실수를 잡습니다. Node 24+면 플래그 없이 바로, 22.6–23.5면 `--experimental-strip-types`가 필요합니다.

```bash
node .github/scripts/validate-clones.ts
# Node 22.6–23.5:
# NODE_OPTIONS="--experimental-strip-types" node .github/scripts/validate-clones.ts
```

통과하면 `[OK] N clone persona file(s) valid`가 출력됩니다.

#### 6. PR 열기

1. 이슈를 먼저 열어 범위를 맞추는 것을 권장합니다(사소한 오타 수정 제외).
2. 브랜치를 만들고(`feat/clone-<slug>` 같은 이름), 변경 사항을 커밋합니다. 메시지는 [Conventional Commits](https://www.conventionalcommits.org/) 권장 — 예: `feat(clones): add hyun`.
3. PR을 올리면 [.github/workflows/validate.yml](.github/workflows/validate.yml)이 자동으로 4개 검사(SKILL.md 메타데이터·클론 스키마·shellcheck·markdownlint)를 실행합니다.
4. 리뷰 후 squash merge 됩니다.

### 더 깊이 들어가기

- 로컬 개발 루프와 커맨드·훅·카테고리 추가: [CONTRIBUTING.md](CONTRIBUTING.md)
- 클론 스키마 전체 스펙: [references/clone-schema.md](references/clone-schema.md)
- 카테고리별 렌즈·톤 가이드: [references/categories.md](references/categories.md)
- 커뮤니티 행동 규범: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- 보안 이슈 제보: [SECURITY.md](SECURITY.md)

---

## 옵트인 정책 (실존 인물 클론)

openclone에 내장 배포되는 인물 클론(`clones/*/`)은 공개된 인터뷰·발언·글·강연 등 **공개 자료만을 바탕으로** 구성됩니다. 비공개 대화·사적 자료는 포함하지 않으며, 각 클론은 해당 인물의 "아바타"가 아니라 공개된 관점을 요약·재현하는 도구로만 배포됩니다.

### 본인이신 경우

내장 클론의 실제 당사자라면 언제든 아래 요청을 하실 수 있습니다.

- 본인 클론의 현재 상태 확인 — `persona.md`와 `knowledge/` 아래에 어떤 자료가 포함돼 있는지
- 특정 지식 파일(또는 문장·인용)의 수정·삭제
- 표기 정정 — `display_name`, `tagline`, 소속 등
- 페르소나 전체 제거 — 저장소에서 해당 클론 폴더를 삭제

### 문의 방법

두 가지 경로 중 편하신 쪽으로 연락해 주세요.

- **GitHub 이슈 템플릿** — [실존 인물 클론 옵트인 요청](https://github.com/taurin-inc/openclone/issues/new?template=opt_in_request.md) 을 사용하시면 요청 유형·대상 클론이 양식으로 정리됩니다. 공개 이슈이므로 사적 증빙은 올리지 마세요.
- **이메일** — `hayun@rapidstudio.dev`. 본인 인증용 사적 증빙(사원증·비공개 연락처 등)은 이쪽으로 부탁드립니다.

포함해 주시면 빠르게 처리됩니다.

- 본인 확인이 가능한 근거 (회사 이메일, 공개 SNS·프로필, 링크드인 등)
- 요청 유형 (확인 / 정정 / 삭제)
- 대상 클론의 slug(예: `douglas`) 또는 `display_name`

### 응답 목표

- **초기 응답:** 접수 후 **7일 이내**
- **합의된 변경:** 다음 릴리스에 반영. 제거 요청은 확인 즉시 저장소 커밋을 통해 즉시 처리합니다.
- 이미 사용자의 로컬 머신에 내려받힌 자료는 해당 사용자의 `git pull` 시점에 반영됩니다 (세션 시작 시 자동 업데이트).

## 상태

v2.0.0 — Standalone skill로 전환. 설치 경로가 `~/.claude/skills/openclone` 으로 이동했고, `/openclone` 이 네임스페이스 없이 직접 호출됩니다. 이슈·PR 환영.

---

## 크레딧

[팀어텐션 (Team Attention)](https://www.team-attention.com/)의 후원을 받아 제작됐어요.

## 라이선스

MIT — [LICENSE](LICENSE) 참고.
