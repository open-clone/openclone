# openclone 아키텍처 가이드 (컨트리뷰터용)

이 문서는 openclone이 내부적으로 어떻게 동작하는지 설명합니다. **사람 컨트리뷰터**가 코드 변경 전에 읽고 전체 그림을 잡는 것이 목표입니다. AI 코딩 에이전트용 요약은 루트의 [CLAUDE.md](../CLAUDE.md)에 별도로 있고, "어떻게 기여하나"는 [CONTRIBUTING.md](../CONTRIBUTING.md)에서 다룹니다.

## 한눈에 보기

openclone은 **Claude Code standalone skill**입니다. 빌드 시스템은 없고, 저장소 자체가 스킬 디렉터리(`~/.claude/skills/openclone/`)에 그대로 매핑됩니다. 플러그인 매니페스트(`.claude-plugin/`)나 마켓플레이스 등록은 없으며, Claude Code가 `~/.claude/skills/<name>/SKILL.md`를 자동 탐지해 `/openclone` 슬래시 커맨드로 노출합니다(standalone skill은 플러그인 커맨드와 달리 네임스페이스 prefix가 붙지 않습니다).

런타임은 세 가지 조각으로 이루어집니다.

1. **단일 디스패처 `SKILL.md`** (루트) — `/openclone` 슬래시 커맨드와 자연어 진입점을 겸합니다. 사용자가 명시적으로 호출하거나 description의 트리거 문구에 매칭되면 실행됩니다.
2. **UserPromptSubmit 훅** (`hooks/inject-active-clone.sh`) — 매 메시지마다 실행되어, "활성 클론" 또는 "room"이 있으면 페르소나를 Claude의 컨텍스트에 주입. **이 훅이 클론을 "살아 있게" 만드는 유일한 메커니즘입니다.**
3. **레퍼런스** (`references/*.md`) — 디스패처가 필요할 때 lazy-load 하는 워크플로우 문서.

사용자 데이터(활성 클론 포인터, 사용자 클론, 인제스트한 지식)는 전부 `~/.openclone/` 아래 로컬 파일시스템에 있습니다. 서버도, DB도, 네트워크 API도 없습니다(지식 인제스트 시 원문 URL/YouTube 가져오기는 예외).

## 데이터 흐름 (활성 클론으로 대화할 때)

```text
사용자가 메시지 입력
        │
        ▼
┌─────────────────────────────────────┐
│ UserPromptSubmit 훅                 │
│ hooks/inject-active-clone.sh        │
│                                     │
│ 1. ~/.openclone/active-clone 읽기   │
│    (없으면 빈 JSON 반환 — no-op)    │
│                                     │
│ 2. 클론 폴더 해결                   │
│    ① ~/.openclone/clones/<name>/    │ ← 사용자 (먼저 확인)
│    ② ${CLAUDE_SKILL_DIR}/clones/    │ ← 내장 (사용자에 없을 때만)
│                                     │
│ 3. persona.md 읽어 페르소나 지시문  │
│    + 두 knowledge/ 경로 + 최신성    │
│    가중 지시를 additionalContext로  │
│    묶어 stdout에 JSON 방출          │
└─────────────────────────────────────┘
        │
        ▼
Claude가 additionalContext를 받아 그 클론으로 응답
```

훅이 실패하든 활성 클론이 없든 출력은 항상 **유효한 JSON**이고 종료 코드는 0입니다. 실패 시엔 `{}`만 뱉어 조용히 무시됩니다 — 훅 때문에 대화가 멈추는 일이 없도록.

## 2-루트 데이터 모델

두 루트가 **읽을 때 병합**됩니다. 내장과 사용자 레이아웃은 **구조가 동일**하고(둘 다 `clones/<name>/{persona.md, knowledge/}`), 내장 쪽만 sparse-checkout non-cone 모드(`/*` + `!/clones/*/knowledge/`)로 각 클론의 `knowledge/` 서브폴더를 기본 제외하여 lazy-fetch 합니다.

