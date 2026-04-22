# Home panel workflow

`/openclone` (인자 없음)이 호출될 때 렌더하는 홈 패널. 클론을 `primary_category`별로 그룹핑해 번호를 매겨 보여주고, 번호 선택을 위해 `~/.openclone/menu-context`에 매핑 JSON을 기록합니다.

## 1. 클론 수집

두 곳에서 수집:

- `~/.openclone/clones/<name>/persona.md` (user)
- `${CLAUDE_SKILL_DIR}/clones/<name>/persona.md` (built-in)

같은 `<name>`이 양쪽에 있으면 user가 이김 — built-in 사본은 skip.

각 클론에 대해 `persona.md` frontmatter에서 다음 필드 파싱:

- `name`
- `display_name`
- `tagline` (없으면 빈 문자열)
- `categories` (리스트)
- `primary_category` (없으면 `categories[0]`)
- origin (`user` | `built-in`)

## 2. 상태 읽기

- `~/.openclone/active-clone` — 한 줄 클론 이름. 없으면 `active = none`.
- `~/.openclone/room` — 줄마다 멤버. 없거나 비었으면 `room = none`.

## 3. 그룹핑 / 순서

- 각 클론은 **하나의 섹션**에만 표시 — `primary_category` 섹션. 여러 카테고리에 속한 경우 다른 카테고리는 라인 끝 `[+dev, +pm]` 식으로 표시.
- 섹션 순서 (해당 카테고리에 ≥1 클론인 섹션만 표시): `founder, vc, pm, dev, designer, writer, marketing, hr`.
- 섹션 내부는 `name` 알파벳 순.

## 4. 번호 부여

섹션과 무관하게 전체에 걸쳐 연속 번호 `1..N`. 표시와 menu-context에 같은 번호 사용.

## 5. 렌더

출력 언어는 유저가 가장 최근에 쓴 언어(한국어 / 영어). 애매하면 한국어.

각 클론은 **한 엔트리 = 1~2줄**로 표시. 강조는 다음과 같이 배치합니다:

- **Line 1 (주목선):** `N. **<display_name>** — <직책>   \`<slug>\`   <뱃지>`
  - `<직책>`은 `tagline`을 `". "` (마침표+공백)로 split해서 **첫 조각**.
  - `<slug>`는 `name` 필드. 백틱으로 감싸 monospace → 시각적으로 한 단계 밀어냄.
  - tagline이 비어 있거나 split 첫 조각만 있을 땐 `— <직책>` 생략 가능.
- **Line 2 (보조):** 들여쓰기 3칸 후 `_<tagline의 나머지>_`
  - tagline split 결과가 2조각 이상일 때만. 들여쓰기 3칸.
  - 나머지 조각은 마침표+공백(`". "`)으로 다시 합친 뒤 끝 마침표가 있으면 그대로 둠.
  - 없으면 Line 2 자체를 생략.
- 뱃지는 **Line 1 끝**. tagline 뒷부분이 없을 때는 Line 1에 slug·뱃지가 같이 오는 한 줄짜리 엔트리.

### Korean 모양

```markdown
# openclone

**Status** — Active: `<display_name 또는 _없음_>` • Room: `<member1, member2, … 또는 _없음_>` • <N>개 클론 · <C>개 카테고리

## 클론 목록

### Founder (2)

1. **권도균** — 프라이머 대표   `douglas`   _[active]_
   _16년간 300여개사 투자한 국내 1위 액셀러레이터_

2. **Min-Kyu** — 2회 창업, SaaS   `mk-founder`   _[+vc]_

### Dev (3)

3. **Alice** — Distributed systems   `alice`
4. **Bob** — Frontend, React   `bob`   _[+designer]_
   _컴포넌트 시스템과 디자인 토큰 중심으로 일합니다_
5. **Charlie** — Security   `charlie`

## 뭐 할래요?

- 이름 또는 번호로 선택   →  `/openclone 1`  또는  `/openclone douglas`
- 단체 대화방 열기       →  `/openclone room <이름1> <이름2> ...`
- 카테고리 패널 질문      →  `/openclone panel vc "내 SaaS 피봇 어때요?"`
- 새 클론 / 지식 추가    →  `/openclone new`  /  `/openclone ingest <url|path>`
- 종료                 →  `/openclone stop`
```

### English 모양

같은 구조, 라벨만:
- `# openclone`
- `**Status** — Active: … • Room: … • <N> clones · <C> categories`
- `## Clones`
- Section names capitalized: `### Founder (2)`, `### Dev (3)`, …
- `## What next?` + 액션들 (영어 버전)

## 6. 뱃지 규칙

- 활성 클론 Line 1 끝: `_[active]_`
- 현재 room 멤버인 클론 Line 1 끝: `_[in room]_` (active와 동시면 `_[in room, active]_` 한 덩어리)
- 다중 카테고리: `_[+cat1, +cat2]_` — primary 카테고리는 제외, 나머지만.

뱃지 여러 개면 공백으로 구분. 모든 뱃지는 **Line 1의 끝**에 배치 (Line 2엔 tagline 뒷부분만).

## 7. 빈 상태 (클론 0개)

```markdown
# openclone

클론이 아직 하나도 없어요.

- 새로 만들기   →  `/openclone new <name>`
- 내장 클론은 설치 시 함께 배포됩니다. 이 메시지가 보인다면 설치가 손상됐을 수 있어요. README의 재설치 절차를 확인하세요.
```

menu-context는 `items: []`로라도 저장.

## 8. menu-context 저장

렌더 끝날 때마다 `~/.openclone/menu-context`를 **덮어쓰기**. 형식:

```json
{"shown_at":"2026-04-22T10:00:00Z",
 "items":[
   {"n":1,"name":"douglas"},
   {"n":2,"name":"mk-founder"},
   {"n":3,"name":"alice"},
   {"n":4,"name":"bob"},
   {"n":5,"name":"charlie"}
 ]}
```

- `shown_at`: UTC ISO-8601. `date -u +%Y-%m-%dT%H:%M:%SZ` 로 얻을 것.
- `items`: 각 엔트리는 `{n, name}`만. display_name은 저장하지 않음 — 해석은 `name`으로 충분.
- 아토믹 쓰기가 필요하진 않음. 덮어쓰기 실패해도 홈 패널 자체는 사용자가 읽을 수 있으니 경고만 남기고 계속.

```bash
mkdir -p ~/.openclone
python3 - <<'PY' > ~/.openclone/menu-context
import json, datetime
items = [  # fill in with the ordered list
  {"n": 1, "name": "douglas"},
  # ...
]
print(json.dumps({
  "shown_at": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
  "items": items,
}))
PY
```

(Python3이 없을 리는 없지만, 없으면 `printf`로 단순 한 줄 JSON을 조립해도 됨.)

## 9. 규칙

- 홈 패널 렌더 중 어떤 클론도 **연기하지 않음**. 이것은 시스템 표면이지 페르소나 응답이 아님.
- 이모지 없음.
- 클론 수가 많아도 모두 나열 (페이지네이션 없음). 너무 많으면 섹션 카운트 `(N)`이 자연스럽게 큰 숫자를 보여주므로 OK.
- 번호 부여는 **매 렌더마다 새로** — 유저가 홈 패널을 다시 열면 번호가 바뀔 수 있음. 숫자 선택은 "가장 최근 홈 패널"에만 유효.
- 홈 패널 렌더 후 이 턴은 종료. 유저가 다음 메시지에서 번호/이름/서브명령을 보낼 때까지 대기.
