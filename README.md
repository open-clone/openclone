# openclone

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)](.claude-plugin/plugin.json)

카테고리별 페르소나를 가진 AI 클론을 만들고, Claude Code 안에서 그 클론과 직접 대화합니다.

<!-- 데모 GIF 추가 예정 -->

## 무엇을 하는가

- **기본 내장 클론을 바로 사용** — 플러그인에 큐레이션된 프리셋 클론이 함께 배포됩니다(예: `douglas` / 권도균). 설치 직후 활성화하거나 패널 브로드캐스트로 질문할 수 있습니다.
- **나만의 클론 만들기** — 카테고리(`vc`, `dev`, `founder`, `pm`, `designer`, `writer`, `marketing`, `hr`) 하나 이상을 선택해 생성합니다. 하나의 클론은 여러 카테고리에 속할 수 있지만, 파일은 하나입니다.
- **대화할 클론 선택** — `/openclone:use <name>` 이후 보내는 모든 메시지는 그 클론의 목소리로 응답됩니다. 별도 명령이 필요 없습니다.
- **카테고리 전체에 질문** — `/openclone:vc "질문"`은 `vc`를 포함한 모든 클론(내장 + 사용자)에게 동시에 질문하고, 각 관점을 나란히 돌려줍니다.
- **지식 주입** — URL, YouTube 자막, 문서를 넣으면 `~/.openclone/` 아래에 일반 마크다운으로 저장됩니다. 내장 클론에 주입하면 사용자 네임스페이스로 자동 포크됩니다.

모든 데이터는 로컬 파일시스템에 있습니다. 서버도, 계정도, SaaS도 없습니다.

## 설치

두 가지 방법 중 하나를 고르세요.

### 옵션 A — Claude Code 안에서 설치 (권장)

Claude Code 세션에 아래 문단을 그대로 붙여넣으세요:

```text
Install openclone: run
  git clone --filter=blob:none --sparse --depth=1 https://github.com/taurin-inc/openclone.git ~/.claude/plugins/marketplaces/openclone && cd ~/.claude/plugins/marketplaces/openclone && git sparse-checkout set --no-cone '/*' '!/clones/*/knowledge/' && ./setup
then run /reload-plugins to activate. Add an "openclone" section to ~/.claude/CLAUDE.md briefly explaining what openclone is and listing the commands: /openclone:list, /openclone:use <name>, /openclone:stop, /openclone:new, /openclone:ingest, /openclone:vc, /openclone:dev, /openclone:founder, /openclone:pm, /openclone:designer, /openclone:writer, /openclone:marketing, /openclone:hr — with a one-line note that knowledge for a built-in clone is lazy-fetched on first /openclone:use. Finally, confirm the plugin loaded by running /openclone:list and show me the output.
```

Claude Code가 직접 클론·`./setup`·`/reload-plugins`를 실행하고, 앞으로의 세션에서 openclone을 자연스럽게 인식하도록 `~/.claude/CLAUDE.md`에 메모를 추가합니다.

### 옵션 B — 터미널에서 직접

```bash
git clone --filter=blob:none --sparse --depth=1 \
  https://github.com/taurin-inc/openclone.git \
  ~/.claude/plugins/marketplaces/openclone \
  && cd ~/.claude/plugins/marketplaces/openclone \
  && git sparse-checkout set --no-cone '/*' '!/clones/*/knowledge/' \
  && ./setup
```

설치 후 Claude Code 세션에서 `/reload-plugins`를 실행하거나 (안 집히면) 한 번 재시작하세요.

### 공통 동작

- Partial + sparse 클론이라 첫 설치는 가볍습니다 (수 MB, 지식 제외).
- 각 클론의 지식은 `/openclone:use <name>` 으로 활성화할 때 **필요한 것만** 내려받습니다.

### 업데이트

세션을 시작할 때마다 백그라운드에서 `git pull --ff-only`를 시도합니다 (1시간당 최대 1회, 네트워크·git 실패 시 조용히 skip). 직접 업데이트하려면:

```bash
cd ~/.claude/plugins/marketplaces/openclone && git pull --ff-only
```

자동 업데이트를 끄려면:

```bash
touch ~/.openclone/no-auto-update
```

다시 켜려면 `rm ~/.openclone/no-auto-update`.

### 제거

```bash
cd ~/.claude/plugins/marketplaces/openclone && ./uninstall
```

`~/.openclone/` 의 사용자 데이터(활성 클론 포인터, 직접 만든 클론, 수집한 지식)는 보존됩니다. 완전 제거하려면 추가로 `rm -rf ~/.openclone`.

## 사용법

```text
/openclone:new hayun                    # 클론 생성 — 카테고리 1개 이상 선택 후 인터뷰 진행
/openclone:use hayun                    # 클론 활성화 — 이후 대화는 이 클론과 나눔
/openclone:stop                         # 비활성화
/openclone:list                         # 모든 클론과 카테고리 목록
/openclone:ingest https://blog/post     # 활성 클론에 지식 추가
/openclone:vc "지금 투자를 받을 타이밍인가요?"  # 패널: vc 카테고리를 포함한 모든 클론이 응답
```

## 데이터 레이아웃

내장 클론과 사용자 클론은 **같은 폴더 구조**를 씁니다 — `clones/<name>/` 안에 `persona.md`와 `knowledge/`가 함께 있습니다. 루트만 다릅니다. 읽기 시점에 두 루트가 병합됩니다.

