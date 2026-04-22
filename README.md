# openclone

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Skill-8A2BE2)](https://docs.claude.com/en/docs/claude-code)
[![Status](https://img.shields.io/badge/Status-v0.2-brightgreen)](CHANGELOG.md)
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

현재 저장소에 기본 포함된 프리셋 클론 목록입니다. 체크(`[x]`) 표시는 **본인이 직접 확인하고 공식적으로 수락한 클론**입니다. 체크가 없는 항목은 공개된 인터뷰·발언·글을 바탕으로 구성되었으며, 본인의 수정·제거 요청은 아래 [옵트인](#옵트인-실존-인물-클론) 섹션을 참고하세요.

- [ ] **[장동욱 (Brian)](clones/brian/persona.md)** · `vc` — 카카오벤처스 이사. 당근·한국신용데이터·퀸잇 등 60+ 초기팀 투자
- [ ] **[노정석 (Chester Roh)](clones/chester/persona.md)** · `founder`, `vc` — 아시아 최초 구글 인수 창업자. 6연속 창업·엔젤투자·컴퍼니빌더 25년
- [ ] **[김철우](clones/chulwukim/persona.md)** · `vc`, `founder` — 더벤처스 대표. 셀잇→카카오 매각, 번개장터 PEF 엑싯 경험 창업자 출신 VC
- [ ] **[권도균](clones/douglas/persona.md)** · `founder`, `vc` — 프라이머 대표. 16년간 300여개사 투자한 국내 1위 액셀러레이터
- [x] **[조여준 (Ethan Cho)](clones/ethan/persona.md)** · `vc` — 더벤처스 CIO. 구글·퀄컴벤처스·KB인베스트먼트 출신, 두나무·토스 초기 검증
- [x] **[정구봉](clones/gbjeong/persona.md)** · `tech`, `founder` — 팀어텐션 대표. 자타공인 Claude Code 전문가, AI 에이전트·자동화 엔지니어
- [ ] **[김동현 (이드)](clones/iid/persona.md)** · `expert` — 티오더 HR Director. 토스·야놀자·클래스101 거친 실행형 HR 파트너
- [ ] **[신재명 (Jay Shin)](clones/jayshin/persona.md)** · `founder` — 딜라이트룸 창업자. 글로벌 1억 다운로드 알라미, 340억 매출 웰니스 앱
- [ ] **[이동욱 (향로)](clones/jojoldu/persona.md)** · `tech` — 인프랩 CTO. 기록하는 개발자, "기억보단 기록을" · "개발바닥"
- [ ] **[조쉬](clones/josh/persona.md)** · `founder`, `expert` — AI 솔로프리너. 빌더 조쉬 · 조쉬의 뉴스레터 · 《나는 솔로프리너다》 저자
- [x] **[이경훈](clones/kyunghun/persona.md)** · `founder`, `vc` — 채널코퍼레이션 부대표·CAIO. 글로벌브레인 한국 대표 출신 AI·일본 시장 전문가
- [ ] **[김용훈 (Levi)](clones/levi/persona.md)** · `expert` — 김용훈그로스연구소 대표. 160+ 스타트업의 그로스 마케팅, M&A·IPO 경험 CMO

## 설치

### 옵션 A — Claude Code에 맡기기 (권장)

Claude Code 세션에 아래 문단을 붙여넣으세요.

```text
Install openclone: run
  git clone --filter=blob:none --sparse --depth=1 https://github.com/taurin-inc/openclone.git ~/.claude/skills/openclone && cd ~/.claude/skills/openclone && git sparse-checkout set --no-cone '/*' '!/clones/*/knowledge/' && ./setup
then restart Claude Code (or start a new session) so the skill's hooks are picked up. Add an "openclone" section to ~/.claude/CLAUDE.md briefly explaining what openclone is: a single slash command `/openclone` that opens a home panel of AI persona clones grouped by category (vc, tech, founder, expert, influencer, politician, celebrity). Subcommands: `/openclone <name|N>` activates a clone, `/openclone room <A> <B> ...` opens a group chat where the most relevant clone auto-responds, `/openclone panel <category> "..."` broadcasts to all clones in that category, `/openclone new` creates a clone, `/openclone ingest <url|path>` feeds knowledge, `/openclone stop` exits. Knowledge for a built-in clone is lazy-fetched on first activation. Finally, confirm the skill loaded by running /openclone and show me the output.
```

Claude Code가 설치를 대신 수행하고, `~/.claude/CLAUDE.md`에 사용법 메모를 추가해 앞으로 자연스럽게 인식하도록 만듭니다.

### 옵션 B — 터미널에서 직접

```bash
git clone --filter=blob:none --sparse --depth=1 \
  https://github.com/taurin-inc/openclone.git \
  ~/.claude/skills/openclone \
  && cd ~/.claude/skills/openclone \
  && git sparse-checkout set --no-cone '/*' '!/clones/*/knowledge/' \
  && ./setup
```

설치 후 Claude Code 세션을 재시작하면 `/openclone`이 바로 동작합니다.

### 플랫폼 지원

| 환경 | 상태 | 비고 |
| --- | --- | --- |
| macOS | ✅ 정식 지원 | 주요 개발·검증 환경 |
| Linux | ✅ 정식 지원 | |
| Windows (WSL2) | ✅ 동작 | 리눅스로 취급됨. 권장 |
| Windows (Git Bash) | ⚠️ 미지원 | 훅 실행이 환경 의존적. `session-update.sh`의 백그라운드 detach와 `dev-link.sh`의 `ln -sfn`이 특히 취약 |
| Windows (cmd / PowerShell 네이티브) | ❌ 미지원 | 훅·스크립트가 전부 bash 기반. 현재 구조로는 불가능 |

`CLAUDE_CONFIG_DIR` 환경변수로 `~/.claude` 위치를 옮긴 경우에도 `setup`/`uninstall`이 자동으로 따라갑니다.

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

**문의 경로** — 공개 요청은 [옵트인 이슈 템플릿](https://github.com/taurin-inc/openclone/issues/new?template=opt_in_request.md), 사적 증빙이 필요한 경우는 `hayun@rapidstudio.dev`로 부탁드립니다.

**응답 목표** — 접수 후 7일 이내 초기 응답. 제거 요청은 본인 확인 즉시 저장소에 반영하며, 사용자 로컬에는 다음 자동 업데이트 때 전달됩니다.

## 더 보기

- [CONTRIBUTING.md](CONTRIBUTING.md) — 기여 가이드 (새 클론 추가, 커맨드·훅 개발)
- [references/clone-schema.md](references/clone-schema.md) — 클론 파일 스펙
- [references/categories.md](references/categories.md) — 카테고리 렌즈·톤 가이드
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) · [SECURITY.md](SECURITY.md)
- 후원: [팀어텐션 (Team Attention)](https://www.team-attention.com/)
- 라이선스: MIT — [LICENSE](LICENSE)
