# 변경 요약

<!-- 어떤 문제를 해결하고, 어떻게 접근했는지 한두 단락으로 적어주세요. 관련 이슈가 있다면 `Fixes #123` 형식으로 연결해 주세요. -->

## 변경 유형

<!-- 해당하는 것에 [x]를 표시해 주세요 (복수 선택 가능) -->

- [ ] 디스패처 서브액션 추가/수정 (`SKILL.md`)
- [ ] 새 레퍼런스 (`references/*.md`)
- [ ] 새 내장 클론 (`clones/<name>/`)
- [ ] 훅 (`hooks/*`)
- [ ] 스크립트 (`scripts/*.sh`)
- [ ] 설치·제거 (`setup`, `uninstall`)
- [ ] 문서 (README·CONTRIBUTING·docs·등)
- [ ] CI (`.github/workflows/*`, `.github/scripts/*`)

## 테스트 방법

<!-- 리뷰어가 어떻게 확인할 수 있는지 구체적으로. 슬래시 커맨드, 입력 예시, 기대 출력 등. -->

## 체크리스트

- [ ] 로컬에서 `./setup` 재실행 후 Claude Code 재시작하여 수동 스모크 테스트 (또는 dev-link 오버레이로 라이브 확인)
- [ ] 훅 등록(setup이 settings.json에 쓰는 항목)을 바꿨다면 `./setup` 재실행 후 세션 재시작 필요
- [ ] `/openclone <clone>`(및 room 건드렸다면 `/openclone room <a> <b>`)로 실제 메시지 한 번 보내 재현
- [ ] 추가·수정한 텍스트에 이모지가 포함되지 않았음을 확인
- [ ] 내장 클론(`clones/`)을 수정하지 않았음을 확인 (수정이 필요했다면 `~/.openclone/`에 포크)
- [ ] 동작 변경이 있다면 `CHANGELOG.md`의 `[Unreleased]` 섹션에 기입
- [ ] CI(`.github/workflows/validate.yml`) 그린
- [ ] 관련 문서(README/CONTRIBUTING/docs/architecture.md)를 갱신

## 스크린샷 / 출력 예 (선택)

<!-- UX가 변하는 경우 before/after를 보여주세요. -->
