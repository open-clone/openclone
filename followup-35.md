### 팔로업 답변: hooks의 역할과 에이전트별 통합 필요성

> 그러면 hooks가 openclone을 활용하는 것에 있어서 아주 핵심적인 역할을 하는 것이야?

**네, 정확합니다.** hooks는 openclone의 "단순 프롬프트 모음"과 "진짜 페르소나처럼 느껴지는 대화 경험"을 가르는 **핵심 메커니즘**입니다.

좀 더 구체적으로 말하면, openclone의 가치 제안은 세 겹으로 되어 있고, 그 중 두 겹이 hooks에 직접 의존합니다:

| 계층 | 의존 대상 | hooks 없으면? |
|---|---|---|
| **콘텐츠 계층** — 페르소나 문서, 지식 파일 | 파일 시스템만 있으면 됨 | 영향 없음 (모든 에이전트에서 작동) |
| **활성화 계층** — `/openclone <name>` 한 번으로 그 턴부터 자동 주입 | `UserPromptSubmit` hook (매 프롬프트마다 실행) | **완전히 깨짐** — 사용자가 매 턴 클론 파일을 수동으로 참조해야 함 |
| **라우팅 계층** — room 모드에서 여러 클론 중 가장 적합한 1~2명이 응답 | `UserPromptSubmit` hook + 런타임 로직 | **완전히 깨짐** — hook 없이는 여러 페르소나 간 선택 불가 |

코드 기준 증거 (앞선 분석의 Evidence 3):
- `hooks/inject-active-clone.sh:124-182` — room 모드 라우팅 전체가 여기에 집중됨
- `hooks/inject-active-clone.sh:184-235` — 단일 클론 활성화 주입 로직
- `hooks/inject-active-clone.sh:78-96` — Claude Code 전용 JSON 출력 포맷 (`hookSpecificOutput.additionalContext`)

즉, hooks를 뺀 openclone은 "정적 페르소나 템플릿 모음"으로 축소됩니다. Vercel Agent Skills 생태계에서 대부분의 에이전트가 hooks를 지원하지 않는다는 사실이 이 이슈의 핵심 제약입니다.

> hooks에 대한 표준적인 인터페이스는 없기 때문에 각 에이전트들에 알맞은 통합을 모두 따로따로 지원해야 하겠네?

**절반은 맞고, 절반은 틀립니다.** 정확하게 말하면:

