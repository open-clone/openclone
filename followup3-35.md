### 결정 확인: won't fix — CLI로 대체 예정

이해했습니다. 이 이슈는 **won't fix** 처리, 추후 별도 CLI 기반 접근으로 대체 예정으로 인식하겠습니다.

#### 결정 정리

이 이슈에서 다룬 4가지 경로 (A: 최소 문서화 / B: 개별 클론 skill 분할 / C+: Claude Code + Codex + Cline 3-host hybrid adapter / D: decline) 중 사실상 **D (decline)에 가까운 결론**으로 마무리됩니다. 단, 단순 종료가 아니라 "별도의 CLI 솔루션으로 대체"라는 추가 방향성이 있습니다.

#### 이 결정의 합리적 근거 (앞선 토론에서 도출된 사실)

1. **hook 지원 에이전트는 41+ 중 3곳뿐** (Claude Code, Codex, Cline). 나머지 38개+는 hook 개념 자체가 없어 stateful 페르소나 주입이 플랫폼 레벨에서 불가능합니다.
2. **3-host hybrid adapter (Path C+) 유지비용이 큼**. Codex hook은 실험적 (feature flag, Windows 미지원), Cline hook은 출력 포맷이 다름 (`contextModification` vs `hookSpecificOutput.additionalContext`). 각 호스트 업데이트마다 깨질 수 있는 통합 코드 3벌 유지가 필요합니다.
3. **CLI 접근은 호스트 독립적**. CLI 도구로 페르소나 활성화·room·panel을 외부에서 처리하면, 코딩 에이전트는 단순히 CLI 출력을 읽는 소비자가 됩니다 — 41개 에이전트 모두 균일하게 지원 가능. 이쪽이 장기적으로 더 깔끔한 아키텍처입니다.

#### 구현 에이전트에게 (만약 누군가 `/approve`를 잘못 보낼 경우 대비)

이 이슈에 `/approve` 코멘트가 와도 **구현을 시작하지 마세요**. 사용자가 명시적으로 "won't fix, CLI로 대체"를 선언했으므로:

- 코드 변경 없음
- 새 PR 없음
- 단, 메인테이너가 직접 이슈를 닫는 것이 적절합니다. 자동 닫기를 원할 경우 별도 코멘트로 지시 필요.
- 향후 CLI 기반 대체 작업은 **이 이슈가 아닌 새 이슈**에서 추적되어야 합니다.

#### 후속 작업 제안 (선택 사항)

CLI 기반 대체 방향이 구체화되면, 새 이슈에 다음을 명시하면 좋습니다:

1. CLI의 인터페이스 (예: `openclone activate douglas`, `openclone room douglas alice`, `openclone panel vc "질문"`)
2. CLI 출력 포맷 (텍스트? JSON? markdown으로 페르소나 + 지식 섞어 stdout으로?)
3. 코딩 에이전트와의 통합 방식 (사용자가 수동으로 CLI 출력을 복붙? 에이전트가 bash로 CLI 호출? 두 방식 모두?)
4. 기존 Claude Code 스킬과의 관계 (병존? 점진적 마이그레이션? 폐기?)
5. 기존 `clones/<name>/persona.md` + `knowledge/` 데이터 모델 재사용 여부 (재사용 권장 — 이미 agent-agnostic임)

이 정보들이 모이면 새 이슈에서 또 plan agent를 돌리시면 됩니다.

### Reminder

이 이슈는 종결 방향이지만, 형식상 인간이 직접 이슈를 close 처리해야 GitHub 상태가 정리됩니다. 또한 `/approve` 코멘트가 실수로 들어와도 구현 에이전트는 위 지침에 따라 **아무 작업도 수행하지 않아야** 합니다.

<!-- dani:stage=issue_followup;job=9309df6a4dc94b4a8bf9732c1989cb63;issue=35 -->
