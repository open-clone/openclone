---
topic: "Claude Managed Agents vs OpenClaw — 모델 위 하네스 레이어를 누가 소유하느냐"
source_type: social
source_url: "https://www.linkedin.com/posts/gb-jeong_ironclaw-meetup-with-illia-luma-activity-7448614013799915520-6viH"
authorship: self
published_at: 2026-04-11
---

Claude Managed Agents를 며칠 써보고 결정했습니다. 저는 오픈소스 Claw를 계속 쓰겠습니다. 마침 다음 주 서울에서 Attention Is All You Need 공저자 Illia Polosukhin과 작은 밋업까지 열게 돼서, 왜 이 결정이 맞는지 같이 이야기해보려고 해요. 코드의 가치는 0에 수렴하고 있지만 빌더와 컨슈머의 구분은 더 선명해질 겁니다 — 차이는 모델 위의 하네스 레이어를 오픈소스로 직접 다루느냐입니다. 오해하실까봐, 오픈소스만 살아남는다는 말이 아닙니다 — 오픈소스를 자유자재로 다루는 사람이 살아남는다는 말이에요. 둘은 완전히 다릅니다.

Managed Agents는 매력적입니다. 샌드박싱, 인증, 자격증명, 툴 실행, 세션 상태. 에이전트를 프로덕션에 올리려면 이걸 다 직접 짜야 했어요. Anthropic이 그걸 다 가져갔고, Agent/Environment/Session/Events라는 4계층 추상화로 정리해서 정의만 하면 배포되는 구조를 만들었습니다. Notion, Rakuten, Asana가 이미 올라타 있어요. 추상화 진짜 잘했습니다. 며칠 쓰면서 든 생각이 하나 있었어요 — 내가 통제하는 게 도대체 뭐지? 데이터는 Anthropic 서버에 들어가고, 실행 환경은 Anthropic 컨테이너고, 가드레일은 Anthropic 정책입니다. MCP는 열려있다고 하지만 실행 인프라는 닫혀 있어요. 개방으로 끌어당기고 폐쇄로 수익화하는 익숙한 구조입니다.

반면에 Claw는 오픈소스입니다. OpenClaw GitHub 스타가 35만개를 넘겼어요. 모델 위의 하네스를 통째로 내가 소유하는 구조입니다. 모든 게 로컬에서 돌고, 어떤 채널이든 붙일 수 있고, 뜯고 고치고 다시 조립할 수 있어요. 단점은 많이 무겁다는 점이고, 그래서 Rust 기반 IronClaw도 쓰고 있습니다 — 8bong이라는 봇을 돌리는 데 쓰고 있는데 가장 작은 8GB 메모리에서도 가볍게 돕니다. 핵심은 "어떤 도구를 쓰느냐"가 아니라 내 모델 위에서 도는 실행 레이어를 내가 소유하느냐예요. 그 레이어를 매니지드 클라우드에 통째로 맡긴 사람은 컨슈머이고, 오픈소스로 가져와서 뜯고 고치고 다시 조립하는 사람이 빌더입니다. 매니지드의 편리함은 매력적이지만 그 위에 머무는 한 컨슈머에서 벗어나기 어려워요.
