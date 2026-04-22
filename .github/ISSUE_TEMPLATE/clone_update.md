---
name: 클론 업데이트
about: 기존 built-in 클론의 persona 또는 knowledge 보정을 요청합니다
title: "[Clone Update] "
labels: clone
assignees: ""
---

## 대상 클론

- 이름 슬러그 (예: `douglas`):
- 현재 시점 커밋 해시 (선택, `cd ~/.claude/skills/openclone && git rev-parse HEAD`):

## 업데이트 유형

해당하는 항목을 모두 선택해 주세요.

- [ ] persona 텍스트 보정 (`## Persona` / `## Speaking style` / `## Guidelines` / `## Background` 등)
- [ ] frontmatter 보정 (`display_name`, `tagline`, `categories`, `voice_traits`)
- [ ] 새 지식 파일 추가 (`YYYY-MM-DD-<topic>.md`)
- [ ] 기존 지식 갱신 — **덮어쓰기 아님**, 같은 topic을 새 날짜의 파일로 추가
- [ ] `categories` / `primary_category` 변경

## 무엇이 잘못되었거나 오래되었는지

사실관계 문제인지, 톤/말투 문제인지, 카테고리 미스매치인지 짧게 설명해 주세요. 가능하면 현재 파일의 해당 줄 인용 또는 경로를 포함해 주세요.

## 변경안

구체적으로 어떻게 고치면 좋을지 적어주세요. 가능하면 diff 수준으로(이전 → 이후).

```text
```

## 근거 소스

이 변경을 뒷받침하는 공개 자료 URL을 적어주세요. (인터뷰 영상, 본인 글, 공식 발표 등)

-
-

## append-only 원칙 확인

- [ ] 기존 지식 파일은 수정·삭제하지 않고, 최신 날짜의 새 파일로 덧붙인다는 규칙을 이해했습니다. (`references/clone-schema.md` 참조)

## 추가 정보

관련 이슈·PR, 이전 논의가 있다면 링크해 주세요.
