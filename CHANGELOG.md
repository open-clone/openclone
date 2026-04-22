# Changelog

이 파일은 openclone의 모든 주요 변경사항을 기록합니다.

본 프로젝트는 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/) 포맷을 따르고, 버전은 [SemVer](https://semver.org/lang/ko/) 간이 적용을 따릅니다 (v1 이전에는 동작 변경 시 minor, 호환성 깨짐 시 major).

## [Unreleased]

### Changed (breaking)

- **단일 `/openclone` 디스패처로 통합.** 기존 13개 커맨드(`/openclone:list`, `/openclone:use`, `/openclone:stop`, `/openclone:new`, `/openclone:ingest`, `/openclone:vc`, `/openclone:dev`, `/openclone:founder`, `/openclone:pm`, `/openclone:designer`, `/openclone:writer`, `/openclone:marketing`, `/openclone:hr`)을 모두 제거하고 `/openclone <sub>` 하나로 흡수했습니다. 매핑: 홈 패널=`/openclone`, 활성화=`/openclone <name>` 또는 `/openclone <N>`, 종료=`/openclone stop`, 신규=`/openclone new`, 지식=`/openclone ingest`, 패널=`/openclone panel <category>`.
- 홈 패널 UX 도입 — 인자 없이 `/openclone`을 호출하면 카테고리별로 그룹핑된 클론 목록이 번호와 함께 나오고, `/openclone <번호>`로 선택 가능. 마지막 홈 패널의 번호→이름 매핑은 `~/.openclone/menu-context`에 저장됩니다.

### Added

- **단체 대화방(room) 모드.** `/openclone room <a> <b> <c> ...`로 최대 8명까지 넣은 방을 열면, 이후 일반 메시지는 훅이 알아서 가장 잘 맞는 클론 1명(관점이 뚜렷이 갈릴 때만 최대 2명)이 `## <display_name> — _<tagline>_` 포맷으로 응답합니다. `/openclone room add <name>` / `/openclone room remove <name>` / `/openclone room leave`로 멤버 관리. 상태 파일: `~/.openclone/room` (한 줄에 클론 한 명). Room 모드는 `active-clone`보다 우선하며, `/openclone stop`이 둘 다 정리합니다.
- **상태줄(statusline).** Claude Code 상태줄에 활성 클론(`openclone · <name>`) 또는 열린 방(`openclone · room: a, b, c`; 4명 이상이면 `a, b, c +N`)이 자동 표시됩니다. `setup`이 `~/.claude/settings.json`에 statusLine을 자동 주입(사용자가 본인 statusLine을 이미 가지고 있으면 건드리지 않음), `uninstall`은 자신이 설치한 경우에만 제거합니다.
- README에 "이미 설치됐는데 실패·깨짐 / 재설치" 섹션 — 기존 설치를 지우고 one-liner를 재실행하는 복구 흐름과 `~/.openclone/` 사용자 데이터 보존 사실을 명시.

### Fixed

- 신규 설치 시 Claude Code가 `openclone@openclone` 플러그인 로드에 실패하던 문제. `setup`이 `enabledPlugins`만 등록하고 `extraKnownMarketplaces`는 등록하지 않아 "Plugin openclone not found in marketplace openclone" 에러로 커맨드·스킬이 뜨지 않았습니다. `setup`이 이제 마켓플레이스 경로도 함께 기록하고, `uninstall`도 같이 정리합니다.
- force-push된 `origin/main`에 막혀 기존 설치가 stale 상태로 멈추던 문제. `session-update.sh`가 이제 force refspec으로 fetch하고 ff 여부를 검사해, non-ff면 `~/.openclone/force-push-detected` marker만 기록하고(자동 reset 금지) `UserPromptSubmit` 훅이 복구 안내 배너를 노출합니다.
- 과거 `scripts/dev-link.sh`로 남은 깨진·외부 경로 symlink가 `.claude-plugin/marketplace.json`을 가리킬 때 `setup`이 자동 청소 후 shipped 파일을 복원. `pwd -P`로 macOS `/private` canonicalization까지 처리해 유효한 내부 dev-link는 보존.
- cone-mode sparse-checkout을 `setup` 재실행 시 non-cone(`/*` + `!/clones/*/knowledge/`)으로 자동 전환.
- 첫 설치 후 `/reload-plugins`만 안내해 사용자가 `/openclone`에서 `Unknown command`로 막히던 문제. `setup`이 `enabledPlugins`에 openclone이 **이전부터 있었는지** 감지해 종료 메시지를 분기합니다 — 신규 활성화면 "Claude Code를 완전히 종료한 뒤 다시 실행" 안내를 1순위로 노출하고, 재설치/업데이트면 종전대로 `/reload-plugins`를 권합니다. README 옵션 A·B 안내도 풀 재시작을 1순위로 정정.

## [0.0.1] — 2026-04-22

### Added

- 초기 공개 버전.
- Claude Code 플러그인 포맷 — `.claude-plugin/plugin.json` + `.claude-plugin/marketplace.json`.
- 슬래시 커맨드: `/openclone:list`, `/openclone:use`, `/openclone:stop`, `/openclone:new`, `/openclone:ingest` + 카테고리 패널 8종 (`/openclone:vc`, `/openclone:dev`, `/openclone:founder`, `/openclone:pm`, `/openclone:designer`, `/openclone:writer`, `/openclone:marketing`, `/openclone:hr`).
- 고정 카테고리 8종: `vc`, `dev`, `founder`, `pm`, `designer`, `writer`, `marketing`, `hr`.
- Clone 폴더 스키마: 내장·사용자 모두 `clones/<name>/{persona.md, knowledge/}` 동일 구조. 내장은 읽기 전용, 사용자는 `~/.openclone/clones/<name>/` 아래 쓰기 가능. 이름 충돌 시 persona는 user-wins, knowledge는 양쪽 누적.
- `UserPromptSubmit` 훅 (`hooks/inject-active-clone.sh`) — 활성 클론의 persona를 매 프롬프트마다 주입.
- `SessionStart` 훅 (`scripts/session-update.sh`) — 시간당 1회 백그라운드 `git pull --ff-only`.
- `git clone` + sparse-checkout 기반 설치 (`./setup`) — partial clone + non-cone `/*` + `!/clones/*/knowledge/` 패턴. 각 클론의 knowledge는 `/openclone:use <name>` 최초 호출 시 lazy-fetch.
- Skill 엔트리포인트: `skills/openclone/SKILL.md` — 자연어 트리거용.
- 레퍼런스 워크플로우 (lazy-load): `clone-schema.md`, `categories.md`, `interview-workflow.md`, `refine-workflow.md`, `panel-workflow.md`.
- 내장 클론 12종 (category):
  - `douglas` — 권도균, 프라이머 대표 · founder + vc
  - `jojoldu` — 이동욱(향로), 인프랩 CTO · dev
  - `ethan` — 조여준, 더벤처스 CIO · vc
  - `levi` — 김용훈, 김용훈그로스연구소 대표 · marketing
  - `kyunghun` — 이경훈, 채널코퍼레이션 부대표 · founder + vc
  - `josh` — 조쉬, 조슈아 대표 · founder + marketing
  - `brian` — 장동욱, 카카오벤처스 이사 · vc
  - `iid` — 김동현(이드), 티오더 HR Director · hr
  - `jayshin` — 신재명, 딜라이트룸 창업자 · founder
  - `gbjeong` — 정구봉, 팀어텐션 대표 · dev + founder
  - `chester` — 노정석, 비팩토리 대표 · founder + vc
  - `chulwukim` — 김철우, 더벤처스 대표 · vc + founder
- 각 내장 클론에 큐레이션된 지식 파일 (`knowledge/YYYY-MM-DD-<topic>.md`) 포함. 프론트매터에 `topic`, `source_type`, `source_url`, `authorship` (self / about_me / about_organization / endorsed), `published_at`.
- `.github/scripts/` CI 검증 스크립트: `validate-clones.ts`, `validate-commands.ts`, `validate-plugin.ts`.
- 문서: `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `docs/architecture.md`, 이슈·PR 템플릿.
- MIT 라이선스.
