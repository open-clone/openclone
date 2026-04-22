# 보안 정책

## 위협 모델과 범위

openclone은 사용자의 로컬 머신에서만 동작하는 Claude Code **standalone skill**입니다. 모든 상태는 파일시스템(`~/.claude/skills/openclone/`와 `~/.openclone/`)에 저장되며, 서버 컴포넌트나 멀티유저 엔드포인트가 없습니다.

- **범위 안**
  - `hooks/inject-active-clone.sh` 및 로컬 파일 읽기 경로에서의 코드 실행·정보 노출 취약점
  - `scripts/fetch-url.sh`, `scripts/fetch-youtube.sh`의 인제스트 경로에서의 입력 검증·커맨드 인젝션
  - `SKILL.md` frontmatter 파싱 및 `setup`이 `~/.claude/settings.json`에 쓰는 훅·statusLine 등록 경로의 안전성
  - 내장 프리셋 클론의 악성 콘텐츠가 사용자 환경에 끼칠 수 있는 부작용
- **범위 밖**
  - Claude Code 자체, Anthropic API, 외부 웹사이트의 취약점 — 해당 벤더로 직접 제보해 주세요.
  - 사용자 로컬 머신이 이미 침해된 상태에서의 위협(로컬 권한 탈취 전제)
  - 지식 소스(URL·YouTube)에서 받은 컨텐츠의 사실성·편향 — 이는 기능적 결함으로 처리합니다.

## 제보 방법

취약점을 **공개 이슈로 올리지 말고**, 다음 중 한 경로로 알려주세요.

- 이메일: `hayun@rapidstudio.dev`
- GitHub Security Advisory (저장소 **Security** 탭 → **Report a vulnerability**)

제보 시 포함해 주시면 도움이 되는 정보:

- 영향 범위 요약
- 재현 단계 또는 PoC
- 사용 중인 openclone 커밋 해시(`cd ~/.claude/skills/openclone && git rev-parse HEAD`)
- 운영체제·셸·Claude Code 버전

## 응답 목표

- **초기 응답:** 제보 후 **7일 이내**
- **수정 또는 명확한 완화 계획 공유:** 심각도에 따라 **30일 이내** 목표
- **공개:** 패치 배포 후 조정된 시점에 이슈·릴리스 노트로 공개. 원하시면 제보자를 감사 인사에 포함합니다.

## 지원 버전

본 프로젝트는 단일 트렁크(main) 모델입니다. 보안 패치는 최신 main에만 반영됩니다. 이전 버전에 대한 백포트는 제공하지 않습니다. 항상 최신 버전으로 업데이트해 주세요.

## 감사

책임감 있는 제보에 감사드립니다. 커뮤니티의 기여가 openclone을 더 안전하게 만듭니다.
