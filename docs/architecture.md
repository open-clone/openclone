# openclone 아키텍처 가이드 (컨트리뷰터용)

이 문서는 openclone이 내부적으로 어떻게 동작하는지 설명합니다. **사람 컨트리뷰터**가 코드 변경 전에 읽고 전체 그림을 잡는 것이 목표입니다. AI 코딩 에이전트용 요약은 루트의 [CLAUDE.md](../CLAUDE.md)에 별도로 있고, "어떻게 기여하나"는 [CONTRIBUTING.md](../CONTRIBUTING.md)에서 다룹니다.

## 한눈에 보기

openclone은 Claude Code **플러그인**입니다. 빌드 시스템은 없고, 저장소 자체가 플러그인 + 자체 호스팅 마켓플레이스입니다. 런타임은 세 가지 조각으로 이루어집니다.

1. **슬래시 커맨드** (`commands/*.md`) — 사용자가 명시적으로 호출하는 진입점.
2. **UserPromptSubmit 훅** (`hooks/inject-active-clone.sh`) — 매 메시지마다 실행되어, "활성 클론"이 있으면 페르소나를 Claude의 컨텍스트에 주입. **이 훅이 클론을 "살아 있게" 만드는 유일한 메커니즘입니다.**
3. **레퍼런스** (`references/*.md`) — 커맨드가 필요할 때 lazy-load 하는 워크플로우 문서.

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
│    ② ${CLAUDE_PLUGIN_ROOT}/clones/  │ ← 내장 (사용자에 없을 때만)
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

| 목적 | 내장 (read-only, 배포) | 사용자 (writable) |
| --- | --- | --- |
| 페르소나 | `${CLAUDE_PLUGIN_ROOT}/clones/<name>/persona.md` | `~/.openclone/clones/<name>/persona.md` |
| 지식 | `${CLAUDE_PLUGIN_ROOT}/clones/<name>/knowledge/` (sparse-excluded; `/openclone:use` 시 fetch) | `~/.openclone/clones/<name>/knowledge/` |
| 활성 포인터 | — | `~/.openclone/active-clone` (텍스트 파일, 내용은 클론 이름 한 줄) |

원칙:

- **이름 충돌 시 사용자가 이긴다.** 같은 `<name>`이 양쪽에 있으면 사용자 버전이 내장 버전을 완전히 가립니다(`/openclone:list`·`/openclone:use`·패널 모두).
- **내장 클론은 절대 수정하지 않는다.** `${CLAUDE_PLUGIN_ROOT}/` 아래 어떤 파일도 런타임에 변경되지 않습니다. 사용자가 내장 클론에 지식을 주입하면 `/openclone:ingest`가 먼저 **폴더 전체를 `~/.openclone/clones/`로 복사**(fork-on-write)한 다음, 새 복사본에만 씁니다.
- **지식은 append-only.** 파일 이름은 `YYYY-MM-DD-<topic>.md` 형식. 같은 토픽이 반복되어도 덮어쓰지 않고 새 날짜 파일이 추가됩니다. 훅은 Claude에게 "최신 파일을 더 무겁게, 오래된 파일도 배경 맥락으로 유효"하다고 지시합니다.

## 훅 생명주기 상세

`hooks/inject-active-clone.sh`는 다음 단계를 지납니다(`hooks/hooks.json`에 `UserPromptSubmit`으로 등록됨).

1. `~/.openclone/active-clone` 파일이 없거나 비어 있으면 → `{}` 출력 후 종료.
2. 파일이 있으면 클론 이름을 읽고 공백을 제거.
3. `CLAUDE_PLUGIN_ROOT` 환경변수(Claude Code가 플러그인 훅 실행 시 주입)로 플러그인 루트 결정. 없으면 스크립트 위치에서 역추적.
4. 사용자 클론(`~/.openclone/clones/<name>/persona.md`)을 먼저 확인. 있으면 `clone_origin=user`, 없으면 내장(`${CLAUDE_PLUGIN_ROOT}/clones/<name>/persona.md`)으로 폴백해 `clone_origin=built-in`.
5. `persona.md` 내용 + 최신성·카테고리 프레이밍·Web 조회 지침 등을 heredoc으로 조합.
6. JSON 문자열 이스케이프 — `python3`이 있으면 `json.dumps`, 없으면 `sed`/`awk` 폴백(macOS는 python3 경로 사용).
7. `{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"..."}}` 형태로 stdout에 방출.

파일 [hooks/inject-active-clone.sh](../hooks/inject-active-clone.sh)의 주석과 [references/clone-schema.md](../references/clone-schema.md)의 "Injection format" 섹션이 공식 사양입니다.

