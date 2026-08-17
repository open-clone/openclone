### 팔로업 답변: Codex hooks 현황과 Cline 소개

두 질문 모두 앞선 분석 결론을 **크게 수정**합니다. 특히 Codex 부분은 이전 분석이 시점상 오래된 정보였고, 업데이트가 필요합니다.

---

### 1. Codex CLI의 hooks — "사용 가능" 쪽이지만 "실험적"

**결론: 네, 사용 가능합니다. 단, 아직 실험적 기능(feature flag)으로 묶여 있고 Windows는 미지원입니다.**

Codex CLI는 **2026년 3월**에 hooks 시스템을 공식 도입했습니다. `SessionStart`와 `Stop`이 먼저 들어왔고 (PR #13276, 2026-03-10 병합), `UserPromptSubmit`이 뒤따랐습니다 (PR #14626, 2026-03-18 병합).

#### openclone 관점에서 핵심 사실

| 항목 | Codex | Claude Code | 일치 여부 |
|---|---|---|---|
| `UserPromptSubmit` hook 존재 | **Yes** | Yes | 기능은 동등 |
| `SessionStart` hook 존재 | **Yes** | Yes | 기능은 동등 |
| Hook 등록 위치 | `~/.codex/hooks.json` (전역) 또는 `<repo>/.codex/hooks.json` | `~/.claude/settings.json`의 `hooks` 섹션 | 다름 — 파일 위치·스키마 모두 별개 |
| Hook 출력 포맷 | stdout의 JSON, `hookSpecificOutput` / `additionalContext` 지원 | stdout의 JSON, `hookSpecificOutput.additionalContext` | **거의 동일** — 필드 이름이 같음 |
| Feature flag 필요 | **Yes** (`~/.codex/config.toml`의 `[features] codex_hooks = true`) | 아니오 (기본 활성) | Codex만 추가 단계 필요 |
| 공식 안내 | "Experimental. Windows temporarily disabled." | 정식 기능 | Codex는 계약 불안정 가능 |

출처:
- 공식 문서: https://developers.openai.com/codex/hooks/
- SessionStart 도입 PR: https://github.com/openai/codex/pull/13276
- UserPromptSubmit 도입 PR: https://github.com/openai/codex/pull/14626

#### 실제 Codex `hooks.json` 예시 (공식 문서)

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume",
        "hooks": [
          { "type": "command", "command": "python3 ~/.codex/hooks/session_start.py" }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          { "type": "command", "command": "/usr/bin/python3 .../user_prompt_submit.py" }
        ]
      }
    ]
  }
}
```

이 구조는 Claude Code의 `~/.claude/settings.json`의 `hooks` 섹션과 **매우 유사**합니다. 따라서 기존 `hooks/inject-active-clone.sh`는 **수정 없이 재사용 가능**할 가능성이 높습니다 (출력 포맷이 같으므로). 다른 것은 **등록 방식**뿐입니다:

- Claude Code → `setup:70-166`에서 Python 스크립트로 `~/.claude/settings.json` 편집
- Codex → `~/.codex/hooks.json`을 편집하고 `~/.codex/config.toml`에 feature flag 추가

#### 따라서 앞선 분석 수정

| 앞선 주장 | 실제 (Codex hooks 도입 이후) |
|---|---|
| "hooks 지원 = Claude Code + Cline 2곳뿐" | **Claude Code + Cline + Codex = 3곳** |
| "Codex는 file-reference 수준 실험적 지원" | **Codex도 1급 자동 주입 가능 (설치 스크립트만 작성하면)** |
| "hookless 에이전트 39개+" | hookless 38개+ (1개 줄었지만 여전히 대다수) |

**Path C (Hybrid adapter)의 가치가 상당히 올라갑니다.** 이제 Claude Code + Cline + Codex 세 호스트에 모두 stateful 자동 주입을 줄 수 있기 때문에, 커버리지가 "2/41"에서 "3/41"로 늘어납니다 — 그리고 Codex는 한국에서 꽤 인기 있는 호스트이므로 실질 사용자 커버리지는 더 큽니다.

**중요한 주의사항**: Codex hooks는 아직 "Experimental"이고 "Windows temporarily disabled" 상태입니다. 즉 구현 에이전트가 만든 코드가 Codex 마이너 업데이트로 깨질 수 있습니다. feature flag 의존성도 있어서 설치 스크립트가 `config.toml`에 `[features] codex_hooks = true`를 안전하게 추가·유지해야 합니다.

---

### 2. Cline이란?

**결론: Cursor의 오픈소스 대안 격인 VS Code 확장입니다. 이미 사용자 5백만 명 이상을 가진 주요 코딩 에이전트입니다.**

#### 기본 정보

| 항목 | 값 |
|---|---|
| **정체** | VS Code 확장 (JetBrains 확장 + CLI 버전도 있음) |
| **메인테이너** | Cline Bot Inc. |
| **라이선스** | Apache 2.0 (오픈소스) |
| **GitHub** | https://github.com/cline/cline (약 60.6k stars) |
| **공식 사이트** | https://cline.bot · https://docs.cline.bot |
| **모델 전략** | Bring Your Own API Key — Claude, GPT, OpenRouter, Ollama 등 연결 가능 |
| **MCP 지원** | 네 (MCP 서버를 추가해 기능 확장 가능) |
| **설치 규모** | VS Marketplace + JetBrains + CLI 합쳐 5백만+ |

출처: https://github.com/cline/cline, https://cline.bot, https://getcline.com

#### 간단히 말하면

Cline은 "Claude Code의 VS Code GUI 버전"과 가장 비슷합니다. 터미널 기반인 Claude Code/Codex와 달리 VS Code 사이드바에서 실시간으로 파일 diff를 확인하면서 에이전트와 대화합니다. Cursor가 "독자 포크된 VS Code에 AI 탑재"라면, Cline은 "공식 VS Code + 확장으로 AI 탑재 + 오픈소스"입니다.

#### Cline hooks — 지원 현황

**Cline은 hooks를 공식 지원합니다.** 오히려 Claude Code보다 이벤트 종류가 더 많습니다 (8종).

공식 문서: https://docs.cline.bot/customization/hooks

| Hook 이벤트 | openclone에서 쓸만한가? |
|---|---|
| `UserPromptSubmit` | **핵심 — 페르소나 주입에 필요** |
| `TaskStart` | 선택적 — 세션 시작 시 지식 sparse-fetch 할 때 |
| `TaskResume` | 선택적 |
| `TaskCancel` / `TaskComplete` | 미사용 가능 |
| `PreToolUse` / `PostToolUse` | 미사용 가능 |
| `PreCompact` | 미사용 가능 |

#### Cline hook 등록 방식 (Claude Code와 많이 다름)

- **위치**: `~/Documents/Cline/Hooks/` (전역) 또는 `<repo>/.clinerules/hooks/` (레포 로컬)
- **파일 형식**: 파일 이름이 hook 이름 (예: `UserPromptSubmit`) — 확장자 없는 실행 가능한 스크립트 (macOS/Linux) 또는 `.ps1` PowerShell 스크립트 (Windows)
- **활성화**: `cline config set hooks-enabled=true` 필요
- **입력**: JSON (stdin)
- **출력**: JSON (stdout). 필드 이름은 Claude Code와 다름:

```json
{
  "cancel": false,
  "contextModification": "프롬프트에 추가될 텍스트",
  "errorMessage": ""
}
```

**openclone 구현상 중요한 차이**:
- Claude Code/Codex는 출력 포맷이 거의 동일 (`hookSpecificOutput.additionalContext`)
- Cline은 **출력 키가 `contextModification`** — 별개 포맷이라서 `hooks/inject-active-clone.sh`에 Cline 전용 분기 필요
- Cline은 파일 이름으로 hook 이벤트를 구분 (Claude Code/Codex는 JSON config 안에서 지정)

출처: https://docs.cline.bot/customization/hooks, https://github.com/cline/cline/commit/718e5b53f6b24aedfc6186e1d3a4a8e7704a428d

---

### 업데이트된 권고 경로 (다시 정리)

앞선 답변의 권고를 **수정**합니다. 이제 Codex가 hook을 지원하므로:

**새로운 1순위: Path C+ (3-host Hybrid adapter)**

구현 에이전트가 해야 할 일:

1. **`setup` 스크립트를 에이전트 디텍션 모드로 리팩터링**:
   - `CLAUDE_CONFIG_DIR` 또는 `~/.claude` 존재 → Claude Code 경로로 hook 등록
   - `~/.codex/config.toml` 존재 → Codex 경로로 hook 등록 (feature flag `[features] codex_hooks = true` 추가 + `~/.codex/hooks.json`에 entry 추가)
   - Cline 설치 감지 (`~/Documents/Cline/Hooks/` 생성 가능 여부) → Cline hook 파일 배치
   - 셋 다 없으면 수동 안내

2. **`hooks/inject-active-clone.sh`를 에이전트별 출력 포맷 분기**:
   - Claude Code / Codex: 기존 `hookSpecificOutput.additionalContext` JSON 그대로
   - Cline: `{"contextModification": "..."}` 형식으로 변환
   - 환경 변수(예: `OPENCLONE_AGENT=claude|codex|cline`) 또는 stdin JSON의 `hook_event_name` 외 단서로 디텍션

3. **`scripts/statusline.sh`는 Claude Code만 적용** (Codex/Cline은 statusline 개념 다름 또는 없음). 필요하면 Cline 사이드바 UI에서 현재 활성 클론 표시 방법을 별도 연구.

4. **README 업데이트**:
   - 기존 "Claude Code (권장)" / "Codex (실험적)" 섹션을 3-호스트 병렬로 재구성
   - Cline 섹션 신규 추가 — 설치 명령 + 설정 안내
   - 호환성 매트릭스: Claude Code / Codex / Cline은 풀 기능, 그 외 38개는 on-demand SKILL.md 참조만

5. **Codex 실험 상태 리스크 완화**:
   - Codex hook 스키마가 변경될 가능성 대비, `setup` 스크립트가 버전 체크 후 실패 시 "수동 설정 안내"로 폴백
   - README에 "Codex hooks는 실험적 기능으로, OpenAI 업데이트로 동작이 바뀔 수 있습니다" 경고 명시

**2순위: Path A+B 조합** (앞선 답변에서 권고한 것) — 엔지니어링 비용을 최소화하고 싶을 때. Path C+는 Cline/Codex hook 포맷 각각 조사·구현·검증 비용이 붙습니다.

**3순위: Path D (Decline)** — 유지

---

### 남은 결정 사항 (업데이트)

| # | 질문 | 상태 |
|---|---|---|
| 1 | 경로 선택 | **여전히 결정 필요** — Path C+를 새로 추가했음. A/B/C+/D (또는 조합) 중 선택 |
| 2 | 비-Claude 호스트에서 stateful 활성화 필수? | Codex/Cline이 hook 지원이 확인되었으니, "예"라면 Path C+가 유일한 해법. "아니오"면 Path A+B로 충분 |
| 3 | Cline 지원 원함? | 이제 Cline이 무엇인지 설명됐으니 yes/no 결정 필요. 출력 포맷 차이 때문에 Cline 지원은 Codex보다 구현비가 약간 더 큼 |
| 4 | 개별 클론을 skill로 쪼갤 것? | Path A+B 택할 경우에만 해당 |
| 5 | Codex 실험적 상태 수용 가능? | **새 질문** — Codex hooks는 feature flag + "Windows disabled" 상태. 이 리스크를 감수할지 |

### Reminder

구현은 **인간이 `/approve`를 포함한 코멘트를 남긴 이후에만** 시작됩니다. 구현 에이전트는 이 플래닝 세션의 추론 과정을 상속받지 않고, 이 이슈의 본문과 여기까지의 코멘트만 보고 작업합니다. 따라서 `/approve` 코멘트에 다음을 **명시**해 주세요:

- 선택한 경로 (A / B / A+B / C+ / D 중 하나)
- Cline 지원 여부 (C+ 선택 시)
- Codex hooks의 실험적 상태 수용 여부 (C+ 선택 시)

<!-- dani:stage=issue_followup;job=28a49e38aa604a48bd11dc3a11ba31e3;issue=35 -->
