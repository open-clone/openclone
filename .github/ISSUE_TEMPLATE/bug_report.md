---
name: 버그 리포트
about: openclone에서 발견한 버그를 신고합니다
title: "[Bug] "
labels: bug
assignees: ""
---

## 요약

무엇이 어떻게 잘못 동작했는지 한두 문장으로 적어주세요.

## 재현 단계

1.
2.
3.

## 예상 결과

무엇이 일어나야 했나요?

## 실제 결과

실제로 무엇이 일어났나요? 오류 메시지가 있다면 함께 붙여주세요.

## 환경

- openclone 커밋 해시 (`cd ~/.claude/skills/openclone && git rev-parse HEAD`):
- Claude Code 버전:
- 운영체제 / 셸:
- 활성 클론(`~/.openclone/active-clone`):

## 훅 / 컨텍스트 샘플 (가능하면)

`hooks/inject-active-clone.sh`가 방출한 `additionalContext` JSON 샘플이나 관련 로그가 있으면 첨부해 주세요. 민감 정보는 가리고 공유해 주세요.

```text
```

## 스크린샷 / 추가 정보

필요하면 스크린샷, 관련 파일 경로, 방금 바꾼 커맨드·레퍼런스 등을 적어주세요.
