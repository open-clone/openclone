---
name: openclone
description: Create, manage, or talk to an openclone "clone" — a named AI persona with one or more categories (vc, tech, founder, expert, influencer, politician, celebrity) and attached knowledge. Triggers on phrases like "create a clone", "make a persona", "talk as <name>", "switch to <name>", "feed knowledge to", "ingest url for <clone>", "update <name> with latest info", "<name> 클론 최신 정보로 업데이트", "ask all VCs", "stop being <name>", or any mention of `/openclone`. Renders the home panel with no args; name/number activates a clone; sub-actions `stop`, `new`, `ingest`, `update`, `room`, `panel`.
argument-hint: [name | N | stop | new | ingest | update | room | panel <category> "<q>"]
allowed-tools: Bash, Read, Write, Glob, WebFetch, WebSearch
---

openclone의 단일 진입점. 유저가 `/openclone <args>`로 직접 호출했거나 자연어("alice로 전환", "새 클론 만들어" 등)로 의도를 밝힌 경우 모두 이 스킬이 처리합니다.

## 두 출처의 클론

- **빌트인 클론** — `${CLAUDE_SKILL_DIR}/clones/<name>/` (읽기 전용, 저장소와 함께 배포). `persona.md`는 항상 존재하고 `knowledge/`는 활성화 시점에 sparse-checkout으로 가져옵니다.
- **유저 클론** — `~/.openclone/clones/<name>/` (쓰기 가능). 이름 충돌 시 유저 클론이 빌트인을 가립니다 (shadow).

상태 파일 (모두 `~/.openclone/` 밑):
- `active-clone` — 현재 활성 클론 이름 (없으면 = 활성 없음)
- `room` — 방 멤버 한 줄씩 (없거나 비어 있으면 = 방 없음)
- `menu-context` — 최근 홈 패널의 `숫자 → 이름` JSON 매핑

## 모드 우선순위 (UserPromptSubmit 훅 기준)

1. `~/.openclone/room`이 비어있지 않으면 **room 모드** — 모든 멤버 페르소나와 라우팅 규칙 주입, 턴당 가장 적절한 한두 명이 응답.
2. `~/.openclone/active-clone`이 존재하면 **single-clone 모드** — 그 클론이 매 턴 응답.
3. 둘 다 없으면 기본 Claude.

## 호출 맥락 해석

- **슬래시로 호출** (`/openclone <args>`): `$ARGUMENTS`의 첫 토큰(`$1`)을 읽어 아래 분기표대로 실행.
- **자연어로 호출**: 유저 메시지에서 의도를 뽑아 가장 적절한 서브 액션으로 라우팅. 가능하면 실제 `/openclone <sub>` 형태의 명령을 보여주고 그 분기를 실행해서 유저가 무엇이 일어나는지 볼 수 있게 합니다.

**이 스킬을 쓰지 말아야 할 때**: 이미 활성 클론·방 안이라면 다음 메시지는 `UserPromptSubmit` 훅이 자동 처리합니다 — 매 턴 스킬을 재호출하지 마세요.

## 분기 규칙

| `$1` | 동작 |
| --- | --- |
| (비어 있음) | 아래 **홈 패널** 섹션 |
| `^[0-9]+$` (숫자) | 아래 **숫자 선택** 섹션 |
| `stop` | 아래 **stop** 섹션 |
| `new` | 아래 **new** 섹션 |
| `ingest` | 아래 **ingest** 섹션 |
| `update` | 아래 **update** 섹션 |
| `room` | 아래 **room** 섹션 |
| `panel` | 아래 **panel** 섹션 |
| `^[a-z0-9][a-z0-9-]*$` | 아래 **use** 섹션 (클론 이름으로 해석) |
| 그 외 | 한 줄로 "알 수 없는 서브명령" 안내 후 홈 패널 렌더 |

---

## 홈 패널

`${CLAUDE_SKILL_DIR}/references/home-workflow.md` 를 로드해 그대로 따르세요.

렌더가 끝나면 이 턴은 종료. 유저는 다음 메시지에서 번호/이름을 선택하거나 다른 서브명령을 호출합니다.

---

## 숫자 선택

1. `~/.openclone/menu-context` 파일을 읽습니다. 없거나 JSON 파싱 실패면 "이 번호와 연결된 최근 홈 패널이 없어요. `/openclone` 로 홈을 다시 열어주세요." 안내 후 중단.
2. `items`에서 `n == $1`인 엔트리를 찾습니다. 없으면 "그 번호는 현재 목록에 없어요." 안내 후 중단.
3. 그 엔트리의 `name`을 `<resolved>`로 두고 아래 **use** 섹션을 `<resolved>`로 진행.
4. use 성공 후 `~/.openclone/menu-context`를 삭제합니다 (`rm -f ~/.openclone/menu-context`).