### 훅 편집 시 주의

- heredoc 본문에 `'`(apostrophe)가 들어가면 bash 파서가 혼란을 일으킵니다. 축약형(`clone's`) 대신 "this clone"으로 풀거나 곡선 따옴표를 사용하세요.
- `python3` 경로와 `sed/awk` 폴백 양쪽 모두에서 유효한 JSON을 내놓는지 점검해야 합니다. macOS 기본 환경은 python3 경로만 지나므로, 폴백은 별도 테스트가 필요합니다.
- 훅을 바꾼 뒤에는 **Claude Code 재시작**이 필요합니다. 커맨드나 레퍼런스 마크다운 편집과 달리 훅은 즉시 반영되지 않습니다.

## 슬래시 커맨드 구조

각 `commands/<name>.md`는 프론트매터 + 프롬프트 본문으로 구성된 마크다운 파일입니다.

```markdown
---
description: 사용자에게 보이는 한 줄 설명
allowed-tools: Bash, Read
argument-hint: "<required-arg>"    # 인자를 받는 커맨드에만
---

Claude가 실행할 프롬프트 본문.
여기에 `Load ${CLAUDE_PLUGIN_ROOT}/references/<name>.md` 같은 lazy-load 지시가 들어갑니다.
```

커맨드는 크게 두 부류:

- **액션 커맨드** — `new`, `use`, `list`, `ingest`, `stop`. 각자 고유한 본문 로직.
- **패널 커맨드** — `vc`, `dev`, `founder`, `pm`, `designer`, `writer`, `marketing`, `hr`. **얇은 스텁**입니다. 본문은 각 카테고리 코드를 고정하고 `references/panel-workflow.md`에 위임합니다.

패널 로직을 바꾸고 싶다면 패널 커맨드를 일일이 건드리지 말고, [references/panel-workflow.md](../references/panel-workflow.md) 한 파일만 수정하세요.

## 레퍼런스 lazy-load 패턴

`references/*.md`는 **자동 로드되지 않습니다**. 각 커맨드 본문이 `Load ${CLAUDE_PLUGIN_ROOT}/references/<name>.md and follow it exactly` 같은 지시를 통해 Claude에게 필요한 레퍼런스만 당겨오도록 합니다.

- 장점: 컨텍스트 경량화. 특정 커맨드에 필요한 워크플로우만 로드됨.
- 편집 원칙: 워크플로우 규칙은 레퍼런스에 두고, 커맨드 본문은 "어떤 레퍼런스를 불러와 따를 것인가"만 지시. 같은 워크플로우 코드가 6개 커맨드에 중복 복사되는 걸 방지.

현재 레퍼런스:

| 파일 | 역할 |
| --- | --- |
| [clone-schema.md](../references/clone-schema.md) | `persona.md` 프론트매터·본문 섹션·`knowledge/` 파일명 규약의 **진실 공급원** |
| [categories.md](../references/categories.md) | v1 고정 8개 카테고리 정의와 각 카테고리의 렌즈 |
| [interview-workflow.md](../references/interview-workflow.md) | `/openclone:new`의 인터뷰 진행 방식 |
| [panel-workflow.md](../references/panel-workflow.md) | `/openclone:<category>` 패널 커맨드의 공통 절차(이모지 금지 규칙 포함) |
| [refine-workflow.md](../references/refine-workflow.md) | `/openclone:ingest`의 정제·저장 규약(append-only, 날짜 파일명) |

## 새 기능 추가 워크스루

### 새 슬래시 커맨드 추가

1. `commands/<name>.md` 생성. 최소 프론트매터: `description`, `allowed-tools`. 인자를 받으면 `argument-hint`도 추가.
2. 본문에 프롬프트 작성. 규약이 복잡하면 별도 `references/<name>.md`에 빼고 `Load ...`로 끌어쓰기.
3. 자연어로도 부를 수 있게 하려면 [skills/openclone/SKILL.md](../skills/openclone/SKILL.md)의 트리거 설명에 추가.
4. [commands/list.md](../commands/list.md)가 frontmatter 스타일의 좋은 참고 샘플입니다.

### 새 내장 클론 추가

1. `clones/<name>/persona.md` 생성. 프론트매터는 [references/clone-schema.md](../references/clone-schema.md)를 엄격히 따릅니다:
   - 필수 키: `name`, `display_name`, `tagline`, `categories`, `created`, `voice_traits`
   - 선택: `primary_category`(지정 시 `categories`에 포함돼야 함)