`${CLAUDE_SKILL_DIR}`는 `SKILL.md` 안에서 Claude Code가 치환하는 심볼이며, 실제 경로는 설치 위치(`~/.claude/skills/openclone`)입니다. 스크립트 내부에서는 이 심볼 대신 `install_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"` 패턴으로 자기 위치를 해석합니다(훅이나 자식 프로세스로 전달된다는 보장이 없기 때문).

| 목적 | 내장 (read-only, 배포) | 사용자 (writable) |
| --- | --- | --- |
| 페르소나 | `${CLAUDE_SKILL_DIR}/clones/<name>/persona.md` | `~/.openclone/clones/<name>/persona.md` |
| 지식 | `${CLAUDE_SKILL_DIR}/clones/<name>/knowledge/` (sparse-excluded; `/openclone <name>` 시 fetch) | `~/.openclone/clones/<name>/knowledge/` |
| 활성 포인터 | — | `~/.openclone/active-clone` (텍스트 파일, 내용은 클론 이름 한 줄) |
| Room 로스터 | — | `~/.openclone/room` (한 줄에 클론 한 명. 존재하고 비어있지 않으면 room 모드 — 훅이 active-clone보다 우선) |
| 홈 패널 메뉴 컨텍스트 | — | `~/.openclone/menu-context` (마지막 홈 패널의 번호→이름 JSON, `/openclone <N>` 해석용) |

원칙:

- **이름 충돌 시 사용자가 이긴다.** 같은 `<name>`이 양쪽에 있으면 사용자 버전이 내장 버전을 완전히 가립니다(홈 패널·활성화·패널 모두).
- **내장 클론은 절대 수정하지 않는다.** `${CLAUDE_SKILL_DIR}/` 아래 어떤 파일도 런타임에 변경되지 않습니다. 사용자가 내장 클론에 지식을 주입하면 `/openclone ingest`가 먼저 **폴더 전체를 `~/.openclone/clones/`로 복사**(fork-on-write)한 다음, 새 복사본에만 씁니다.
- **지식은 append-only.** 파일 이름은 `YYYY-MM-DD-<topic>.md` 형식. 같은 토픽이 반복되어도 덮어쓰지 않고 새 날짜 파일이 추가됩니다. 훅은 Claude에게 "최신 파일을 더 무겁게, 오래된 파일도 배경 맥락으로 유효"하다고 지시합니다.

## 훅 생명주기 상세

`hooks/inject-active-clone.sh`는 `UserPromptSubmit` 이벤트에 `./setup`이 등록한 항목으로 실행됩니다(등록 위치: `~/.claude/settings.json`의 `hooks.UserPromptSubmit` 배열, 내부 command dict에 `_openclone_managed: true` 표식). **두 모드**가 있으며 먼저 맞는 쪽이 이깁니다: room > active-clone.

공통 전처리

1. `install_dir`은 스크립트 자신의 `BASH_SOURCE` 경로에서 역추적합니다 (환경변수에 의존하지 않습니다).
2. `force-push-detected` 배너 유무 확인(모든 경로에서 포함).

Room 분기

1. `~/.openclone/room`이 존재하고 비어 있지 않으면 각 줄을 클론 이름으로 읽어 `resolve_clone`에 넘겨 persona 경로 + 양쪽 knowledge 디렉터리를 확보. 존재하지 않는 이름은 조용히 skip.
2. 유효한 멤버가 최소 1명이면 `<openclone-room>` 블록으로 방출 — 라우팅 규칙(기본 1명·최대 2명·절대 0명 아님), 포맷 규칙, 각 멤버의 persona 전문을 heredoc으로 조합해 JSON 이스케이프 후 출력하고 종료.
3. 멤버가 전부 깨졌으면 active-clone 분기로 fall-through.

Active-clone 분기

1. `~/.openclone/active-clone` 파일이 없거나 비어 있으면 → `{}`만 출력 후 종료.
2. 이름을 읽어 `resolve_clone`으로 user(우선) → built-in 순으로 persona 경로 확보. 둘 다 없으면 빈 JSON.
3. `persona.md` 내용 + 최신성·카테고리 프레이밍·Web 조회 지침을 heredoc으로 조합.