---

## use

입력: 클론 이름 `<name>` (= `$1` 또는 숫자 해석 결과).

1. 클론 존재 확인. 우선순위:
   - `~/.openclone/clones/<name>/persona.md` → origin = user
   - `${CLAUDE_SKILL_DIR}/clones/<name>/persona.md` → origin = built-in

   둘 다 없으면 한 줄 안내 후 중단:
   > `<name>` 클론을 찾을 수 없어요. `/openclone`로 목록을 확인하거나 `/openclone new <name>`으로 새로 만들어 주세요.

2. built-in이면 지식 lazy-fetch (user clone은 skip):

   ```bash
   bash "${CLAUDE_SKILL_DIR}/scripts/fetch-clone-knowledge.sh" "<name>"
   ```

3. active-clone 기록:

   ```bash
   mkdir -p ~/.openclone
   printf '%s' "<name>" > ~/.openclone/active-clone
   ```

4. `persona.md` frontmatter를 간단히 읽어 `display_name`, `primary_category`(없으면 `categories[0]`), `categories` 확인. 한두 줄로 확인 메시지:
   > 활성 클론: **{display_name}** ({primary_category} 렌즈, categories: {categories}, origin: {user | built-in}). 다음 메시지부터 이 클론으로 응답해요. `/openclone stop`으로 해제.

   origin이 `built-in`이면 한 줄 덧붙임:
   > 이 클론은 내장형이어서 읽기 전용입니다. 수정하려면 먼저 `~/.openclone/clones/<name>/`로 폴더를 복사하세요.

5. 이 커맨드 응답에서 클론을 연기하지 마세요 — 페르소나 주입은 훅이 다음 턴부터 담당합니다.

---

## stop

1. `~/.openclone/active-clone`, `~/.openclone/room`, `~/.openclone/menu-context` 상태 확인. 셋 다 없으면 한 줄 안내 후 중단:
   > 활성 클론도, 열린 방도 없어요.

2. 존재하는 것만 제거:

   ```bash
   rm -f ~/.openclone/active-clone ~/.openclone/room ~/.openclone/menu-context
   ```

3. 어느 상태가 정리됐는지 한 줄로 보고. 예:
   > 활성 클론(**douglas**)과 방(douglas, alice)을 모두 종료했어요. 다음 메시지부터 기본 Claude가 응답.

---

## new

입력 처리:
- `$2`가 비어 있으면 `/openclone new <name>` 사용법 안내 후 중단.
- `$2`를 슬러그 검증: `^[a-z0-9][a-z0-9-]*$`. 실패 시 소문자 슬러그로 다시 요청.
- 이름 충돌 체크:
  - `~/.openclone/clones/$2/persona.md` 이미 존재 → 취소/다른 이름/덮어쓰기 중 택1 요청.
  - `${CLAUDE_SKILL_DIR}/clones/$2/persona.md` 존재 → 사용자 클론이 내장을 가린다고 경고 후 진행/이름 변경/취소 택1 요청.

실행:
- `${CLAUDE_SKILL_DIR}/references/interview-workflow.md` 를 로드해 정확히 따르세요. 이 워크플로는 먼저 **Chrome MCP preflight**를 돌리고, 타겟이 실제 인물이면 **Stage 0 자동 발굴**(소셜 링크 검색 → Chrome MCP로 LinkedIn/Threads/X/Instagram 스크랩 → YouTube는 `scripts/fetch-youtube.sh`로 자막 추출)로 페르소나·첫 지식 파일을 자동 작성합니다. 자동 발굴이 성공하면 문답 스테이지 1–5는 스킵, 유저에게 한 번만 확인받습니다. 실패하거나 공개 프레즌스가 없으면 기존 문답 모드로 fallback.
- 카테고리는 최소 1개 필수 (vc, tech, founder, expert, influencer, politician, celebrity 중).
- 인터뷰 종료 시:

  ```bash
  mkdir -p "$HOME/.openclone/clones/<name>/knowledge"
  ```

  `~/.openclone/clones/<name>/persona.md`를 `${CLAUDE_SKILL_DIR}/references/clone-schema.md` 형식대로 작성. 인터뷰 원문은 `~/.openclone/clones/<name>/knowledge/YYYY-MM-DD-interview.md`에 `source_type: interview`로 저장.