**맞는 부분**: [Vercel Agent Skills 호환성 매트릭스](https://github.com/vercel-labs/skills/blob/main/README.md#compatibility)에 따르면 hooks를 지원하는 에이전트는 **Claude Code와 Cline 두 곳뿐**입니다. 이 둘조차 hook 등록 방식이 서로 다릅니다 (Claude Code는 `~/.claude/settings.json` 편집, Cline은 별도 config — 정확한 포맷은 추가 조사 필요). 따라서 "자동 주입"을 지원하려면 hooks를 가진 에이전트마다 따로 구현해야 합니다.

**틀린 부분 (중요)**: 나머지 39개 이상의 에이전트는 hooks가 "아직 없는" 것이 아니라 **아키텍처 레벨에서 hook 개념 자체가 없습니다.** 즉 "각 에이전트마다 따로 구현"한다고 해도, 대부분의 에이전트에서는 구현할 대상이 존재하지 않습니다. Cursor, Codex, GitHub Copilot 등은 "매 프롬프트 직전에 외부 스크립트를 실행해 컨텍스트를 주입하는" 확장점 자체를 제공하지 않습니다.

따라서 실제 선택지는 "N개 에이전트를 N개 방식으로 지원" 이 아니라 **두 가지 모드**의 조합입니다:

| 모드 | 지원 에이전트 수 | UX |
|---|---|---|
| **Hook 모드** (자동 주입) | 2개 (Claude Code, Cline) | 현재 Claude Code 경험 그대로 |
| **On-demand 모드** (매 턴 수동 참조) | 39개+ | 사용자가 매번 `/openclone douglas` 타이핑 후 에이전트가 `SKILL.md`를 읽음 |

**"각 에이전트마다 따로 작업해야 하는 것"은 주로 설치 경로입니다** (`.claude/skills/`, `.cursor/skills/`, `.codex/skills/` 등). 이 부분은 `npx skills add` CLI가 이미 해결해 줍니다 — 41개 이상의 에이전트 경로를 CLI가 알고 있어서, 사용자가 `npx skills add open-clone/openclone`만 실행하면 자동으로 올바른 위치에 파일을 배치합니다.

즉, **설치는 이미 풀려 있고, 진짜 문제는 "설치 후 UX"** 입니다.

---

### 업데이트된 경로 권고

앞선 분석의 4가지 경로 (A/B/C/D)는 여전히 유효하지만, 이번 팔로업을 반영해 권고 순위를 정리합니다:

1. **Path A (Minimal docs) + Path B (개별 클론 skills) 조합** — 권고
   - Path A로 Claude Code/Cline 사용자에게 기존 기능 그대로 안내
   - Path B로 hookless 에이전트 사용자가 `npx skills add open-clone/openclone --skill douglas` 식으로 개별 페르소나를 on-demand 스킬로 활용 가능하게 만듦
   - hookless 에이전트에서 room/panel/활성화 상태 유지는 **포기** (플랫폼 제약)
   - room/panel은 Claude Code/Cline 전용 기능으로 명시

2. **Path C (Hybrid adapter)** — 중간 비용, 중간 효과
   - Claude Code와 Cline 두 경로만 hook 등록 구현 (Cline 조사 필요)
   - 나머지 에이전트는 Path A처럼 문서로만 안내
   - **주의**: Cline hook 등록 포맷은 아직 조사되지 않음. 구현 전 librarian 조사 필요

3. **Path D (Decline)** — 가장 낮은 비용
   - 이슈를 닫고 README에 "Claude Code 1급 지원, 다른 에이전트는 플랫폼 제약으로 미지원" 한 줄만 추가
   - openclone의 정체성이 "Claude Code 스킬"로 확고해짐

Path C 단독은 더 이상 권고하지 않습니다. hookless 에이전트에서 아무 자동화도 못 주는데 개별 skills로 쪼개지도 않기 때문에 **41개 에이전트 중 2개에서만 풀 기능, 나머지 39개에서는 아무것도 없음** 이 됩니다. Path A+B 조합은 최소한 "개별 페르소나를 on-demand로 부를 수 있음"은 제공합니다.

---

### 남은 결정 사항 (여전히 인간의 답변 필요)

앞선 분석의 4개 질문 중 팔로업으로 해소된 것과 남은 것을 구분합니다:

| # | 질문 | 상태 |
|---|---|---|
| 1 | 경로 선택 (A/B/C/D) | **여전히 결정 필요** — 위 업데이트된 권고 참고 |
| 2 | 비-Claude 에이전트에서 stateful 활성화가 필수인가? | 팔로업 맥락상 "아니오" 쪽으로 기우는 것처럼 보이지만, 명시적 답변 필요. 만약 "필수"라면 Path D (Decline)만 가능 |
| 3 | Cline 지원을 명시적으로 원하는가? | **여전히 결정 필요** — Path C 또는 A+B+Cline의 경우에 해당 |
| 4 | 개별 클론을 skill로 쪼갤 것인가? | **여전히 결정 필요** — Path B/A+B 선택 시 핵심 |

추가로 이번 팔로업에서 생긴 새로운 질문:

5. **"각 에이전트마다 따로 지원"을 어느 정도까지 의미하는가?** 구체적으로:
   - (a) 설치 경로만 다르게 (npx CLI가 자동 처리) → Path A/B로 충분
   - (b) hook 등록 로직까지 에이전트별로 (Claude Code + Cline) → Path C 필요
   - (c) hook 개념 없는 에이전트에 "가상 hook"을 만들어 주입 (예: 프로젝트 AGENTS.md/CLAUDE.md 파일에 자동 append) → 큰 엔지니어링 작업, 권고하지 않음

### Reminder

구현은 **인간이 `/approve`를 포함한 코멘트를 남긴 이후에만** 시작됩니다. 구현 에이전트는 이 플래닝 세션의 사고 과정을 상속받지 않고, 이 이슈의 본문과 여기까지의 코멘트만 보고 작업합니다. 따라서 `/approve` 코멘트에 어느 경로(A/B/C/D 또는 A+B 조합)를 선택했는지 **명시적으로 적어 주세요**.

<!-- dani:stage=issue_followup;job=ee279e6854ff4b518d9dd8b7c0715880;issue=35 -->
