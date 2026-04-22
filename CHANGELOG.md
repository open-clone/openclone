# Changelog

이 파일은 openclone의 모든 주요 변경사항을 기록합니다.

본 프로젝트는 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/) 포맷을 따르고, 버전은 [SemVer](https://semver.org/lang/ko/) 간이 적용을 따릅니다 (v1 이전에는 동작 변경 시 minor, 호환성 깨짐 시 major).

## [Unreleased]

### Fixed
- 신규 설치 시 Claude Code가 `openclone@openclone` 플러그인 로드에 실패하던 문제. `setup`이 `enabledPlugins`만 등록하고 `extraKnownMarketplaces`는 등록하지 않아 "Plugin openclone not found in marketplace openclone" 에러로 커맨드·스킬이 뜨지 않았습니다. `setup`이 이제 마켓플레이스 경로도 함께 기록하고, `uninstall`도 같이 정리합니다.

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
