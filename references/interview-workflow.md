# Interview workflow

How Claude conducts a clone-creation interview and consolidates the transcript into a clone file. Loaded by `/openclone:new`.

## Overall shape

1. Category selection (at least one required; multiple allowed)
2. Core identity block (5–7 questions)
3. Category-specific deep dive (6–10 questions per chosen category — trim if many)
4. Speaking-style elicitation (3–4 questions)
5. Guardrails — always/never (2–3 questions)
6. Consolidation into `~/.openclone/clones/<name>/persona.md` (folder-per-clone layout)

The user can stop at any time by saying "done", "끝", "저장해" or similar. Consolidate with whatever has been captured.

## Interviewer rules (apply every question)

- Ask **exactly one** question per turn. No compound questions, no "and also…".
- Keep questions to 1–2 sentences.
- No pleasantries, no greetings, no filler. Direct and specific.
- Match the language the user is using. If the user replies in Korean, continue in Korean.
- If the user's answer is vague, do one pointed follow-up before moving on.
- Never reference "clone", "AI", "interview", "training" — frame questions as if you're getting to know a person, not building a bot.

## Stage 1 — Category selection

If the user did not supply categories (either in the command or in chat), ask:

> 어떤 카테고리인가요? 다음 중 **하나 이상** 골라주세요 — 둘 이상 맡는 사람이면 복수 선택 OK: **vc**, **dev**, **founder**, **pm**, **designer**, **writer**, **marketing**, **hr**

Do not proceed until the user names at least one value from this list. If they pick more than one, also ask which is the **primary** category (default lens for `/openclone:use`). Parse inputs like `vc`, `vc, founder`, `founder+vc` etc.

If the chosen categories are genuinely distinct roles the same person plays (e.g. founder + vc), Stage 3 should cover each category briefly — do not interview for every category at full depth; prioritize the primary one plus 2–3 key questions per additional category.

## Stage 2 — Core identity (always run, any category)

Ask these in order, one per turn. Skip any that the user already covered:

1. 이 클론의 display name 과 한 줄 태그라인은 어떻게 할까요?
2. 어떤 배경/경력을 가진 사람인가요?
3. 지금 가장 몰입해 있는 질문이나 관심사는?
4. 의견을 낼 때 어떤 기준으로 판단하나요?
5. 이 사람을 아는 사람들이 "얘는 이런 사람이다" 한 줄로 말한다면?

## Stage 3 — Category-specific dive

Pull **3–6** questions from the matching block. Prioritize depth over coverage — if the user gives a rich answer, follow up.

### vc

- 주로 어떤 단계·섹터를 보나요?
- 딜 평가할 때 먼저 무엇을 보나요? (시장·팀·트랙션·제품 중 우선순위)
- 최근 놓친 딜 하나와 그 이유는?
- 창업자에게 자주 하는 "불편한 질문" 한 가지?
- 어떤 유형의 창업자를 높게 보나요?

### dev

- 주로 쓰는 언어/스택과, 그 선택의 이유는?
- 설계할 때 가장 먼저 고려하는 것은? (성능·유지보수·단순성 등)
- 최근 크게 후회한 기술 결정 하나와 배운 것?
- 코드 리뷰에서 절대 봐주지 않는 것은?
- "좋은 엔지니어"와 "훌륭한 엔지니어"의 차이는?

### founder

- 지금 회사의 핵심 가설과, 아직 검증 안 된 것은?
- 창업 중 가장 큰 실수와 교정 방법은?
- 팀 빌딩에서 타협하지 않는 기준은?
- 펀딩 vs 수익 중 어느 쪽을 더 중요하게 봤고 왜?
- "지금 회사를 다시 시작한다면 뭘 바꿀까?"

### pm

- 우선순위 정할 때 쓰는 프레임은?
- 유저 리서치와 데이터 중 어떤 걸 더 신뢰하나요? 상황은?
- 엔지니어링과 충돌할 때 어떻게 푸는가?
- 본인이 내린 로드맵 결정 중 가장 자랑스러운 것과 후회되는 것?
- 좋은 PRD의 필수 요소는?

### designer

- 디자인 철학을 한 문장으로?
- 브리프를 받으면 먼저 뭘 하나요?
- 좋아하는 제품·브랜드와 그 이유는?
- 피드백 중 무시하는 것과 진지하게 듣는 것을 가르는 기준은?
- 제약이 많을 때 어떻게 접근하는가?

### writer

- 본인 글의 핵심 보이스를 한 문장으로?
- 글쓰기 시작할 때 가장 먼저 하는 작업은?
- 퇴고에서 반드시 잘라내는 패턴 3가지?
- 영향 받은 작가·편집자와 그 이유는?
- 본인이 잘 못 쓰는 장르·주제와 왜?

## Stage 4 — Speaking style

1. 글이나 대화에서 말투의 특징이 있다면? (예: 짧게 말함, 질문으로 응답, 반어법 등)
2. 절대 안 쓰는 표현이나 금기어가 있나요?
3. 예시 한 문단만 주세요 — 이 사람이 평소 쓸 법한 말투로 짧게 써보세요.

## Stage 5 — Guardrails

1. 이 클론이 **항상** 지켜야 할 원칙 2–3가지?
2. 이 클론이 **절대 하지 말아야** 할 것 2–3가지? (주제·발언·조언 등)

## Stage 6 — Consolidation

When the user signals done (or after the last stage), write the clone folder.

- Persona path: `~/.openclone/clones/<name>/persona.md`
- Ensure the folder exists: `mkdir -p "$HOME/.openclone/clones/<name>/knowledge"`
- Follow the schema in `clone-schema.md` exactly: frontmatter + Persona + Speaking style + Guidelines + Background.
- **Frontmatter must include `categories: [...]`** with every category the user chose, and `primary_category` if they named one.
- If the user picked **multiple categories** and the Stage 3 answers indicate distinct framing per role, include a `## Category-specific framing` section with one `### As a <category>` block per category. Each block: 2–4 bullets on emphasis/extra-always/extra-never that only apply in that category's context.
- Summarize the user's answers into prose; do NOT copy raw Q&A. Extract facts and rephrase in third person for Persona/Background, in imperative bullets for Speaking style/Guidelines.
- Preserve concrete facts: names, numbers, dates, specific anecdotes.
- Do not mention "interview", "AI", "clone" inside the clone body.
- Match the language the user used throughout the interview.

Also save the raw transcript as the clone's first knowledge entry:

- Path: `~/.openclone/clones/<name>/knowledge/YYYY-MM-DD-interview.md` (where `YYYY-MM-DD` is today)
- Frontmatter: `topic: interview`, `source_type: interview`, `fetched: YYYY-MM-DD`
- Format: simple `### Q:` / `A:` pairs in the user's language.

After saving, confirm to the user in one line with the final file path, and suggest:

> `/openclone:use <name>` 로 바로 이 클론과 대화를 시작하세요.
