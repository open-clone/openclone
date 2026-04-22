# 기여 안내

openclone에 기여해 주셔서 감사합니다. 이 문서는 로컬 개발 루프와 변경 유형별 작업 가이드, PR 절차를 다룹니다. 아키텍처 심화 설명은 [docs/architecture.md](docs/architecture.md)를 참고해 주세요.

## 로컬 개발 루프

openclone은 빌드 시스템도, 패키지 매니저도 없습니다. 저장소 자체가 **standalone Claude Code skill**이며, `~/.claude/skills/openclone/`에 설치되면 `SKILL.md`가 자동 인식됩니다.

설치 방법은 [README의 설치 섹션](README.md#설치)을 참고하세요. 개발 머신에서도 동일하게 설치해 두고 작업합니다.

편집 후:

- **SKILL.md·레퍼런스·클론 파일(`.md`)** 편집은 Claude Code에서 즉시 반영됩니다.
- **훅 스크립트(`hooks/*.sh`, `scripts/*.sh`)** 는 매 호출마다 경로가 새로 해석되므로 재시작 없이 바로 반영됩니다. 단, `setup`의 **훅 등록 자체를 바꿨다면** `./setup` 재실행이 필요하고, 첫 설치 직후에는 한 번의 Claude Code 세션 재시작이 필요합니다.

배포는 "main 브랜치에 커밋 → 사용자 머신에서 백그라운드 `git pull --ff-only`"가 전부입니다(`scripts/session-update.sh`가 세션 시작 시 자동 실행).

### 워크스페이스에서 작업할 때 (dev-link 오버레이)

설치 경로(`~/.claude/skills/openclone/`) 밖에 별도 체크아웃을 두고 작업하는 경우(예: conductor 워크스페이스, 일반 git 클론), 매번 수정 파일을 설치본으로 복사하지 않도록 **심볼릭 링크 오버레이**를 씁니다.

```bash
# 지금 편집 중인 파일만 설치본으로 연결 (복사 없이 라이브 반영)
./scripts/dev-link.sh references/panel-workflow.md
./scripts/dev-link.sh SKILL.md
./scripts/dev-link.sh references/   # 디렉터리 단위도 가능

# 원복 (저장소에 트래킹된 파일이면 git checkout으로 shipped 버전 복구)
./scripts/dev-unlink.sh references/panel-workflow.md
```

- 전달한 경로만 오버레이됩니다. 나머지 설치본의 sparse 상태(약 480KB)는 그대로 유지됩니다.
- 심볼릭 링크된 상태에서 `SessionStart` 훅의 자동 `git pull`이 설치 경로에 개입하지 않도록 `touch ~/.openclone/no-auto-update`를 한 번 실행해 두면 안전합니다. 배포 검증할 때는 `rm ~/.openclone/no-auto-update`로 다시 켭니다.

## 디렉터리 지도

```text
SKILL.md                 단일 디스패처 — 슬래시 커맨드 + 자연어 진입점
hooks/                   UserPromptSubmit 훅 (inject-active-clone.sh)
scripts/                 auto-update, URL·YouTube 인제스트, statusline, dev-link 등
references/              on-demand로 로드되는 워크플로우 문서
clones/                  내장 프리셋 클론 (읽기 전용)
assets/                  이미지·로고 등 리소스
docs/                    사람용 개발자 문서
setup / uninstall        설치·제거 스크립트 (settings.json의 훅·statusLine 등록/해제)
.github/scripts/         CI용 TypeScript 검증 스크립트
```

## 변경 유형별 가이드

### 새 서브명령 추가

openclone은 **하나의 슬래시 커맨드(`/openclone`)**만 가집니다. 새로운 기능은 `SKILL.md` 디스패처에 서브명령으로 추가합니다.

1. 루트 `SKILL.md`의 디스패치 테이블에 `<subcommand>` 케이스를 추가합니다.
2. 세부 워크플로우는 `references/<subcommand>-workflow.md`에 문서화하고, 디스패처에서 `Load ${CLAUDE_SKILL_DIR}/references/<subcommand>-workflow.md and follow it exactly.` 지시로 on-demand 로드하세요.
3. 자연어 트리거를 추가하고 싶다면 `SKILL.md` frontmatter의 `description`에 트리거 문구를 덧붙입니다.

새 `commands/*.md` 파일은 만들지 마세요. standalone skill에는 `commands/` 디렉터리가 없고, 추가해도 별도 슬래시 커맨드로 노출되지 않습니다.

### 새 레퍼런스 추가

`references/*.md`에 워크플로우 문서를 두고, `SKILL.md`에서 `Load ${CLAUDE_SKILL_DIR}/references/<name>.md`로 끌어씁니다. 이렇게 하면 각 서브명령의 컨텍스트를 작게 유지할 수 있습니다. 워크플로우 변경 시 `SKILL.md`를 건드릴 필요 없이 레퍼런스 하나만 고치면 됩니다.

### 새 내장 클론 추가

처음 기여하는 분은 [README의 튜토리얼](README.md#새-클론-기여하기-튜토리얼)을 먼저 따라가세요 — 복붙 가능한 예제와 6단계 워크플로우가 있습니다. 이 섹션은 두 번째·세 번째 클론을 만들 때 쓰는 **체크리스트 + 흔한 실수 사전**으로 포지셔닝돼 있습니다. 스키마 전체는 [references/clone-schema.md](references/clone-schema.md)가 단일 진실입니다.

#### 스키마 한눈에 보기

| 항목 | 필수 | 값 규칙 | 검증 위치 |
| --- | --- | --- | --- |
| `name` | 필수 | 폴더명과 동일한 슬러그 (`[a-z0-9-]+`) | `validate-clones.ts:14–21` |
| `display_name` | 필수 | 목록·패널에 표시되는 이름 | 같은 곳 |
| `tagline` | 필수 | 한 줄 소개(<80자) | 같은 곳 |
| `categories` | 필수 | 고정 8개 enum 중 1개 이상(리스트) | `validate-clones.ts:23`, `42–58` |
| `primary_category` | 선택 | `categories` 안에 있는 값 | `validate-clones.ts:60–63`, `121–126` |
| `created` | 필수 | ISO 날짜(`YYYY-MM-DD`) | `validate-clones.ts:14–21` |
| `voice_traits` | 필수 | 3–5개의 짧은 톤 태그 | 같은 곳 |
| `## Persona` | 필수 | 3–8문장 내러티브 | `validate-clones.ts:24`, `128–132` |
| `## Speaking style` | 필수 | 톤 bullet 리스트 | 같은 곳 |
| `## Guidelines` | 필수 | `**Always:**` + `**Never:**` | 같은 곳 |
| `## Background` | 필수 | 짧은 bullet 리스트 | 같은 곳 |
| `## Category-specific framing` | 선택 | `### As a <category>` 서브섹션들 | — (lint 없음) |

고정 카테고리 8개: `vc`, `dev`, `founder`, `pm`, `designer`, `writer`, `marketing`, `hr`. 이 외의 값은 CI가 잡습니다.

#### 카테고리 선택 가이드

- **단일 카테고리** — 클론의 관점·전문성이 하나로 뚜렷할 때. 예: 순수 엔지니어 → `[dev]`.
- **멀티 카테고리** — 한 사람이 두 역할을 실제로 경험했고, 패널마다 조명 각도가 달라져야 할 때. 예: 창업 후 투자자로 전환 → `[founder, vc]`. 이 경우 `## Category-specific framing`에 `### As a founder` / `### As a vc` 블록을 덧붙이면 패널 커맨드가 해당 블록을 집어 올립니다.
- **`primary_category`** — 멀티 카테고리 클론을 `/openclone <name>`로 활성화했을 때 **기본 렌즈**가 됩니다. 생략하면 `categories[0]`가 기본입니다. `primary_category` 값은 반드시 `categories` 안에 있어야 합니다(아니면 CI 실패).

#### 지식 함께 싣기

내장 지식을 배포에 포함하고 싶다면 `clones/<name>/knowledge/YYYY-MM-DD-<topic>.md` 형식으로 둡니다. 각 클론의 `knowledge/` 서브폴더는 설치 시 sparse-excluded(`!/clones/*/knowledge/`)이고 `/openclone <name>` 최초 호출 때만 fetch되므로, 내용이 많아도 설치 크기에는 영향이 없습니다. 파일 frontmatter·본문 규칙은 [references/clone-schema.md](references/clone-schema.md#knowledge-directory)를 따릅니다.

#### 흔한 실수 (CI가 잡는 것들)

- **`categories`를 문자열로 씀** — `categories: vc`(X), `categories: [vc]`(O). 단일 카테고리라도 리스트로.
- **`primary_category`가 `categories`에 없음** — `categories: [vc]`인데 `primary_category: founder`. CI가 `primary_category '<값>' not in categories` 로 실패시킵니다.
- **카테고리 오타·대문자** — `VC`·`engineer`·`Founder` 모두 실패. 8개 enum은 **소문자 정확 일치**.
- **본문 섹션 헤딩 누락·오타** — `## Persona`, `## Speaking style`, `## Guidelines`, `## Background` **모두** 필요. 하나라도 빠지면 실패. 레벨(`##` vs `###`)도 정확해야 합니다.
- **frontmatter 구분선 누락** — 파일 첫 줄이 `---`여야 하고, frontmatter 끝도 `---`로 닫아야 합니다.

#### 로컬 검증

PR 전에 CI와 동일한 검사를 한 줄로 돌릴 수 있습니다.

```bash
node .github/scripts/validate-clones.ts
```

Node 버전 이슈, 다른 검증 스크립트, shellcheck·markdownlint 실행법은 아래 [CI 로컬 재현](#ci-로컬-재현) 섹션을 참고하세요.

### 새 카테고리 추가 (v1은 고정)

카테고리를 늘리려면 다음 여섯 곳을 동시에 수정해야 합니다. 반만 반영하면 패널·홈 패널·인터뷰가 깨집니다. 디스패처(`SKILL.md`)는 카테고리 토큰을 그대로 `panel-workflow.md`에 넘기므로 여기서는 추가 작업이 없습니다.

1. `references/categories.md` 갱신
2. `references/home-workflow.md`의 섹션 순서에 새 카테고리 추가
3. `references/interview-workflow.md`의 Stage 1 안내문 + Stage 3 카테고리별 질문 블록 추가
4. 루트 `SKILL.md`의 디스패처가 해당 카테고리를 인식하도록 수정
5. `README.md` 카테고리 표 갱신
6. `.github/scripts/validate-clones.ts`의 `FIXED_CATEGORIES` 배열 갱신

### 훅 편집

- `hooks/inject-active-clone.sh`를 편집한 뒤에는 Claude Code에서 `/openclone <clone>` → 실제 메시지 전송으로 재현하세요. Room 모드를 건드렸다면 `/openclone room <a> <b>` 후 일반 메시지로도 한 번 점검합니다. 스크립트 본문 편집은 재시작 없이 반영되지만, `setup`이 settings.json에 등록하는 경로·커맨드를 바꿨다면 `./setup`을 다시 실행해야 합니다.
- heredoc 본문 안에 `'`(apostrophe)를 쓰면 셸 파싱이 깨집니다. 축약형(`clone's`) 대신 "this clone"이나 곡선 따옴표를 사용하세요.
- python3 경로와 sed/awk 폴백 두 가지 모두 점검해야 합니다(macOS는 기본적으로 python3 경로로만 돌아갑니다).

## 불변 원칙

- **fork-on-write** — `${CLAUDE_SKILL_DIR}/` 아래 내장 클론은 절대 수정하지 않습니다. 사용자가 내장 클론에 지식을 주입하면 `/openclone ingest`가 먼저 `~/.openclone/clones/`로 폴더를 복사하고 사용자 복사본만 편집합니다.
- **지식 append-only** — 같은 토픽의 이전 파일을 덮어쓰지 않습니다. 새 날짜의 파일이 새로 추가될 뿐입니다. 훅이 Claude에게 최신 파일에 더 높은 가중치를 두도록 지시합니다.
- **이모지 금지** — 클론 출력, SKILL.md, 레퍼런스, 문서 모두 이모지를 쓰지 않습니다(사용자가 명시적으로 요청한 경우 제외).
- **경로 추상화** — `SKILL.md`·레퍼런스에서 배포 파일은 `${CLAUDE_SKILL_DIR}`, 사용자 상태는 `$HOME/.openclone` 또는 `~/.openclone`. 스크립트 내부에서는 `install_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"`로 자기 경로를 해석합니다. 절대 경로 하드코딩 금지.

## 커밋 컨벤션

[Conventional Commits](https://www.conventionalcommits.org/)를 권장합니다.

- `feat:` 새 기능
- `fix:` 버그 수정
- `docs:` 문서 전용
- `chore:` 유지보수(메타데이터·설정)
- `refactor:` 동작 변경 없는 구조 개선
- `ci:` CI 설정

예: `feat(skill): add /openclone export`

## PR 절차

1. 이슈를 먼저 올려 범위와 접근을 정렬합니다(사소한 오타 수정 제외).
2. 브랜치를 만들어 작업합니다.
3. 변경 사항을 로컬 설치에 반영해 **수동 스모크 테스트**합니다(dev-link 오버레이 추천).
4. PR을 생성하면 `.github/workflows/validate.yml`이 자동으로 돌아갑니다. 실패하면 로그를 확인해 수정합니다.
5. 리뷰 반영 후 squash merge.

## CI 로컬 재현

PR 전에 로컬에서 같은 검사를 돌려볼 수 있습니다. 스킬 런타임은 마크다운 + 셸이지만 **검증 스크립트(`.github/scripts/*.ts`)는 TypeScript**입니다. `package.json`·`node_modules`는 없고 설치 단계도 없습니다 — Node만 있으면 바로 실행.

**Node 24+ (권장)** — 23.6부터 네이티브 TS 실행이 기본 켜져 있어 플래그 없이 바로 돕니다:

```bash
node .github/scripts/validate-skill.ts
node .github/scripts/validate-clones.ts
```

**Node 22.6 ~ 23.5** — `--experimental-strip-types` 플래그가 필요합니다. 한 번씩 붙여도 되고, 세션 전체에 적용하려면 환경변수로:

```bash
export NODE_OPTIONS="--experimental-strip-types"
node .github/scripts/validate-skill.ts
# …
```

나머지 두 검사:

```bash
shellcheck hooks/*.sh scripts/*.sh
npx markdownlint-cli2 "**/*.md"
```

Node는 `.ts` 파일의 타입 주석을 스트리핑해 그대로 실행합니다. 컴파일·빌드 단계는 없습니다.

## 행동 규범

기여자 커뮤니티는 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)를 따릅니다. 위반 신고는 `hayun@rapidstudio.dev`로 보내주세요.

## 보안

취약점을 발견했다면 공개 이슈 대신 [SECURITY.md](SECURITY.md)의 절차로 제보해 주세요.