공통 후처리

1. JSON 문자열 이스케이프 — `python3`이 있으면 `json.dumps`, 없으면 `sed`/`awk` 폴백(macOS는 python3 경로 사용).
2. `{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"..."}}` 형태로 stdout에 방출.

파일 [hooks/inject-active-clone.sh](../hooks/inject-active-clone.sh)의 주석, [references/clone-schema.md](../references/clone-schema.md)의 "Injection format" 섹션, [references/room-workflow.md](../references/room-workflow.md)의 "Runtime routing" 섹션이 공식 사양입니다.

### 훅 편집 시 주의

- heredoc 본문에 `'`(apostrophe)가 들어가면 bash 파서가 혼란을 일으킵니다. 축약형(`clone's`) 대신 "this clone"으로 풀거나 곡선 따옴표를 사용하세요.
- `python3` 경로와 `sed/awk` 폴백 양쪽 모두에서 유효한 JSON을 내놓는지 점검해야 합니다. macOS 기본 환경은 python3 경로만 지나므로, 폴백은 별도 테스트가 필요합니다.
- 훅 스크립트 **본문**을 편집한 경우 경로가 매 호출마다 새로 해석되므로 재시작 없이 반영됩니다. 훅 **등록**(setup이 settings.json에 쓰는 항목)을 바꿨다면 `./setup`을 다시 실행해야 합니다.

## 슬래시 커맨드 구조

openclone은 **단 하나의 슬래시 커맨드(`/openclone`)**만 가집니다 — 루트의 `SKILL.md`가 그것입니다. 프론트매터(`name`·`description`·`allowed-tools`·`argument-hint`) + 프롬프트 본문으로 구성되며, 본문이 `$ARGUMENTS`의 첫 토큰을 읽어 서브액션으로 분기합니다.

```text
$1 값                   → 동작                    → 로드할 레퍼런스
───────────────────────────────────────────────────────────────────
(없음)                  → 홈 패널                 → references/home-workflow.md
<N> (숫자)              → 메뉴 선택(활성화)        → menu-context 해석
stop                    → 활성 클론 + room 정리   → 인라인
new [<name>]            → 클론 생성 인터뷰        → references/interview-workflow.md
ingest <source>         → 지식 ingest             → references/refine-workflow.md
room <a> [<b>...]       → 단체 대화방 설정         → references/room-workflow.md
panel <category> "<q>"  → 카테고리 패널            → references/panel-workflow.md
<clone-name>            → 해당 클론 활성화         → 인라인 (fetch-clone-knowledge.sh)
```

새 서브액션을 추가하고 싶다면 `SKILL.md`의 분기 표를 확장하고, 로직은 새 `references/<name>-workflow.md`에 두세요. 별도의 `commands/*.md` 파일은 **추가하지 않습니다** — standalone skill에는 `commands/` 디렉터리가 없고, 사용자가 기억해야 하는 엔트리는 `/openclone` 하나뿐이어야 합니다.

## 레퍼런스 lazy-load 패턴

`references/*.md`는 **자동 로드되지 않습니다**. `SKILL.md`가 `Load ${CLAUDE_SKILL_DIR}/references/<name>.md and follow it exactly` 같은 지시를 통해 Claude에게 필요한 레퍼런스만 당겨오도록 합니다.

- 장점: 컨텍스트 경량화. 특정 서브액션에 필요한 워크플로우만 로드됨.
- 편집 원칙: 워크플로우 규칙은 레퍼런스에 두고, `SKILL.md` 본문은 "어떤 레퍼런스를 불러와 따를 것인가"만 지시. 같은 워크플로우 코드가 디스패처 안에 중복 복사되는 걸 방지.

현재 레퍼런스:

| 파일 | 역할 |
| --- | --- |
| [clone-schema.md](../references/clone-schema.md) | `persona.md` 프론트매터·본문 섹션·`knowledge/` 파일명 규약의 **진실 공급원** |
| [categories.md](../references/categories.md) | v1 고정 8개 카테고리 정의와 각 카테고리의 렌즈 |
| [home-workflow.md](../references/home-workflow.md) | `/openclone`(인자 없음) 시 홈 패널을 렌더링하고 `menu-context`를 기록하는 절차 |
| [interview-workflow.md](../references/interview-workflow.md) | `/openclone new`의 인터뷰 진행 방식 |
| [panel-workflow.md](../references/panel-workflow.md) | `/openclone panel <category>`의 공통 절차(이모지 금지 규칙 포함) |
| [refine-workflow.md](../references/refine-workflow.md) | `/openclone ingest`의 정제·저장 규약(append-only, 날짜 파일명) |
| [room-workflow.md](../references/room-workflow.md) | `/openclone room` 로스터 관리 + 훅이 주입할 그룹챗 라우팅 규칙 |

## 새 기능 추가 워크스루

### 새 서브액션 추가 (디스패처 확장)

v1.0 이후 새 동작은 전부 `/openclone <sub>`의 새 분기로 들어갑니다. 독립 커맨드 파일을 만들지 마세요.

1. 로직을 새 `references/<name>-workflow.md`에 작성. `$ARGUMENTS` 해석·에러 메시지·출력 포맷까지 포함해 완결형으로.
2. `SKILL.md` 상단의 분기 표에 한 줄 추가 → 본문에 `## <name>` 섹션 추가해 "$2 이후를 `<name>-workflow.md`로 넘겨라" 정도만 지시.
3. 자연어 진입점을 추가하고 싶다면 `SKILL.md` frontmatter의 `description`에 트리거 문구를 더합니다.
4. 상태 파일을 쓰는 서브액션이라면 `~/.openclone/` 아래 파일명을 결정하고, 훅이 읽어야 하면 `hooks/inject-active-clone.sh`의 분기 순서(room > active-clone)에 편입.

### 새 내장 클론 추가

1. `clones/<name>/persona.md` 생성. 프론트매터는 [references/clone-schema.md](../references/clone-schema.md)를 엄격히 따릅니다:
   - 필수 키: `name`, `display_name`, `tagline`, `categories`, `created`, `voice_traits`
   - 선택: `primary_category`(지정 시 `categories`에 포함돼야 함)
2. 본문 섹션 순서: `## Persona` → `## Speaking style` → `## Guidelines` → `## Background`. 필요 시 `## Category-specific framing` 추가.
3. 내장 지식을 함께 싣는다면 `clones/<name>/knowledge/YYYY-MM-DD-<topic>.md` 형식으로 작성. 이 `knowledge/` 서브폴더는 install 시 sparse-excluded(`!/clones/*/knowledge/`)이고 `/openclone <name>` 최초 호출에만 fetch되므로 용량이 커도 install 무게에 영향 없습니다.
4. 프론트매터에 `created` 날짜를 ISO 형식으로 기입.
5. **import 푸터, "Knowledge index" 섹션 같은 후기를 본문에 넣지 않습니다.** 순수 페르소나 정의만.
6. CI의 `.github/scripts/validate-clones.ts`가 위 규칙을 자동 검사합니다 — 커밋 전에 로컬에서 돌려보면 안전합니다.

### 새 카테고리 추가 (v1은 고정 8개)

디스패처는 카테고리 토큰을 그대로 `panel-workflow.md`에 넘기므로 `SKILL.md` 본문을 특별히 건드릴 필요는 없습니다. 다만 여섯 곳을 **동시에** 고쳐야 패널·홈·인터뷰·스킬·README가 일관됩니다.

1. `references/categories.md` — 새 렌즈 정의 추가.
2. `references/home-workflow.md` — 섹션 순서 목록에 새 카테고리 추가.
3. `references/interview-workflow.md` — Stage 1 안내문과 Stage 3 카테고리별 질문 블록 추가.
4. 루트 `SKILL.md` — 자연어 트리거 및 카테고리 validation이 있으면 추가.
5. `README.md` — 카테고리 표 갱신.
6. `.github/scripts/validate-clones.ts`의 `FIXED_CATEGORIES` Set에 새 값 추가.