- 한 줄 확인:
  > **{display_name}** 생성 완료 — `~/.openclone/clones/{name}/`. `/openclone {name}`으로 활성화.

이 단계에서 클론 연기는 하지 않음.

---

## ingest

입력 처리:
- `~/.openclone/active-clone` 없거나 비었으면 "`/openclone <name>`으로 먼저 클론을 활성화해 주세요." 안내 후 중단.
- active-clone 이름으로 persona 경로 탐색:
  - `~/.openclone/clones/<name>/persona.md` → user
  - `${CLAUDE_SKILL_DIR}/clones/<name>/persona.md` → built-in
  - 없음 → 안내 후 중단.
- built-in이면 **fork-on-write** 먼저:

  ```bash
  mkdir -p "$HOME/.openclone/clones"
  cp -R "${CLAUDE_SKILL_DIR}/clones/<name>" "$HOME/.openclone/clones/<name>"
  ```

  한 줄 안내:
  > 내장 **<name>**을 `~/.openclone/clones/<name>/`로 포크했어요 (이제 사용자 사본이 내장을 가림). ingest 계속 진행.

- `$2` 이후가 소스(URL, 경로, 또는 텍스트). 비어 있으면 요청.

실행:
- 소스 타입 판별:
  - `https://www.youtube.com/` | `https://youtu.be/` → YouTube → `${CLAUDE_SKILL_DIR}/scripts/fetch-youtube.sh <url>`
  - `http://` | `https://` → URL → WebFetch (실패 시 `${CLAUDE_SKILL_DIR}/scripts/fetch-url.sh <url>`)
  - 실제 파일 경로 (`.md|.txt|.pdf|.docx`) → Read (PDF/DOCX은 Read 지원 범위 안에서)
  - 그 외 → 인자 자체가 raw 텍스트
- `${CLAUDE_SKILL_DIR}/references/refine-workflow.md` 를 로드해 그대로 따름 — 날짜+토픽별 파일을 `~/.openclone/clones/<name>/knowledge/`에 append-only로 기록.
- 한두 줄 확인:
  > **{display_name}**에 추가됨: `~/.openclone/clones/{name}/knowledge/`. 토픽: `YYYY-MM-DD-<topic>`.

---

## update

입력 처리:
- 대상 결정:
  - `$2`가 슬러그(`^[a-z0-9][a-z0-9-]*$`)면 그 이름으로.
  - `$2`가 비어 있으면 `~/.openclone/active-clone` 읽기. 비었으면 안내 후 중단:
    > 먼저 `/openclone <name>`으로 클론을 활성화하거나 `/openclone update <name>`으로 이름을 지정해 주세요.
- persona 경로 탐색 (user → built-in). 없으면 안내 후 중단.
- built-in이면 **fork-on-write** 먼저 (ingest와 동일):

  ```bash
  mkdir -p "$HOME/.openclone/clones"
  cp -R "${CLAUDE_SKILL_DIR}/clones/<name>" "$HOME/.openclone/clones/<name>"
  ```

  한 줄 안내 후 진행.

실행:
- `${CLAUDE_SKILL_DIR}/references/update-workflow.md` 를 로드해 그대로 따르세요. 이 워크플로는 먼저 **Chrome MCP preflight**를 돌리고, 사용자 사본의 knowledge/ 최신 파일 날짜를 cutoff로 잡은 뒤 persona.md `## Links`의 각 URL을 Chrome MCP / `scripts/fetch-youtube.sh`로 수집, cutoff 이후 게시물만 `refine-workflow.md`로 dated 파일에 append 합니다.
- 자연어 호출("douglas 최신 정보로 업데이트해줘", "update kyunghun with the latest")도 같은 분기로 라우팅 — 유저에게는 `/openclone update <name>`을 보여주고 실행.

---

## room

`$2`(서브 서브명령) 기준 분기:

| `$2` | 동작 |
| --- | --- |
| (비어 있음) | 아래 **room status** |
| `leave` | 아래 **room leave** |
| `add` (이후 = `$3`) | 아래 **room add** |
| `remove` (이후 = `$3`) | 아래 **room remove** |
| 그 외 (= 클론 이름 첫 토큰, 이후 더 올 수 있음) | 아래 **room start** — `$2 $3 …` 전부를 새 멤버 리스트로 해석 |

### room status

`~/.openclone/room` 읽기. 없거나 비었으면 "현재 열린 방이 없어요. `/openclone room <이름1> <이름2> ...`으로 시작하세요." 출력. 있으면 멤버 줄별로 표시.

### room start

입력: 공백·콤마로 구분된 클론 이름들 (최소 1개, 최대 8개까지 허용. 그 이상은 앞 8개만 취하고 경고).

