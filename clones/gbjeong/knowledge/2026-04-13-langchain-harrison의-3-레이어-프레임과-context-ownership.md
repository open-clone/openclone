---
topic: "LangChain Harrison의 Model/Harness/Context 3-레이어 프레임과 context ownership 본질"
source_type: social
source_url: "https://www.linkedin.com/posts/gb-jeong_langchain-ceo-harrison-chase%EA%B0%80-2%EC%A3%BC%EC%97%90-%EA%B1%B8%EC%B3%90-%EB%91%90-%ED%8E%B8%EC%9D%98-activity-7449569619729629184-WyMl"
authorship: self
published_at: 2026-04-13
---

LangChain CEO Harrison Chase가 2주에 걸쳐 두 편의 글을 썼습니다. 1편은 48만 뷰, 2편은 170만 뷰. AI 에이전트 시대의 진짜 경쟁 우위가 어디에 있는지를 다룹니다. Chase의 핵심 프레임은 — 에이전트 시스템에서 학습은 3개 레이어에서 일어난다: Model(모델 가중치), Harness(에이전트를 구동하는 코드), Context(harness를 설정하는 명령어와 스킬과 메모리). 이 중 context layer에서 학습이 가장 실질적으로 일어나고, 이걸 Chase는 "memory"라고 부릅니다. 2편에서 진짜 주장이 나옵니다 — 메모리는 harness에서 분리할 수 없고, 폐쇄형 harness를 쓰면 메모리도 벤더에 잠긴다. 결론은 "genuine memory ownership requires open harness architecture." 1편에서 중립적 분류 체계를 깔고, 2편에서 자사 제품(Deep Agents) 포지셔닝에 쓰는 교묘한 구조입니다.

Chase의 프레임은 맞습니다. context layer가 진짜 moat인 것도 맞아요. 그런데 이걸 "오픈 vs 폐쇄" 이분법으로 풀면 핵심을 놓칩니다. 진짜 질문은 "내 context를 내가 갖고 있느냐"입니다. 저는 이 3개 레이어 위에서 매일 일합니다. 직접 만든 스킬이 60개가 넘어요 — 링크드인 글을 쓰는 스킬, 이메일을 보내는 스킬, 캘린더를 관리하는 스킬, 파트너사별로 맥락을 수집하는 스킬. 하나하나가 제가 시행착오를 거쳐 축적한 context layer입니다. 그리고 이 스킬들 위에 memory 시스템이 있어요. 세션이 끝나도 Claude가 저를 기억합니다. CLAUDE.md와 skills와 memory는 전부 로컬 파일이고 git으로 버전 관리하고 내일 다른 harness로 들고 갈 수 있어요. 오픈 harness라도 메모리가 벤더 DB에 쌓이면 락인입니다. 폐쇄형 harness라도 컨텍스트가 로컬 파일이면 제 것입니다. 심지어 요샌 더 많이 쓰는 Codex는 오픈소스죠.

이 시대에 진짜 필요한 건 오픈 harness 하나가 아닙니다. context layer를 설계하고 축적하는 문화 자체예요 — 스킬을 만들고, 메모리를 구조화하고, 에이전트와 함께 일하는 방식을 매일 실험하는 사람들. 저는 지금 이 일을 같이 할 동료를 찾고 있습니다. 에이전트와 함께 살아가는 새로운 문화를 실험하고, 그 문화를 글로벌 스케일로 확장하는 데 관심 있는 사람. 오픈 harness 개발, 브랜딩, 이벤트 오퍼레이션, 영상 등 다양한 방면에서 도움이 필요합니다.
