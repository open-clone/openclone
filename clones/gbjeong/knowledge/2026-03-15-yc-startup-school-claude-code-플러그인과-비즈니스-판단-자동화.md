---
topic: "YC Startup School 트랜스크립트를 Claude Code 플러그인으로 만들고 비즈니스 판단을 AI와 함께 하기"
source_type: social
source_url: "https://www.linkedin.com/posts/gb-jeong_github-team-attentionyc-startup-school-activity-7438763529731555328-nBrF"
authorship: self
published_at: 2026-03-15
---

YC Startup School 풀 트랜스크립트를 Claude Code 플러그인으로 만들었습니다. /yc-2를 입력하면 아이디어 검증을, /yc-3을 입력하면 공동창업자 지분 프레임워크를, /pg를 입력하면 Paul Graham 에세이가 맥락으로 제 상황을 진단해요. 엔지니어링이 아니라 비즈니스 판단을 AI와 함께 하기 위해 만들었습니다.

토큰을 그냥 많이 쓰는 게 아니라 질 좋은 Context를 넣어주어야 합니다. 그동안 제 프로젝트 문서를 다 주고 서브에이전트와 팀모드로 이터레이션을 마구 돌렸던 것보다, 이 YC Startup School 스킬만 쥐어주고 Codex 혼자서 결과를 내게 한 것이 더 좋았어요. 특히 Claude Code보다 Codex에게 핸들을 완전히 넘긴 경우가 가장 결과가 좋았습니다 — 베어메탈로 진행을 뽑아내는 것보다, 검증된 프레임워크를 컨텍스트로 넣어주는 게 더 낫다는 걸 직접 확인했어요. 이번 주에 존경하는 대표님께 SF에서 어떤 관점으로 관찰하면 좋을지 여쭤봤더니 "배우러 가면 배우지 못한다, 팔러 가야 배운다"라고 하셨습니다. 단단한 가설을 가지고 있어야 상대가 동의하든 반대하든 그 과정에서 배우고 돌아올 수 있다는 거예요. 이 피드백이 정확히 이 플러그인을 만든 이유와 맞닿아 있습니다 — 문제를 정의하는 게 코드를 짜는 것보다 중요해졌고, 지금 제 Claude와 Codex의 대부분의 토큰은 코딩이 아니라 여기에 쓰이고 있어요.

YC Startup School은 이 문제 정의를 8단계로 체계화합니다. /yc-1 창업을 시작해야 하는가(Harj Taggar의 resilience 프레임워크), /yc-2 아이디어가 tarpit은 아닌가(Jared Friedman의 4가지 검증 기준과 schlep blindness), /yc-3 팀 구조와 지분(Michael Seibel의 equity split 원칙). 여기에 /yc-ai(AI Startup School — Andrej Karpathy의 Software 3.0, Sam Altman, Satya Nadella, Fei-Fei Li, Jared Kaplan 등 15개 강의)와 /pg(Paul Graham Guru — 14편 에세이를 컨텍스트에 올리고 PG 특유의 직설적인 톤으로 비즈니스를 진단, 예: "100% of startups that make something popular manage to make money from it. 복잡한 비즈니스 모델은 제품이 약하다는 신호다")를 더 얹었어요. 엔지니어링은 정복되고 있습니다. 다음은 테이스트와 비즈니스예요. AI 시대에 회사를 만든다면 이 판단에서도 AI로 최대한 진행을 뽑아내야 합니다 — 코드를 바이브코딩하듯 비즈니스 가설도 빠르게 세우고, 검증하고, 부수고, 다시 세울 수 있어야 해요.