2. 본문 섹션 순서: `## Persona` → `## Speaking style` → `## Guidelines` → `## Background`. 필요 시 `## Category-specific framing` 추가.
3. 내장 지식을 함께 싣는다면 `clones/<name>/knowledge/YYYY-MM-DD-<topic>.md` 형식으로 작성. 이 `knowledge/` 서브폴더는 install 시 sparse-excluded(`!/clones/*/knowledge/`)이고 `/openclone:use <name>` 최초 호출에만 fetch되므로 용량이 커도 install 무게에 영향 없습니다.
4. 프론트매터에 `created` 날짜를 ISO 형식으로 기입.
5. **import 푸터, "Knowledge index" 섹션 같은 후기를 본문에 넣지 않습니다.** 순수 페르소나 정의만.
6. CI의 `.github/scripts/validate-clones.ts`가 위 규칙을 자동 검사합니다 — 커밋 전에 로컬에서 돌려보면 안전합니다.

### 새 카테고리 추가 (v1은 고정 8개)

네 곳을 **동시에** 고쳐야 합니다. 반만 반영되면 패널·리스트·스킬이 어긋납니다.

1. `commands/<cat>.md` 신규 생성 — 기존 `commands/vc.md`를 복사해 카테고리 코드만 교체.
2. `references/categories.md` — 새 렌즈 정의 추가.
3. `skills/openclone/SKILL.md` — 자연어로도 트리거되도록 설명 추가.
4. `README.md` — 카테고리 표 갱신.
5. `.github/scripts/validate-clones.ts`의 `FIXED_CATEGORIES` Set에 새 값 추가.

## 주요 불변 원칙 (코드 인용)

### 1. Fork-on-write

훅의 폴백 로직([hooks/inject-active-clone.sh:46-54](../hooks/inject-active-clone.sh)):

```bash
if [ -f "${user_clone_dir}/persona.md" ]; then
  persona_md="${user_clone_dir}/persona.md"
  clone_origin="user"
elif [ -f "${builtin_clone_dir}/persona.md" ]; then
  persona_md="${builtin_clone_dir}/persona.md"
  clone_origin="built-in"
else
  emit_empty
fi
```

읽기는 **사용자 먼저**. 수정 요청이 오면 `/openclone:ingest`(또는 그에 상응하는 로직)가 먼저 사용자 네임스페이스로 폴더를 복사한 뒤 거기에만 씁니다. `${CLAUDE_PLUGIN_ROOT}/`는 런타임에 건드리지 않습니다.

### 2. Knowledge append-only

파일명 규약(`references/clone-schema.md`):

```text
clones/<name>/knowledge/YYYY-MM-DD-<topic-slug>.md
```

같은 토픽을 다시 주입해도 **새 파일이 추가될 뿐**입니다. 이전 파일을 수정·삭제하지 않습니다. 훅이 Claude에게 최신 파일에 더 높은 가중치를 주면서도 과거 파일을 유효한 배경으로 취급하도록 지시합니다.

이유: 클론의 관점 변화를 그대로 기록하기 위함. 과거에 왜 이렇게 생각했는지, 언제 어떻게 바뀌었는지 추적 가능해야 합니다.

### 3. 이모지 없음

클론 출력, 커맨드 정의, 레퍼런스, 문서 어디에도 이모지를 쓰지 않습니다. `references/panel-workflow.md`에 명시되어 있으며, 사용자 프롬프트가 명시적으로 이모지를 요청한 경우에만 예외입니다.

### 4. 경로 추상화

커맨드·훅·레퍼런스는 **절대 경로를 하드코딩하지 않습니다**.

- 플러그인 배포 파일 → `${CLAUDE_PLUGIN_ROOT}`
- 사용자 로컬 상태 → `$HOME/.openclone` 또는 `~/.openclone`

## 배포 모델

변경을 배포하는 흐름은 이렇게 단순합니다.

1. main 브랜치에 커밋·푸시.
2. 동작 변화가 있으면 `.claude-plugin/plugin.json`의 `version`을 수동으로 올리고 `CHANGELOG.md`에 엔트리 추가.
3. 사용자는 `/plugin marketplace update openclone`으로 새 버전을 받음.

빌드·번들·게시 단계는 없습니다. 저장소가 곧 플러그인입니다.

## 더 읽을거리

- [CLAUDE.md](../CLAUDE.md) — AI 코딩 에이전트용 아키텍처 요약(영문)
- [CONTRIBUTING.md](../CONTRIBUTING.md) — PR 절차, 로컬 개발 루프, CI 로컬 재현
- [references/clone-schema.md](../references/clone-schema.md) — 클론 파일의 공식 스키마
- [references/panel-workflow.md](../references/panel-workflow.md) — 패널 커맨드의 표준 절차