## 주요 불변 원칙

### 1. Fork-on-write

훅의 persona 해결 로직(`hooks/inject-active-clone.sh`의 `resolve_clone` 함수):

```bash
resolve_clone() {
  local name="$1"
  local user_dir="$HOME/.openclone/clones/${name}"
  local builtin_dir="${install_dir}/clones/${name}"
  if [ -f "${user_dir}/persona.md" ]; then
    printf 'user\t%s\t%s\t%s\n' "${user_dir}/persona.md" "${user_dir}/knowledge" "${builtin_dir}/knowledge"
    return 0
  fi
  if [ -f "${builtin_dir}/persona.md" ]; then
    printf 'built-in\t%s\t%s\t%s\n' "${builtin_dir}/persona.md" "${user_dir}/knowledge" "${builtin_dir}/knowledge"
    return 0
  fi
  return 1
}
```

읽기는 **사용자 먼저**. 수정 요청이 오면 `/openclone ingest`(또는 그에 상응하는 로직)가 먼저 사용자 네임스페이스로 폴더를 복사한 뒤 거기에만 씁니다. `${CLAUDE_SKILL_DIR}/`는 런타임에 건드리지 않습니다.

### 2. Knowledge append-only

파일명 규약(`references/clone-schema.md`):

```text
clones/<name>/knowledge/YYYY-MM-DD-<topic-slug>.md
```

같은 토픽을 다시 주입해도 **새 파일이 추가될 뿐**입니다. 이전 파일을 수정·삭제하지 않습니다. 훅이 Claude에게 최신 파일에 더 높은 가중치를 주면서도 과거 파일을 유효한 배경으로 취급하도록 지시합니다.

이유: 클론의 관점 변화를 그대로 기록하기 위함. 과거에 왜 이렇게 생각했는지, 언제 어떻게 바뀌었는지 추적 가능해야 합니다.

### 3. 이모지 없음

클론 출력, SKILL.md, 레퍼런스, 문서 어디에도 이모지를 쓰지 않습니다. `references/panel-workflow.md`에 명시되어 있으며, 사용자 프롬프트가 명시적으로 이모지를 요청한 경우에만 예외입니다.

### 4. 경로 추상화

`SKILL.md`·레퍼런스는 **절대 경로를 하드코딩하지 않습니다**.

- 스킬 배포 파일 → `${CLAUDE_SKILL_DIR}`
- 사용자 로컬 상태 → `$HOME/.openclone` 또는 `~/.openclone`

스크립트 내부에서는 `install_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"`로 자기 경로를 해석합니다. 환경변수(`CLAUDE_SKILL_DIR`)가 자식 프로세스로 전달된다는 보장이 없기 때문입니다.

## 배포 모델

변경을 배포하는 흐름은 이렇게 단순합니다.

1. main 브랜치에 커밋·푸시.
2. 사용자 머신에서는 세션이 시작될 때마다 `scripts/session-update.sh`가 백그라운드로 `git pull --ff-only`를 돌려 최신 main으로 맞춰둡니다(1시간 쓰로틀, 네트워크 실패 시 조용히 skip).
3. main이 force-push된 경우 자동 업데이트는 멈추고 force-push 배너가 표시됩니다 — 사용자는 재설치 one-liner를 돌려야 합니다.

빌드·번들·게시 단계는 없습니다. 저장소가 곧 스킬입니다.

## 더 읽을거리

- [CLAUDE.md](../CLAUDE.md) — AI 코딩 에이전트용 아키텍처 요약(영문)
- [CONTRIBUTING.md](../CONTRIBUTING.md) — PR 절차, 로컬 개발 루프, CI 로컬 재현
- [references/clone-schema.md](../references/clone-schema.md) — 클론 파일의 공식 스키마
- [references/panel-workflow.md](../references/panel-workflow.md) — 패널 커맨드의 표준 절차