1. 각 이름 검증 (슬러그 형식). 잘못된 이름이 있으면 그 항목 skip하고 경고.
2. 각 이름에 대해 persona 존재 확인 (user → built-in 순). 없으면 skip + 경고.
3. built-in이 섞여 있으면 각각에 대해 `fetch-clone-knowledge.sh` 호출.
4. 결과 이름들을 `~/.openclone/room`에 한 줄씩 기록 (기존 방 덮어쓰기). 한 명도 남지 않으면 파일 쓰지 않고 안내.

   ```bash
   mkdir -p ~/.openclone
   printf '%s\n' "alice" "bob" "charlie" > ~/.openclone/room
   ```

5. 확인: `방을 열었어요: alice, bob, charlie. 다음 메시지부터 가장 적절한 클론이 자동으로 응답.`

세부 규칙은 `${CLAUDE_SKILL_DIR}/references/room-workflow.md` 참조.

### room add

1. `~/.openclone/room` 있어야 함. 없으면 "먼저 `/openclone room <이름>`으로 방을 시작하세요." 출력 후 중단.
2. `$3` 검증 + persona 존재 확인 + built-in이면 fetch.
3. 이미 방에 있으면 "<name>은 이미 멤버입니다." 출력 후 중단.
4. 파일 끝에 한 줄 append (`printf '%s\n' "<name>" >> ~/.openclone/room`).
5. 확인: `<name>을 방에 추가했어요. 현재 멤버: a, b, c, <name>.`

### room remove

1. `~/.openclone/room` 있어야 함. 없으면 안내.
2. `$3`이 방 멤버에 없으면 "그 이름은 방에 없어요." 출력 후 중단.
3. 그 이름 라인 제거 (새 파일 써서 대체). 결과가 빈 줄이면 파일 자체 삭제.
4. 확인.

### room leave

```bash
rm -f ~/.openclone/room
```

한 줄 확인. `active-clone`은 건드리지 않음 (유저가 명시적으로 `/openclone stop`을 쓰지 않는 한 이전 활성 클론은 유지).

---

## panel

입력: `$2` = 카테고리, 이후 = 질문.

1. `$2` 가 `{vc, tech, founder, expert, influencer, politician, celebrity}` 중 하나인지 확인. 아니면 다음 안내 후 중단:
   > 카테고리는 vc, tech, founder, expert, influencer, politician, celebrity 중 하나. 예: `/openclone panel vc "내 SaaS 피봇 어때요?"`
2. `$3` 이후를 합친 질문이 비어 있으면 사용법 안내 후 중단.
3. `${CLAUDE_SKILL_DIR}/references/panel-workflow.md` 와 `${CLAUDE_SKILL_DIR}/references/categories.md` 를 로드. 패널 워크플로를 category = `$2`, question = 나머지 `$ARGUMENTS`로 정확히 실행.

---

## 공통 규칙

- 커맨드 응답 안에서 클론을 **연기하지 않음**. 활성화·새 클론·ingest·room 등은 시스템 수준 확인만. 페르소나 주입은 다음 턴부터 훅이 담당.
- 이모지 없음.
- 질문/응답 언어는 유저가 사용한 언어를 그대로 따라갑니다 (한국어면 한국어, 영어면 영어).

## 파일 레이아웃 참고

- `${CLAUDE_SKILL_DIR}/references/clone-schema.md` — 클론 파일 포맷 (frontmatter + 섹션, 멀티 카테고리 규칙)
- `${CLAUDE_SKILL_DIR}/references/categories.md` — 고정 카테고리 7종 + 카테고리별 "항상 점검" 축
- `${CLAUDE_SKILL_DIR}/references/home-workflow.md` — 홈 패널 렌더 및 menu-context 기록
- `${CLAUDE_SKILL_DIR}/references/interview-workflow.md` — `new` 인터뷰 진행·정리
- `${CLAUDE_SKILL_DIR}/references/refine-workflow.md` — `ingest`가 원본 소스를 토픽 파일로 정제
- `${CLAUDE_SKILL_DIR}/references/update-workflow.md` — `update`가 마지막 지식 일자 이후 소셜/유튜브 자료를 자동 수집
- `${CLAUDE_SKILL_DIR}/references/panel-workflow.md` — 카테고리 패널 다중 클론 출력
- `${CLAUDE_SKILL_DIR}/references/room-workflow.md` — 방 안 턴별 라우팅
- `${CLAUDE_SKILL_DIR}/assets/clone-template.md` — 수기 작성용 시작 템플릿