```text
<plugin-root>/                          # ~/.claude/plugins/marketplaces/openclone
└── clones/<name>/
    ├── persona.md                      # 내장 페르소나 (항상 설치됨)
    └── knowledge/                      # 내장 지식 (sparse-excluded — 활성화 시에만 fetch)
        └── YYYY-MM-DD-<topic>.md

~/.openclone/                           # 로컬 사용자 상태 (쓰기 가능)
├── active-clone                        # 현재 활성 클론 이름
└── clones/<name>/
    ├── persona.md                      # 사용자가 만든 페르소나
    └── knowledge/
        └── YYYY-MM-DD-<topic>.md       # /openclone:ingest가 append
```

**우선순위.**

- *페르소나*: 이름이 겹치면 **사용자 클론이 이김** — `/openclone:list`·`/openclone:use`·패널 커맨드 모두에서 내장 클론을 덮어씁니다.
- *지식*: **누적형** — 훅은 활성 클론의 두 knowledge 디렉터리를 모두 읽고, 같은 토픽이 여러 파일에 있을 경우 최신 날짜에 더 높은 가중치를 두도록 Claude에 지시합니다.

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

- 각 `/openclone:*` 커맨드는 `commands/` 아래의 순수 마크다운 커맨드 파일입니다.
- `UserPromptSubmit` 훅(`hooks/inject-active-clone.sh`)이 매 메시지마다 `~/.openclone/active-clone`(클론 이름만 기록됨)을 읽습니다. 설정돼 있으면 클론 파일을 해석해(사용자 → 내장 순) 해당 페르소나를 additional context로 주입하여, Claude가 그 클론으로 응답하고 `primary_category` 렌즈를 기본 관점으로 삼습니다. 비활성 상태라면 조용히 아무 일도 하지 않습니다.
- 패널 커맨드(`/openclone:vc`, `/openclone:dev`, …)는 활성 클론을 무시하고, frontmatter `categories`에 해당 카테고리를 포함한 **모든** 클론(내장 + 사용자)에게 질문을 전달합니다(이름 충돌 시 사용자 버전이 내장을 가립니다).
- 인터뷰·정제·패널 관련 참조 워크플로우는 `references/` 아래에 있으며, Claude가 필요할 때 on-demand로 로드합니다.
- 내장 클론의 `persona.md`는 설치 시 항상 받지만, 지식은 `clones/<name>/knowledge/` 서브폴더에 있고 기본 sparse-checkout에서 제외됩니다(non-cone 패턴 `/*` + `!/clones/*/knowledge/`). `/openclone:use <name>` 이 최초 호출될 때 `scripts/fetch-clone-knowledge.sh`가 `git sparse-checkout add clones/<name>/knowledge/`로 해당 클론 분만 당겨옵니다 (partial clone이라 blob도 on-demand).
- 세션 시작마다 `SessionStart` 훅(`scripts/session-update.sh`)이 백그라운드로 `git pull --ff-only`를 시도합니다 (1시간당 1회). 세션은 절대 블록되지 않고, 실패는 조용히 로그에 남깁니다.

## 로드맵 (잠정)

- 클론 공유 / 가져오기 — 다른 사람이 만든 클론 폴더를 간편히 설치
- 지식 내보내기·백업 — `~/.openclone/` 스냅샷과 복원
- 카테고리 커스터마이즈 — v1 고정 8개 외의 사용자 정의 카테고리 (v2 후보)
- 패널 응답 포맷 개선 — 비교 표, 합의/반대 지점 요약

구체적 우선순위와 디자인은 이슈/Discussions에서 논의합니다. PR 환영.

## 기여하기

버그 리포트·기능 제안·PR 모두 환영합니다. 가장 흔한 기여 — **새 클론 추가** — 는 아래 튜토리얼만 따라 해도 첫 PR까지 갈 수 있습니다. 커맨드·훅·카테고리 추가처럼 더 깊은 변경은 [CONTRIBUTING.md](CONTRIBUTING.md)에 정리돼 있습니다.

### 버그 리포트·기능 제안

이슈를 열 때 아래 정보가 있으면 훨씬 빠르게 고쳐집니다.

- Claude Code 버전, OS, openclone 버전(`~/.claude/plugins/marketplaces/openclone/.claude-plugin/plugin.json`의 `version`)
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

클론이 여러 카테고리에 속하면 각 `/openclone:<category>` 패널 커맨드에 모두 호출됩니다. 패널마다 강조점이 달라야 한다면 `## Category-specific framing`을, 기본 렌즈를 지정하고 싶다면 `primary_category: <값>`(반드시 `categories` 안에 있는 값)을 frontmatter에 추가합니다.

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
3. PR을 올리면 [.github/workflows/validate.yml](.github/workflows/validate.yml)이 자동으로 5개 검사(플러그인 메타데이터·커맨드·클론 스키마·shellcheck·markdownlint)를 실행합니다.
4. 리뷰 후 squash merge 됩니다.

### 더 깊이 들어가기

- 로컬 개발 루프와 커맨드·훅·카테고리 추가: [CONTRIBUTING.md](CONTRIBUTING.md)
- 클론 스키마 전체 스펙: [references/clone-schema.md](references/clone-schema.md)
- 카테고리별 렌즈·톤 가이드: [references/categories.md](references/categories.md)
- 커뮤니티 행동 규범: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- 보안 이슈 제보: [SECURITY.md](SECURITY.md)

## 상태

v0.0.1 — 초기 공개 버전입니다. 거친 부분이 많으니 이슈와 PR 환영합니다.

## 라이선스

MIT — [LICENSE](LICENSE) 참고.
