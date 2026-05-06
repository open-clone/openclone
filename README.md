# openclone

**한국어** | [English](README_en.md) | [简体中文](README_zh.md)

[![Code: MIT](https://img.shields.io/badge/Code-MIT-yellow.svg)](LICENSE)
[![Content: CC BY-NC-SA 4.0](https://img.shields.io/badge/Content-CC%20BY--NC--SA%204.0-lightgrey.svg)](clones/LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Skill-8A2BE2)](https://docs.claude.com/en/docs/claude-code)
[![Status](https://img.shields.io/badge/Status-v0.3.0-brightgreen)](CHANGELOG.md)
![Made in Korea](https://img.shields.io/badge/Made%20in-Korea-blue)

> **Claude Code 안에서 AI 페르소나 클론과 대화하는 스킬.**

## 소개

`/openclone` 한 줄로 AI 페르소나 클론을 만들고, 활성화하고, 단체 대화방이나 카테고리 패널로 여러 관점을 한 번에 들을 수 있습니다.

- **기본 클론과 바로 대화** — 설치 직후 큐레이션된 프리셋(예: `douglas`/권도균) 사용 가능
- **나만의 클론 만들기** — 인터뷰로 페르소나와 지식을 쌓아 내 전용 클론 생성
- **단체 대화방(room)** — 여러 클론을 한 방에 모으면 질문에 가장 적합한 클론이 자동 응답
- **카테고리 패널** — 같은 카테고리의 모든 클론에게 동시에 질문하고 관점을 나란히 비교
- **지식 주입** — URL·영상 자막·문서를 활성 클론에 학습시켜 로컬 파일로 보관

모든 데이터는 내 컴퓨터에 마크다운으로 저장됩니다. 서버도, 계정도, SaaS도 없습니다.

## 기본 클론

현재 저장소에 기본 포함된 프리셋 클론 목록입니다. **Official** 컬럼의 ✅ 표시는 본인이 직접 확인하고 공식적으로 수락한 클론입니다. 그 외 항목은 공개된 인터뷰·발언·글을 바탕으로 구성되었으며, 본인의 수정·제거 요청은 아래 [옵트인](#옵트인-실존-인물-클론) 섹션을 참고하세요.

| Official | 이름 | 카테고리 | 소개 |
| :---: | --- | --- | --- |
| ✅ | [장동욱 (Brian)](clones/brian/persona.md) | `vc` | 카카오벤처스 이사. 당근·한국신용데이터·퀸잇 등 60+ 초기팀 투자 |
|  | [노정석 (Chester Roh)](clones/chester/persona.md) | `founder`, `vc` | 아시아 최초 구글 인수 창업자. 6연속 창업·엔젤투자·컴퍼니빌더 25년 |
| ✅ | [김철우](clones/chulwukim/persona.md) | `vc`, `founder` | 더벤처스 대표. 셀잇→카카오 매각, 번개장터 PEF 엑싯 경험 창업자 출신 VC |
| ✅ | [권도균](clones/douglas/persona.md) | `founder`, `vc` | 프라이머 대표. 16년간 300여개사 투자한 국내 1위 액셀러레이터 |
| ✅ | [조여준 (Ethan Cho)](clones/ethan/persona.md) | `vc` | 더벤처스 CIO. 구글·퀄컴벤처스·KB인베스트먼트 출신, 두나무·토스 초기 검증 |
| ✅ | [정구봉](clones/gbjeong/persona.md) | `tech`, `founder` | 팀어텐션 대표. 자타공인 Claude Code 전문가, AI 에이전트·자동화 엔지니어 |
| ✅ | [김동현 (이드)](clones/iid/persona.md) | `expert` | 티오더 HR Director. 토스·야놀자·클래스101 거친 실행형 HR 파트너 |
| ✅ | [신재명 (Jay Shin)](clones/jayshin/persona.md) | `founder` | 딜라이트룸 창업자. 글로벌 1억 다운로드 알라미, 340억 매출 웰니스 앱 |
|  | [이동욱 (향로)](clones/jojoldu/persona.md) | `tech` | 인프랩 CTO. 기록하는 개발자, "기억보단 기록을" · "개발바닥" |
| ✅ | [조쉬](clones/josh/persona.md) | `founder`, `expert` | 빌더 조쉬 · 조쉬의 뉴스레터 · 《나는 솔로프리너다》 저자 |
| ✅ | [이경훈](clones/kyunghun/persona.md) | `founder`, `vc` | 채널코퍼레이션 부대표·CAIO. 글로벌브레인 한국 대표 출신 AI·일본 시장 전문가 |
| ✅ | [김용훈 (Levi)](clones/levi/persona.md) | `expert` | 김용훈그로스연구소 대표. 160+ 스타트업의 그로스 마케팅, M&A·IPO 경험 CMO |
|  | [이승건 (SG Lee)](clones/sglee/persona.md) | `founder`, `expert` | 토스팀 리더·비바리퍼블리카 창업자. 5년 8번 실패 뒤 9번째로 국민 슈퍼앱을 만든 사람 |
|  | [김동신 (John Kim)](clones/johnkim/persona.md) | `founder`, `expert` | 센드버드 창업자. 파프리카랩 Exit → 스마일패밀리 피봇 → 한국인 최초 실리콘밸리 B2B 유니콘. 현재 Delight.ai |

## 설치

openclone은 **두 가지 사용 경로**를 제공합니다. 본인 환경에 맞는 섹션을 따라가세요.

| 경로 | 어떨 때 쓰나 | 호스트 |
|---|---|---|
| **A. Claude Code 스킬** | Claude Code에서 `/openclone` 슬래시 명령으로 클론과 대화하고 싶을 때 | Claude Code |
| **B. Standalone CLI** | 어떤 터미널에서든 `openclone` 명령어로 OpenAI/Ollama/Codex 모델을 써서 클론과 대화하고 싶을 때 | macOS/Linux/WSL2 |

---

### A. Claude Code 스킬로 설치

Claude Code 안에서 `/openclone` 슬래시 명령, 단체방, 카테고리 패널, 자연어 활성화 등 모든 인터랙션 기능을 쓸 수 있습니다.

#### 옵션 A1 — Claude Code에 맡기기

Claude Code 세션에 아래 문단을 붙여넣으세요.

```text
Install openclone: run
  git clone --filter=blob:none --sparse --depth=1 https://github.com/open-clone/openclone.git ~/.claude/skills/openclone && cd ~/.claude/skills/openclone && git sparse-checkout set --no-cone '/*' '!/clones/*/knowledge/' && ./setup
then restart Claude Code (or start a new session) so the skill's hooks are picked up. Add an "openclone" section to ~/.claude/CLAUDE.md briefly explaining what openclone is: a single slash command `/openclone` that opens a home panel of AI persona clones grouped by category (vc, tech, founder, expert, influencer, politician, celebrity). Subcommands: `/openclone <name|N>` activates a clone, `/openclone room <A> <B> ...` opens a group chat where the most relevant clone auto-responds, `/openclone panel <category> "..."` broadcasts to all clones in that category, `/openclone new` creates a clone, `/openclone ingest <url|path>` feeds knowledge, `/openclone stop` exits. Knowledge for a built-in clone is lazy-fetched on first activation. Finally, confirm the skill loaded by running /openclone and show me the output.
```

Claude Code가 설치를 대신 수행하고, `~/.claude/CLAUDE.md`에 사용법 메모를 추가해 앞으로 자연스럽게 인식하도록 만듭니다.

#### 옵션 A2 — 터미널에서 직접

```bash
git clone --filter=blob:none --sparse --depth=1 \
  https://github.com/open-clone/openclone.git \
  ~/.claude/skills/openclone \
  && cd ~/.claude/skills/openclone \
  && git sparse-checkout set --no-cone '/*' '!/clones/*/knowledge/' \
  && ./setup
```

설치 후 Claude Code 세션을 재시작하면 `/openclone`이 바로 동작합니다. Claude Code 사용법은 아래 [이용 방법](#이용-방법) 섹션을 참고하세요.

---

### B. Standalone CLI로 설치

`openclone` 바이너리 한 줄 설치로 어떤 터미널에서든 클론과 대화할 수 있습니다. OpenAI-compatible API, Codex OAuth, 로컬 Ollama 모델을 모두 지원합니다.

#### B1. 설치

```bash
npm install -g @openclone/openclone
```

설치되면 `openclone` 명령어가 PATH에 추가됩니다. 14개 기본 클론과 모든 knowledge 파일이 패키지에 포함되어 있어 바로 쓸 수 있습니다.

```bash
openclone list
openclone chat douglas
```

#### B2. (권장) Vercel Agent Skills로 사용법 안내 받기

이 저장소는 Claude Code·Cursor·Copilot·Codex·Cline·Gemini 등 18+ AI 코딩 에이전트가 인식할 수 있는 [Vercel Agent Skill](https://vercel.com/docs/agent-resources/skills)을 함께 제공합니다. 설치하면 사용 중인 에이전트가 openclone CLI 사용법(설치, provider 선택, 세션 관리, 트러블슈팅)을 직접 안내해 줍니다.

```bash
npx skills add open-clone/openclone --skill openclone-cli
```

설치 후 에이전트에게 자연어로 물어보세요.

```text
"openclone CLI를 처음 쓰는데 OpenAI API 키로 시작하려면?"
"openclone history 명령으로 이전 대화 어떻게 이어가지?"
"Ollama 로컬 모델로 openclone 돌리고 싶어"
"openclone chat에서 --resume과 --resume=<id> 차이가 뭐야?"
```

에이전트가 `skills/openclone-cli/SKILL.md`와 그 안의 `references/*.md`(provider별 setup, 세션 영속화, 트러블슈팅 등)를 필요할 때만 읽어와서 짧고 실행 가능한 답을 줍니다.

설치된 스킬 확인·업데이트:

```bash
npx skills list
npx skills check
npx skills update
```

#### B3. 직접 사용하기

```bash
openclone list                                                # 사용 가능한 클론 목록
openclone status                                              # 활성 클론·방 상태
openclone chat <slug> --prompt "질문"                          # 단일 응답 (자동으로 세션 저장)
openclone chat <slug>                                         # 인터랙티브 모드 (TUI)
openclone history <slug>                                      # 한 클론의 저장된 세션
openclone history --all                                       # 모든 클론 세션 (orphan 표시 포함)
openclone chat <slug> --resume                                # 가장 최근 세션 이어가기 (인터랙티브)
openclone chat <slug> --resume --prompt "follow-up"           # 가장 최근 세션 이어가기 (단일 응답)
openclone chat <slug> --resume=<SESSION_ID> --prompt "..."    # 특정 세션 이어가기 (단일 응답)
openclone chat <slug> --no-persist                            # 이번 세션은 디스크에 저장 안 함
```

`--prompt`를 함께 쓰면 한 턴만 처리하고 즉시 종료합니다. 응답 본문은 `stdout`, 세션 식별자는 `stderr`에 `[session: <id>]` 형태로 출력되어 에이전트가 멀티턴 대화를 짤 때 깔끔하게 캡처할 수 있습니다.

```bash
# 첫 턴
RESPONSE=$(openclone chat douglas --prompt "초기 펀드레이징 어떻게?")
# stderr 의 [session: ...] 을 캡처하려면 2> 로 분리
openclone chat douglas --prompt "초기 펀드레이징 어떻게?" 2>session.log
SESSION_ID=$(grep -oE '\[session: [^]]+\]' session.log | sed 's/\[session: //;s/\]//')

# 같은 세션으로 follow-up
openclone chat douglas --resume=$SESSION_ID --prompt "그중 첫째 더 자세히"
openclone chat douglas --resume=$SESSION_ID --prompt "사례 알려줘"
```

#### B4. Provider 설정

기본 provider는 OpenAI-compatible이고 기본 모델은 `gpt-5.5`입니다. 환경변수로 한 번 세팅하거나 매번 플래그로 지정할 수 있습니다.

**OpenAI-compatible API:**

```bash
export OPENCLONE_API_KEY="sk-..."        # 또는 OPENAI_API_KEY
export OPENCLONE_MODEL="gpt-5.5"
openclone chat douglas
```

**Codex OAuth (이미 Codex CLI에 로그인된 머신):**

```bash
openclone chat douglas --use-codex-auth --model gpt-5.5
```

ChatGPT 백엔드가 ChatGPT 일반 사용자 토큰에 대해 `store=true` 요청을 거부하기 때문에 Codex OAuth는 기본적으로 response item persistence를 끕니다(`store=false`). CLI가 매 턴마다 전체 messages 배열을 직접 전송하므로 `previous_response_id` 없이도 멀티턴 대화가 정상 동작합니다. 다만 도구가 호출되는 멀티 step 흐름에서는 AI SDK가 직전 step의 `rs_...` reasoning/tool item id를 다음 step input에 그대로 재전송해 백엔드가 `Item with id 'rs_...' not found.` 404를 내는 케이스가 있어, 기본적으로 step 사이에서 해당 id와 reasoning part를 제거합니다. 끄고 싶다면 `OPENCLONE_CODEX_STRIP_REASONING=0`.

**Claude Code 구독 OAuth (이미 `claude /login`을 끝낸 머신):**

```bash
openclone chat douglas --use-claude-code-auth --model claude-sonnet-4-6
# alias: --use-claude-auth
```

별도 Anthropic API 키 없이 Claude Pro/Max 구독 토큰을 그대로 재사용합니다. macOS에서는 키체인 항목 `Claude Code-credentials`을, Linux/WSL에서는 `~/.claude/.credentials.json`을 읽고, 만료 임박 시 `https://console.anthropic.com/v1/oauth/token`으로 자동 갱신해 같은 위치에 다시 씁니다. 첫 실행 시 macOS가 띄우는 키체인 접근 다이얼로그는 정상 동작입니다.

**로컬 Ollama:**

```bash
ollama serve &                          # 이미 띄워져 있으면 생략
openclone chat douglas --provider ollama --model llama3.2
```

자세한 provider별 셋업, 트러블슈팅, 세션 관리 동작은 위 [B2 Vercel Agent Skill](#b2-권장-vercel-agent-skills로-사용법-안내-받기)을 통해 에이전트에게 묻거나, `skills/openclone-cli/references/*.md`를 직접 보세요.

#### B5. 인터랙티브 모드 명령

```text
/help     명령어 안내
/compact  오래된 대화를 즉시 요약
/clear    in-memory history와 요약 비우기
/bye      대화 종료 (또는 /exit, /quit)
```

대화는 매 턴마다 그리고 `/bye` 시점에 `~/.openclone/conversations/<slug>/<sessionId>.json`로 평문 JSON으로 저장됩니다. `--resume`으로 다시 시작하면 배너에 `[resumed: N message(s)]`가 뜨고 이전 대화 전체가 터미널에 다시 출력되어, 위로 스크롤하면 무슨 이야기를 했는지 그대로 보입니다. 마지막에 `--- continuing conversation ---` 구분선과 새 `>>>` 프롬프트가 뜹니다. 종료 시 `[session saved: <path>]`가 표시됩니다.

긴 대화는 약 350,000자(`OPENCLONE_COMPACT_MAX_CHARS`, 250K 토큰 컨텍스트 모델 기준 약 70% 지점)를 넘으면 오래된 메시지를 요약하고 최근 8턴(`OPENCLONE_COMPACT_KEEP_TURNS`)은 원문으로 유지합니다. 요약 길이는 `OPENCLONE_COMPACT_SUMMARY_MAX_CHARS`(기본 20,000자)로 조정할 수 있습니다. 컨텍스트가 작은 모델(예: Ollama 8B 이하)을 쓰거나 비용을 줄이고 싶다면 `OPENCLONE_COMPACT_MAX_CHARS`를 더 작게 잡으세요. 압축된 요약도 세션 JSON에 함께 저장되어 `--resume` 시 복원됩니다.

#### B6. 로컬 체크아웃에서 개발자로 실행

```bash
git clone https://github.com/open-clone/openclone.git
cd openclone
npm install
npm run build
node dist/cli/index.js list
node dist/cli/index.js chat douglas
```

---

### C. Codex CLI (실험적)

> ⚠️ **현재는 파일 참조 수준의 실험 지원입니다.** `./setup`이 Claude Code 전용 경로·훅·statusline을 건드리므로 **Codex 환경에서는 `./setup`을 실행하지 마세요.** 슬래시 커맨드 `/openclone`, `UserPromptSubmit`/`SessionStart` 훅 기반 자동 주입, statusline, 백그라운드 자동 업데이트는 아직 동작하지 않으며, 현재는 `clones/<slug>/persona.md`·`knowledge/` 파일을 Codex가 읽도록 배치하는 정도만 가능합니다. 네이티브 `--host=codex` 인스톨러는 추후 릴리스 예정입니다. 단순히 OpenAI Codex 토큰으로 클론과 대화만 하고 싶다면 위 **B. Standalone CLI**의 `--use-codex-auth`를 쓰는 것이 더 간단합니다.

레포만 Codex 스킬 경로에 sparse clone합니다.

```bash
git clone --filter=blob:none --sparse --depth=1 \
  https://github.com/open-clone/openclone.git \
  ~/.codex/skills/openclone \
  && cd ~/.codex/skills/openclone \
  && git sparse-checkout set --no-cone '/*' '!/clones/*/knowledge/'
```

이후 Codex 세션의 `AGENTS.md`(또는 프로젝트 지침)에 아래 문단을 붙여두면, Codex가 대화 맥락에 따라 해당 파일을 참조합니다.

```text
openclone 페르소나·지식이 `~/.codex/skills/openclone/clones/<slug>/` 아래에 있습니다. 사용자가
"<이름>처럼 말해봐" 또는 "openclone <slug>"라고 요청하면 `persona.md`를 읽고 해당 톤·관점을 따르세요.
사용 가능한 클론 목록은 `~/.codex/skills/openclone/README.md`의 "기본 클론" 섹션을 참고합니다.
```

특정 클론의 지식 파일이 필요하면 그때그때 lazy-fetch:

```bash
cd ~/.codex/skills/openclone && git sparse-checkout add clones/<slug>/knowledge/
```

**업데이트**: 자동 업데이트 훅이 없으므로 `git pull --ff-only`로 수동 갱신합니다. **제거**: 디렉터리 삭제(`rm -rf ~/.codex/skills/openclone`)로 충분합니다 — Claude Code처럼 settings.json을 건드리지 않기 때문입니다.

### npm 배포

GitHub Release를 `published` 상태로 만들면 `.github/workflows/publish-npm.yml`이 npm 배포를 수행합니다. Release tag가 npm 패키지 버전의 source of truth입니다.

- tag 예: `v0.3.1` 또는 `0.3.1`
- prerelease tag 예: `v0.4.0-beta.1`
- 일반 release는 npm `latest` dist-tag로 배포
- GitHub prerelease이거나 semver prerelease tag이면 npm `next` dist-tag로 배포
- 저장소 secret `NPM_TOKEN`이 필요합니다.

워크플로는 publish 전에 tag에서 version을 추출해 `package.json`/`package-lock.json`에 `npm version --no-git-tag-version`으로 반영한 뒤 validate/build/test/lint/audit를 통과해야 `npm publish --provenance`를 실행합니다.

### 플랫폼 지원

| 환경 | 상태 | 비고 |
| --- | --- | --- |
| macOS | ✅ 정식 지원 | 주요 개발·검증 환경 |
| Linux | ✅ 정식 지원 | |
| Windows (WSL2) | ✅ 동작 | 리눅스로 취급됨. 권장 |
| Windows (Git Bash) | ⚠️ 미지원 | 훅 실행이 환경 의존적. `session-update.sh`의 백그라운드 detach와 `dev-link.sh`의 `ln -sfn`이 특히 취약 |
| Windows (cmd / PowerShell 네이티브) | ❌ 미지원 | 훅·스크립트가 전부 bash 기반. 현재 구조로는 불가능 |

`CLAUDE_CONFIG_DIR` 환경변수로 `~/.claude` 위치를 옮긴 경우에도 `setup`/`uninstall`이 자동으로 따라갑니다. Codex CLI 호스트 지원은 현재 실험 단계이며, 위 "Codex CLI (실험적)" 섹션을 참고하세요.

<details>
<summary>업데이트·제거·자동 업데이트 끄기</summary>

**업데이트** — 세션 시작 시 백그라운드로 자동 `git pull`이 돌아갑니다(1시간당 1회). 수동으로 갱신하려면:

```bash
cd ~/.claude/skills/openclone && git pull --ff-only
```

**자동 업데이트 끄기·켜기** — 파일 플래그로 토글합니다.

```bash
touch ~/.openclone/no-auto-update    # 끄기
rm ~/.openclone/no-auto-update       # 다시 켜기
```

**제거** — 설치 디렉터리의 `./uninstall`을 실행합니다.

```bash
cd ~/.claude/skills/openclone && ./uninstall
```

내가 만든 클론과 수집한 지식(`~/.openclone/`)은 보존됩니다. 완전히 지우려면 `rm -rf ~/.openclone`.

</details>

<details>
<summary id="설치-트러블슈팅">설치 트러블슈팅 (v1 정리, 재설치)</summary>

**플러그인(0.2.0 이전) 설치에서 올라오는 경우** — 경로가 `~/.claude/plugins/marketplaces/openclone`이었습니다. 먼저 정리하고 위 옵션 A 또는 B를 실행하세요.

```bash
cd ~/.claude/plugins/marketplaces/openclone && ./uninstall
rm -rf ~/.claude/plugins/marketplaces/openclone
rm -f ~/.openclone/no-auto-update
```

`~/.openclone/` 아래 사용자 데이터는 그대로 보존됩니다.

**기존 설치가 깨지거나 업데이트가 막힌 경우** — 지우고 다시 설치하는 쪽이 빠릅니다.

```bash
cd ~/.claude/skills/openclone && ./uninstall
rm -f ~/.openclone/no-auto-update
# 이후 위 옵션 A 또는 B 재실행
```

</details>

## 이용 방법

```text
/openclone                              # 홈 패널 — 카테고리별 클론 목록
/openclone 1                            # 번호로 활성화
/openclone douglas                      # 이름으로 활성화
/openclone stop                         # 활성 클론·방 모두 종료
/openclone new hayun                    # 클론 생성 (인터뷰)
/openclone ingest https://blog/post     # 활성 클론에 지식 추가
/openclone room douglas alice bob       # 단체 대화방
/openclone room add charlie             # 방 멤버 추가
/openclone room leave                   # 방 종료 (활성 클론은 유지)
/openclone panel vc "질문"              # 카테고리 패널 — 모든 vc 클론에게 질문
```

카테고리는 `vc`, `tech`, `founder`, `expert`, `influencer`, `politician`, `celebrity` 7종입니다. 렌즈별 상세는 [references/categories.md](references/categories.md) 참고.

## 옵트인 (실존 인물 클론)

openclone에 기본 클론으로 배포되는 인물 페르소나는 **공개된 인터뷰·발언·글**만을 바탕으로 구성되며, 해당 인물의 "아바타"가 아니라 공개된 관점을 요약·재현하는 도구입니다.

본인이라면 언제든 아래 요청을 하실 수 있습니다.

- 현재 기본 클론에 포함된 자료 확인
- 특정 인용·문장·지식 파일의 수정·삭제
- 표기 정정 (`display_name`, `tagline`, 소속 등)
- 페르소나 전체 제거

**문의 경로** — 공개 요청은 [옵트인 이슈 템플릿](https://github.com/open-clone/openclone/issues/new?template=opt_in_request.md), 사적 증빙이 필요한 경우는 `hayun@rapidstudio.dev`로 부탁드립니다.

**응답 목표** — 접수 후 7일 이내 초기 응답. 제거 요청은 본인 확인 즉시 저장소에 반영하며, 사용자 로컬에는 다음 자동 업데이트 때 전달됩니다.

## 더 보기

- [CONTRIBUTING.md](CONTRIBUTING.md) — 기여 가이드 (새 클론 추가, 커맨드·훅 개발)
- [references/clone-schema.md](references/clone-schema.md) — 클론 파일 스펙
- [references/categories.md](references/categories.md) — 카테고리 렌즈·톤 가이드
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) · [SECURITY.md](SECURITY.md)
- 후원: [팀어텐션 (Team Attention)](https://www.team-attention.com/)

## 라이선스

openclone은 코드와 클론 콘텐츠에 서로 다른 라이선스를 적용합니다.

- **소스 코드 (저장소 전반)**: MIT — [LICENSE](LICENSE)
- **클론 콘텐츠 (`clones/**`)**: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0) — [clones/LICENSE](clones/LICENSE)
  - 저작자 표기(BY) + 비상업적 용도(NC) + 동일 라이선스 공유(SA) 의무
  - 표기 방법, 원저작자 권리, 옵트아웃 절차는 [clones/NOTICE.md](clones/NOTICE.md) 참고

상업적 사용 문의: `hayun@rapidstudio.dev`
