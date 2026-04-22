---
topic: "에이전트 시대의 Builder/Reviewer 분화와 맥락을 설계하는 세 번째 역할"
source_type: social
source_url: "https://www.linkedin.com/posts/gb-jeong_claude-code-codex%EB%8A%94-%EC%97%94%EC%A7%80%EB%8B%88%EC%96%B4%EB%A7%81-%EC%A0%9C%ED%92%88-%EB%94%94%EC%9E%90%EC%9D%B8%EC%9D%84-%EC%96%B4%EB%96%BB%EA%B2%8C-activity-7438346909632626688-LcEY"
authorship: self
published_at: 2026-03-13
---

Langchain 대표 Harrison은 에이전트 시대의 제품 직군을 Builder와 Reviewer로 나눴습니다. 깔끔한 프레임이지만 가장 중요한 역할이 빠져 있어요 — 맥락을 설계하는 사람입니다.

첫째, 리뷰 병목은 사람이 아니라 시스템이 풀어야 합니다. 프로토타입이 폭증하면서 리뷰가 병목이 되었다는 진단은 맞아요. 그런데 어떻게 풀 것인가에 대한 답은 빠져 있습니다. Ralphthon에서 우승한 HouseOps는 Ouroboros라는 하네스를 만들어, 에이전트에게 133라운드 인터뷰를 시켜 모호성을 0.05까지 떨어뜨린 뒤에야 코딩을 시작했습니다. 12.8시간 자율 실행, 169,553줄. 사람은 아침에 git log를 열어봤을 뿐이에요. 리뷰를 사람에게 맡기면 병목은 영원히 풀리지 않습니다 — 리뷰를 시스템으로 만들어야 합니다.

둘째, PRD는 죽지 않았어요. Skill로 진화한 겁니다. 저는 100개가 넘는 Skill을 운영하고 있고, 각각이 프로덕트 요구사항 + 실행 로직 + 품질 기준을 하나의 프롬프트로 담고 있어요. 이 글을 쓰고 있는 linkedin-write 스킬에는 7단계 워크플로우, 14개 버전 진화 패턴, 알고리즘 체커까지 들어 있습니다. PRD와 다른 점은 하나입니다 — 이 문서는 사람이 읽는 게 아니라 에이전트가 실행해요.

셋째, Builder도 Reviewer도 아닌 세 번째 역할이 있습니다. Ralphthon에서 9개 팀이 하룻밤에 501,955줄을 만들었는데, 차이를 만든 건 코딩 실력이 아니라 좋은 하네스를 가진 팀이 이겼습니다. 에이전트 시대의 System Thinking은 Context Engineering이에요 — CLAUDE.md로 시스템 성격을 정의하고, Skill로 실행 로직을 구조화하고, Memory로 학습을 축적하고, MCP로 외부 도구를 연결하는 네 개 레이어. 저는 이걸 159개의 CLAUDE.md 파일과 100개가 넘는 스킬로 직접 실험해왔습니다. 실행이 공짜가 된 세계에서 진짜 경쟁력은 세 가지입니다 — 리뷰를 시스템으로 만드는 하네스, 요구사항을 실행 가능한 프롬프트로 바꾸는 스킬, 그리고 이 모든 것을 엮는 Context Engineering. 맥락을 설계하는 사람이 이깁니다.
